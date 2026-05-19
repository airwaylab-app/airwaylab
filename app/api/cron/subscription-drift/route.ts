import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendAlert, COLORS } from '@/lib/discord-webhook';
import { syncRole, isDiscordConfigured } from '@/lib/discord';

export const dynamic = 'force-dynamic';

interface DriftMismatch {
  user_id: string;
  profile_tier: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  drift_type: 'downgrade_missed' | 'upgrade_missed' | 'stripe_recovered' | 'webhook_never_ran';
  fixed: boolean;
}

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
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

  console.error(`[subscription-drift] Unknown price ID: ${priceId}, defaulting to supporter`);
  Sentry.captureMessage(`Unknown Stripe price ID in drift cron: ${priceId}`, 'warning');
  return 'supporter';
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
 * Four drift types:
 *   - downgrade_missed:  profile says supporter/champion, but no active subscription
 *   - upgrade_missed:    active subscription exists, but profile says community
 *   - stripe_recovered:  community profile has stripe_customer_id, no subscription row,
 *                        but Stripe API confirms active subscription — auto-fixed
 *   - webhook_never_ran: community profile has stripe_customer_id, no subscription row,
 *                        Stripe not configured — logged for manual review
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
    // NOTE: this query requires an existing subscription row. Community profiles whose
    // checkout.session.completed webhook was never processed (e.g. AIR-1142 signature
    // failure) have no row at all and are invisible here. Step 5 handles that blind spot.
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
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: null,
          subscription_tier: null,
          drift_type: 'downgrade_missed',
          fixed: false,
        };

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
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: 'active',
          subscription_tier: correctTier,
          drift_type: 'downgrade_missed',
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

    // 5. Community profiles with stripe_customer_id but no subscription row.
    //
    // These users paid but checkout.session.completed webhook was never processed
    // (e.g. AIR-1142 signature failure). The upgrade_missed check above is blind to
    // them because it filters .not('subscriptions', 'is', null).
    //
    // For each such profile, query the Stripe API. If Stripe has an active subscription
    // for that customer, insert the missing subscription row and upgrade the profile tier.
    // Emit a Sentry warning on every mismatch found and corrected.
    const { data: webhookBlindProfiles, error: webhookBlindError } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, subscriptions(id)')
      .eq('tier', 'community')
      .not('stripe_customer_id', 'is', null)
      .is('subscriptions', null);

    if (webhookBlindError) {
      console.error('[subscription-drift] Failed to query webhook-blind profiles:', webhookBlindError);
      Sentry.captureException(webhookBlindError, { tags: { route: 'cron-subscription-drift' } });
    } else if (webhookBlindProfiles && webhookBlindProfiles.length > 0) {
      const stripe = getStripe();

      for (const profile of webhookBlindProfiles) {
        const stripeCustomerId = (profile as Record<string, unknown>).stripe_customer_id as string;

        if (!stripe) {
          const mismatch: DriftMismatch = {
            user_id: profile.id,
            profile_tier: 'community',
            subscription_status: null,
            subscription_tier: null,
            drift_type: 'webhook_never_ran',
            fixed: false,
          };
          Sentry.captureMessage('Subscription webhook never ran — Stripe not configured, manual review required', {
            level: 'warning',
            tags: { route: 'cron-subscription-drift', drift_type: 'webhook_never_ran' },
            extra: { user_id: profile.id, stripe_customer_id: stripeCustomerId },
          });
          mismatches.push(mismatch);
          continue;
        }

        try {
          const stripeSubs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'active',
            limit: 10,
          });

          if (stripeSubs.data.length === 0) {
            continue;
          }

          const activeSub = stripeSubs.data[0]!;
          const firstItem = activeSub.items.data[0];
          const priceId = firstItem?.price.id ?? '';
          const tier = getTierFromPrice(priceId);
          const periodStart = firstItem?.current_period_start ?? null;
          const periodEnd = firstItem?.current_period_end ?? null;

          const mismatch: DriftMismatch = {
            user_id: profile.id,
            profile_tier: 'community',
            subscription_status: activeSub.status,
            subscription_tier: tier,
            drift_type: 'stripe_recovered',
            fixed: false,
          };

          const [subResult, profileResult] = await Promise.all([
            supabase.from('subscriptions').upsert(
              {
                user_id: profile.id,
                stripe_subscription_id: activeSub.id,
                stripe_price_id: priceId,
                status: activeSub.status,
                tier,
                current_period_start: periodStart
                  ? new Date(periodStart * 1000).toISOString()
                  : null,
                current_period_end: periodEnd
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
                cancel_at_period_end: activeSub.cancel_at_period_end,
              },
              { onConflict: 'stripe_subscription_id' }
            ),
            supabase.from('profiles').update({ tier }).eq('id', profile.id),
          ]);

          if (subResult.error) {
            console.error(`[subscription-drift] Stripe recovery upsert failed for ${profile.id}:`, subResult.error);
            Sentry.captureException(subResult.error, {
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
            Sentry.captureMessage('Stripe-active subscription recovered — webhook was never processed', {
              level: 'warning',
              tags: { route: 'cron-subscription-drift', drift_type: 'stripe_recovered' },
              extra: {
                user_id: profile.id,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: activeSub.id,
                tier,
              },
            });
          }

          mismatches.push(mismatch);
        } catch (stripeErr) {
          console.error(`[subscription-drift] Stripe API error for ${profile.id}:`, stripeErr);
          Sentry.captureException(stripeErr, {
            tags: { route: 'cron-subscription-drift', action: 'stripe-recovery-api' },
            extra: { user_id: profile.id, stripe_customer_id: stripeCustomerId },
          });
        }
      }
    }

    const webhookNeverRanCount = mismatches.filter((m) => m.drift_type === 'webhook_never_ran').length;
    const checked =
      (paidProfiles?.length ?? 0) +
      (communityWithSubs?.length ?? 0) +
      (webhookBlindProfiles?.length ?? 0);

    // 6. Send Discord ops alert + aggregate Sentry error if any drift was found
    if (mismatches.length > 0) {
      const downgradeMissed = mismatches.filter((m) => m.drift_type === 'downgrade_missed').length;
      const upgradeMissed = mismatches.filter((m) => m.drift_type === 'upgrade_missed').length;

      await sendAlert('ops', '', [
        {
          title: ':warning: Subscription Tier Drift Detected',
          description: `Found ${mismatches.length} profile(s) where tier does not match subscription status. ${fixed} auto-fixed.`,
          color: COLORS.amber,
          fields: [
            { name: 'Checked', value: String(checked), inline: true },
            { name: 'Mismatches', value: String(mismatches.length), inline: true },
            { name: 'Fixed', value: String(fixed), inline: true },
            { name: 'Downgrade missed', value: String(downgradeMissed), inline: true },
            { name: 'Upgrade missed', value: String(upgradeMissed), inline: true },
            { name: 'Webhook never ran (manual review)', value: String(webhookNeverRanCount), inline: true },
            { name: 'Stripe auto-recovered', value: String(stripeRecovered), inline: true },
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
      `[subscription-drift] completed: checked=${checked}, mismatches=${mismatches.length}, fixed=${fixed}, webhook_never_ran=${webhookNeverRanCount}, stripe_recovered=${stripeRecovered}`
    );

    return NextResponse.json({
      ok: true,
      checked,
      mismatches: mismatches.length,
      fixed,
      webhook_never_ran: webhookNeverRanCount,
      stripe_recovered: stripeRecovered,
    });
  } catch (err) {
    console.error('[subscription-drift] Cron failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-subscription-drift' } });
    return NextResponse.json({ error: 'Drift check failed' }, { status: 500 });
  }
}
