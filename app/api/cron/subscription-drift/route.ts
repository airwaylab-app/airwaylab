import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendAlert, COLORS } from '@/lib/discord-webhook';
import { syncRole, isDiscordConfigured } from '@/lib/discord';
import { runStripeJob, STALE_PROCESSING_MS, MAX_ATTEMPTS } from '@/app/api/webhooks/stripe/route';

/** Cap re-drives per run so one bad event can't exhaust the cron's runtime. */
const REDRIVE_BATCH_LIMIT = 25;

interface RedriveResult {
  picked: number;
  recovered: number;
  stillFailed: number;
  /** Rows that were stuck `pending` past the stale window (G3 health signal). */
  strandedPending: number;
}

/**
 * ST1 re-drive: the webhook returns 200 to Stripe BEFORE processing, so Stripe
 * never retries a failed event on its own. This step is what actually retries.
 *
 * It scans stripe_events for rows the webhook could not complete:
 *   - status = 'failed'      (processing threw; row was kept, not deleted)
 *   - status = 'pending'     AND updated_at older than STALE_PROCESSING_MS
 *                            (G1: stranded — the webhook's inline claim never ran,
 *                            e.g. the claim itself errored before flipping status.
 *                            A fresh `pending` row is mid-flight and left alone.)
 *   - status = 'processing'  AND updated_at older than STALE_PROCESSING_MS
 *                            (the worker died mid-flight)
 * and EXCLUDES rows with attempts >= MAX_ATTEMPTS (HIGH 3): a poison event that
 * always throws is parked in the terminal `dead` state by runStripeJob and must
 * never re-drive again. `dead` rows are also excluded because they match neither
 * `failed` nor `processing`.
 *
 * For each, it refetches the full event from Stripe (we only persist the id +
 * type, not the payload) and re-runs runStripeJob, whose ATOMIC claim flips the
 * row pending|failed|stale-processing -> processing and tells us if THIS run won
 * it. processStripeEvent is idempotent (upserts on stripe_subscription_id, tier
 * writes are last-write-wins) and its non-idempotent side effects only fire when
 * the claim is won, so reprocessing a partially-applied event is safe. A
 * successful re-drive flips the row to 'done'.
 */
async function redriveStripeEvents(
  stripe: Stripe | null,
  supabase: SupabaseClient
): Promise<RedriveResult> {
  const result: RedriveResult = { picked: 0, recovered: 0, stillFailed: 0, strandedPending: 0 };
  if (!stripe) return result;

  const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  // failed rows: always eligible. stale pending + stale processing rows: only
  // past the cutoff (G1 — a `pending` row older than the stale window means the
  // webhook's inline claim never completed; a fresh `pending` row is mid-flight
  // and left alone). attempts >= MAX_ATTEMPTS are excluded so a poison event
  // cannot re-drive forever (it has been parked `dead` with its own ops alert).
  const { data: rows, error: queryErr } = await supabase
    .from('stripe_events')
    .select('event_id, event_type, status, attempts, updated_at')
    .lt('attempts', MAX_ATTEMPTS)
    .or(`status.eq.failed,and(status.eq.pending,updated_at.lt.${staleCutoff}),and(status.eq.processing,updated_at.lt.${staleCutoff})`)
    .order('updated_at', { ascending: true })
    .limit(REDRIVE_BATCH_LIMIT);

  if (queryErr) {
    console.error('[subscription-drift] re-drive query failed:', queryErr);
    Sentry.captureException(queryErr, {
      tags: { route: 'cron-subscription-drift', action: 'redrive-query' },
    });
    return result;
  }

  for (const row of rows ?? []) {
    result.picked++;
    if ((row as { status?: string }).status === 'pending') result.strandedPending++;
    const attemptsBefore = (row as { attempts?: number }).attempts ?? 0;
    try {
      // Refetch the event payload from Stripe — we only stored id + type.
      const event = await stripe.events.retrieve((row as { event_id: string }).event_id);
      // runStripeJob re-applies the state machine and marks done|failed itself.
      await runStripeJob(stripe, supabase, event, attemptsBefore);

      // Confirm the terminal state to bucket the run for the ops alert.
      const { data: after } = await supabase
        .from('stripe_events')
        .select('status')
        .eq('event_id', (row as { event_id: string }).event_id)
        .maybeSingle();
      if ((after as { status?: string } | null)?.status === 'done') result.recovered++;
      else result.stillFailed++;
    } catch (err) {
      // retrieve() itself failed (e.g. event aged out of Stripe, network).
      // runStripeJob never ran, so the row keeps its prior status AND its
      // attempts were not incremented by the claim — do it here. Park as `dead`
      // at the cap so a permanently-unretrievable event stops re-driving.
      result.stillFailed++;
      const attemptsNow = attemptsBefore + 1;
      const terminal = attemptsNow >= MAX_ATTEMPTS;
      console.error(
        `[subscription-drift] re-drive failed for ${(row as { event_id: string }).event_id}:`,
        err
      );
      Sentry.captureException(err, {
        tags: { route: 'cron-subscription-drift', action: 'redrive-event' },
        extra: { event_id: (row as { event_id: string }).event_id },
      });
      // Guard: never clobber a row another worker already completed. retrieve()
      // failed before runStripeJob's atomic claim, so this caller does not own the
      // row — if a concurrent run (or the webhook) drove it to `done` meanwhile,
      // leave it. `.neq('status','done')` is a plain filter, safe on a mutation
      // (an `or` filter is NOT — see migration 063 / claim_stripe_event).
      await supabase
        .from('stripe_events')
        .update({
          status: terminal ? 'dead' : 'failed',
          last_error: err instanceof Error ? err.message : String(err),
          attempts: attemptsNow,
        })
        .eq('event_id', (row as { event_id: string }).event_id)
        .neq('status', 'done');
      if (terminal) {
        Sentry.captureMessage('Stripe event hit max attempts — parked as dead', {
          level: 'error',
          fingerprint: ['stripe-event-dead', (row as { event_id: string }).event_id],
          tags: { route: 'cron-subscription-drift', action: 'dead-letter' },
          extra: { event_id: (row as { event_id: string }).event_id, attempts: attemptsNow },
        });
        await sendAlert('ops', '', [{
          title: ':skull: Stripe event parked (dead-letter)',
          description: `Event \`${(row as { event_id: string }).event_id}\` (${(row as { event_type?: string }).event_type ?? 'unknown'}) could not be retrieved/processed after ${attemptsNow} attempts and will no longer be re-driven. Manual review required.`,
          color: COLORS.red,
          fields: [
            { name: 'Event ID', value: (row as { event_id: string }).event_id, inline: true },
            { name: 'Attempts', value: String(attemptsNow), inline: true },
            { name: 'Last error', value: (err instanceof Error ? err.message : String(err)).slice(0, 1000) },
          ],
          timestamp: new Date().toISOString(),
        }]);
      }
    }
  }

  return result;
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null;
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

function getTierFromPrice(priceId: string): 'supporter' | 'champion' {
  const supporterMonthly = process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID;
  const supporterYearly = process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID;
  const championMonthly = process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID;
  const championYearly = process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID;

  if (priceId === supporterMonthly || priceId === supporterYearly) return 'supporter';
  if (priceId === championMonthly || priceId === championYearly) return 'champion';

  Sentry.captureMessage(`Unknown Stripe price ID in drift recovery: ${priceId}`, 'warning');
  return 'supporter';
}

export const dynamic = 'force-dynamic';

interface DriftMismatch {
  user_id: string;
  profile_tier: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  drift_type: 'downgrade_missed' | 'upgrade_missed' | 'webhook_never_ran';
  fixed: boolean;
}

/**
 * Derive the correct tier from active subscriptions.
 * If a user has multiple active subs (edge case), take the highest tier.
 */
function deriveTierFromSubscriptions(
  activeSubs: Array<{ tier: string; status: string }>
): 'community' | 'supporter' | 'champion' {
  if (activeSubs.length === 0) return 'community';

  const hasChampion = activeSubs.some((s) => s.tier === 'champion');
  if (hasChampion) return 'champion';
  return 'supporter';
}

/**
 * GET /api/cron/subscription-drift
 *
 * Runs daily via Vercel Cron (05:00 UTC). Detects tier drift between
 * profiles.tier and subscriptions.status that can occur when Stripe
 * webhooks partially fail.
 *
 * Three drift types:
 *   - downgrade_missed:   profile says supporter/champion, but no active subscription
 *   - upgrade_missed:     active subscription exists, but profile says community
 *   - webhook_never_ran:  community profile has stripe_customer_id but no subscription
 *                         row at all — webhook was never processed (not auto-fixed)
 *
 * Auto-fixes mismatches and logs each one to Sentry. Sends a Discord
 * ops alert summarising the run if any mismatches were found.
 *
 * Protected by CRON_SECRET.
 *
 * Schedule: 0 5 * * * (daily at 05:00 UTC)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // 1. Get all profiles with a paid tier
    const { data: paidProfiles, error: paidError } = await supabase
      .from('profiles')
      .select('id, tier, email, discord_id')
      .in('tier', ['supporter', 'champion']);

    if (paidError) {
      console.error('[subscription-drift] Failed to query paid profiles:', paidError);
      Sentry.captureException(paidError, { tags: { route: 'cron-subscription-drift' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    // 2. Get all profiles with community tier that have any subscription row.
    //
    // NOTE: upgrade_missed detection below requires a subscription row to exist.
    // If a user's checkout.session.completed webhook was never processed (e.g. the
    // AIR-1142 signature failure), no row is created and this query is blind to them.
    // The webhook_never_ran check (step 5) handles that blind spot separately.
    const { data: communityWithSubs, error: communityError } = await supabase
      .from('profiles')
      .select('id, tier, email, subscriptions(id, status, tier)')
      .eq('tier', 'community')
      .not('subscriptions', 'is', null);

    if (communityError) {
      console.error('[subscription-drift] Failed to query community profiles:', communityError);
      Sentry.captureException(communityError, { tags: { route: 'cron-subscription-drift' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const mismatches: DriftMismatch[] = [];
    let fixed = 0;
    let stripeRecovered = 0;

    // 3. Check paid profiles for missing active subscriptions (downgrade_missed)
    for (const profile of paidProfiles ?? []) {
      const { data: activeSubs, error: subError } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', profile.id)
        .in('status', ['active', 'trialing']);

      if (subError) {
        console.error(`[subscription-drift] Sub query failed for ${profile.id}:`, subError);
        continue;
      }

      const correctTier = deriveTierFromSubscriptions(activeSubs ?? []);

      if (correctTier === 'community') {
        // Profile says paid, but no active subscription -- downgrade missed
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: null,
          subscription_tier: null,
          drift_type: 'downgrade_missed',
          fixed: false,
        };

        // Auto-fix: downgrade to community
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: 'community' })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'downgrade_missed' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;

          // Revoke Discord role if user has one linked
          if (profile.discord_id && isDiscordConfigured()) {
            const syncResult = await syncRole(profile.discord_id, 'community');
            await supabase.from('discord_role_events').insert({
              user_id: profile.id,
              discord_id: profile.discord_id,
              role_id: 'community',
              action: syncResult.ok ? 'revoke' : 'revoke_failed',
              reason: 'drift_cron_cleanup',
            });
            if (!syncResult.ok) {
              Sentry.captureMessage('Discord role revocation failed in drift cron', {
                level: 'warning',
                tags: { route: 'cron-subscription-drift', action: 'discord-remove-role-failed' },
                extra: { user_id: profile.id, discord_id: profile.discord_id },
              });
            }
          }
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: mismatch.fixed ? 'info' : 'warning',
          tags: {
            route: 'cron-subscription-drift',
            drift_type: 'downgrade_missed',
            fixed: String(mismatch.fixed),
          },
          extra: {
            user_id: profile.id,
            profile_tier: profile.tier,
            active_subscriptions: 0,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      } else if (correctTier !== profile.tier) {
        // Profile has wrong paid tier (e.g. says champion but sub is supporter)
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: 'active',
          subscription_tier: correctTier,
          drift_type: 'downgrade_missed', // tier mismatch within paid tiers
          fixed: false,
        };

        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: correctTier })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Tier fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'tier_mismatch' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: mismatch.fixed ? 'info' : 'warning',
          tags: {
            route: 'cron-subscription-drift',
            drift_type: 'tier_mismatch',
            fixed: String(mismatch.fixed),
          },
          extra: {
            user_id: profile.id,
            profile_tier: profile.tier,
            correct_tier: correctTier,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      }
    }

    // 4. Check community profiles with active subscriptions (upgrade_missed)
    for (const profile of communityWithSubs ?? []) {
      const subs = (profile as Record<string, unknown>).subscriptions as
        | Array<{ id: string; status: string; tier: string }>
        | null;

      if (!subs || subs.length === 0) continue;

      const activeSubs = subs.filter((s) =>
        s.status === 'active' || s.status === 'trialing'
      );

      if (activeSubs.length === 0) continue;

      const correctTier = deriveTierFromSubscriptions(activeSubs);

      if (correctTier !== 'community') {
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: 'community',
          subscription_status: activeSubs[0]!.status,
          subscription_tier: correctTier,
          drift_type: 'upgrade_missed',
          fixed: false,
        };

        // Auto-fix: upgrade to correct tier
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: correctTier })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Upgrade fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'upgrade_missed' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: mismatch.fixed ? 'info' : 'warning',
          tags: {
            route: 'cron-subscription-drift',
            drift_type: 'upgrade_missed',
            fixed: String(mismatch.fixed),
          },
          extra: {
            user_id: profile.id,
            profile_tier: 'community',
            subscription_tier: correctTier,
            subscription_status: activeSubs[0]!.status,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      }
    }

    // 5. Detect community profiles with stripe_customer_id but no subscription row.
    //
    // This is the "webhook_never_ran" blind spot: a user completed Stripe checkout
    // and received a stripe_customer_id on their profile, but the
    // checkout.session.completed webhook was never processed (e.g. AIR-1142 signature
    // failure). Without a subscription row, the upgrade_missed check above cannot
    // surface them — it filters .not('subscriptions', 'is', null), so users with NO
    // row at all are invisible. We surface them here for manual review via Sentry.
    // Do NOT auto-fix: verifying the actual Stripe subscription status requires a
    // Stripe API call that is out of scope for this detection-only cron.
    const { data: webhookBlindProfiles, error: webhookBlindError } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, subscriptions(id)')
      .eq('tier', 'community')
      .not('stripe_customer_id', 'is', null)
      .is('subscriptions', null);

    if (webhookBlindError) {
      console.error('[subscription-drift] Failed to query webhook-blind profiles:', webhookBlindError);
      Sentry.captureException(webhookBlindError, { tags: { route: 'cron-subscription-drift' } });
    } else {
      const stripe = getStripe();

      for (const profile of webhookBlindProfiles ?? []) {
        const stripeCustomerId = (profile as Record<string, unknown>).stripe_customer_id as string;
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: 'community',
          subscription_status: null,
          subscription_tier: null,
          drift_type: 'webhook_never_ran',
          fixed: false,
        };

        Sentry.captureMessage('Subscription webhook never ran — manual review required', {
          level: 'warning',
          tags: { route: 'cron-subscription-drift', drift_type: 'webhook_never_ran' },
          extra: {
            user_id: profile.id,
            stripe_customer_id: stripeCustomerId,
          },
        });

        if (stripe) {
          try {
            const stripeSubs = await stripe.subscriptions.list({
              customer: stripeCustomerId,
              status: 'active',
            });

            if (stripeSubs.data.length > 0) {
              const activeSub = stripeSubs.data[0]!;
              const firstItem = activeSub.items.data[0];
              const priceId = firstItem?.price.id;
              const tier = priceId ? getTierFromPrice(priceId) : 'supporter';
              const periodEnd = firstItem?.current_period_end;

              const [upsertResult, profileResult] = await Promise.all([
                supabase.from('subscriptions').upsert(
                  {
                    user_id: profile.id,
                    stripe_subscription_id: activeSub.id,
                    stripe_price_id: priceId || '',
                    status: activeSub.status,
                    tier,
                    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
                    cancel_at_period_end: activeSub.cancel_at_period_end,
                  },
                  { onConflict: 'stripe_subscription_id' }
                ),
                supabase.from('profiles').update({ tier }).eq('id', profile.id),
              ]);

              if (upsertResult.error) {
                console.error(`[subscription-drift] Stripe recovery upsert failed for ${profile.id}:`, upsertResult.error);
                Sentry.captureException(upsertResult.error, {
                  tags: { route: 'cron-subscription-drift', action: 'stripe-recovery-upsert' },
                  extra: { user_id: profile.id, stripe_customer_id: stripeCustomerId },
                });
              } else if (profileResult.error) {
                console.error(`[subscription-drift] Stripe recovery profile update failed for ${profile.id}:`, profileResult.error);
                Sentry.captureException(profileResult.error, {
                  tags: { route: 'cron-subscription-drift', action: 'stripe-recovery-profile' },
                  extra: { user_id: profile.id, stripe_customer_id: stripeCustomerId },
                });
              } else {
                mismatch.fixed = true;
                stripeRecovered++;
                fixed++;
                Sentry.captureMessage('Stripe subscription recovered via API in drift cron', {
                  level: 'info',
                  tags: { route: 'cron-subscription-drift', drift_type: 'stripe_recovered' },
                  extra: {
                    user_id: profile.id,
                    stripe_customer_id: stripeCustomerId,
                    tier,
                    subscription_id: activeSub.id,
                  },
                });
              }
            }
            // No active subscription found — legitimately community tier, skip
          } catch (stripeErr) {
            console.error(`[subscription-drift] Stripe API error for ${profile.id}:`, stripeErr);
            Sentry.captureException(stripeErr, {
              tags: { route: 'cron-subscription-drift', action: 'stripe-recovery-api' },
              extra: { user_id: profile.id, stripe_customer_id: stripeCustomerId },
            });
          }
        }

        mismatches.push(mismatch);
      }
    }

    const webhookNeverRanCount = mismatches.filter((m) => m.drift_type === 'webhook_never_ran').length;
    const checked =
      (paidProfiles?.length ?? 0) +
      (communityWithSubs?.length ?? 0) +
      (webhookBlindProfiles?.length ?? 0);

    // 5b. Re-drive Stripe webhook jobs the route could not complete (ST1).
    // This is the real retry path: Stripe got 200 before processing, so failed
    // events are only recovered here.
    const redrive = await redriveStripeEvents(getStripe(), supabase);

    // 5c. G3: rows stranded `pending` past the stale window mean the webhook's
    // inline atomic claim is not completing (it should within seconds of insert).
    // The re-drive sweeps them, but the fact they stranded is a regression signal
    // — alert with its own fingerprint, independent of tier-drift.
    if (redrive.strandedPending > 0) {
      Sentry.captureMessage(`stripe stranded pending: ${redrive.strandedPending}`, {
        level: 'error',
        fingerprint: ['stripe-stranded-pending'],
        tags: { route: 'cron-subscription-drift', action: 'stranded-pending' },
        extra: { strandedPending: redrive.strandedPending, recovered: redrive.recovered },
      });
      await sendAlert('ops', '', [
        {
          title: ':rotating_light: Stripe events stranded in pending',
          description: `${redrive.strandedPending} stripe_events row(s) were stuck \`pending\` past the stale window — the webhook's inline claim is not completing. The re-drive swept them (${redrive.recovered} recovered this run). Investigate the webhook claim path.`,
          color: COLORS.red,
          fields: [
            { name: 'Stranded pending', value: String(redrive.strandedPending), inline: true },
            { name: 'Recovered this run', value: String(redrive.recovered), inline: true },
          ],
          footer: { text: 'subscription-drift cron' },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    // 6. Send Discord ops alert if any drift OR webhook re-drive activity occurred
    if (mismatches.length > 0 || redrive.picked > 0) {
      const downgradeMissed = mismatches.filter((m) => m.drift_type === 'downgrade_missed').length;
      const upgradeMissed = mismatches.filter((m) => m.drift_type === 'upgrade_missed').length;

      await sendAlert('ops', '', [
        {
          title: ':warning: Subscription Tier Drift Detected',
          description: `Found ${mismatches.length} profile(s) where tier does not match subscription status. ${fixed} auto-fixed. Re-drove ${redrive.picked} webhook job(s), ${redrive.recovered} recovered.`,
          color: COLORS.amber,
          fields: [
            { name: 'Checked', value: String(checked), inline: true },
            { name: 'Mismatches', value: String(mismatches.length), inline: true },
            { name: 'Fixed', value: String(fixed), inline: true },
            { name: 'Downgrade missed', value: String(downgradeMissed), inline: true },
            { name: 'Upgrade missed', value: String(upgradeMissed), inline: true },
            { name: 'Webhook never ran (manual review)', value: String(webhookNeverRanCount), inline: true },
            { name: 'Stripe auto-recovered', value: String(stripeRecovered), inline: true },
            { name: 'Webhook jobs re-driven', value: String(redrive.picked), inline: true },
            { name: 'Webhook jobs recovered', value: String(redrive.recovered), inline: true },
            { name: 'Webhook jobs still failed', value: String(redrive.stillFailed), inline: true },
          ],
          footer: { text: 'subscription-drift cron' },
          timestamp: new Date().toISOString(),
        },
      ]);

      Sentry.captureMessage(`subscription-drift-cron: ${mismatches.length} mismatch(es) found`, {
        level: 'error',
        fingerprint: ['subscription-drift-cron-mismatch'],
        extra: { checked, mismatches: mismatches.length, fixed, runTimestamp: new Date().toISOString() },
      });
    }

    console.error(
      `[subscription-drift] completed: checked=${checked}, mismatches=${mismatches.length}, fixed=${fixed}, webhook_never_ran=${webhookNeverRanCount}, stripe_recovered=${stripeRecovered}, redrive_picked=${redrive.picked}, redrive_recovered=${redrive.recovered}, redrive_still_failed=${redrive.stillFailed}, redrive_stranded_pending=${redrive.strandedPending}`
    );

    return NextResponse.json({
      ok: true,
      checked,
      mismatches: mismatches.length,
      fixed,
      webhook_never_ran: webhookNeverRanCount,
      stripe_recovered: stripeRecovered,
      redrive_picked: redrive.picked,
      redrive_recovered: redrive.recovered,
      redrive_still_failed: redrive.stillFailed,
      redrive_stranded_pending: redrive.strandedPending,
    });
  } catch (err) {
    console.error('[subscription-drift] Cron failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-subscription-drift' } });
    return NextResponse.json({ error: 'Drift check failed' }, { status: 500 });
  }
}
