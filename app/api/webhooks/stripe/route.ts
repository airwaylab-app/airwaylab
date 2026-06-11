import { NextRequest, NextResponse, after } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelSequence, scheduleSequence, scheduleWinBackForUser } from '@/lib/email/sequences';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail, cancellationEmail } from '@/lib/email/transactional';
import { isDiscordConfigured, syncRole, searchGuildMember } from '@/lib/discord';
import { sendAlert, formatRevenueEmbed, alertStripePaymentFailed } from '@/lib/discord-webhook';

export const maxDuration = 30;

/**
 * A `processing` row older than this is abandoned: the worker that claimed it
 * crashed/timed out before reaching done|failed. Webhook maxDuration is 30s, so
 * 15 min is a safe "definitely dead" cutoff. Shared cutoff for the atomic claim
 * (so a stale row can be re-claimed) and the cron re-drive SELECT.
 */
export const STALE_PROCESSING_MS = 15 * 60 * 1000;

/**
 * Max processing attempts before a row is parked in the terminal `dead` state.
 * A poison event (one that always throws) must not re-drive forever. After this
 * many attempts the re-drive query excludes it and ops gets a single alert.
 */
export const MAX_ATTEMPTS = 5;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey!, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

/** Compute monthly recurring revenue in cents from a unit amount and interval. */
function computeMrrCents(unitAmount: number, interval: string): number {
  if (interval === 'year') return Math.round(unitAmount / 12);
  return unitAmount; // monthly
}

/**
 * Log a subscription lifecycle event for LTV/churn analytics. Non-blocking.
 *
 * Defence-in-depth against double-counting (BLOCKER 2): even though the atomic
 * claim in runStripeJob already ensures each event is processed once, this write
 * is an UPSERT with ignoreDuplicates against the unique index added in
 * migration 059 (stripe_event_id). A re-driven row that somehow re-reached this
 * path can therefore never insert a second analytics row that would corrupt
 * MRR/churn. The stripe_event_id is the dedup key (one analytics row per Stripe
 * event); it is null for the cron's own non-webhook recovery writes, and NULL
 * keys never conflict in a Postgres unique index, so those rows are unaffected.
 */
async function logSubscriptionEvent(
  supabase: SupabaseClient,
  params: {
    userId: string | undefined;
    eventType: 'created' | 'updated' | 'cancelled' | 'renewed' | 'past_due';
    tier?: string;
    interval?: string;
    stripeSubscriptionId?: string;
    mrrCents?: number;
    stripeEventId?: string;
    source?: string;
    cancelReason?: string;
    cancelFeedback?: string;
  }
) {
  const { error } = await supabase.from('subscription_events').upsert(
    {
      user_id: params.userId ?? null,
      event_type: params.eventType,
      tier: params.tier ?? null,
      interval: params.interval ?? null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      mrr_cents: params.mrrCents ?? null,
      stripe_event_id: params.stripeEventId ?? null,
      source: params.source ?? null,
      cancel_reason: params.cancelReason ?? null,
      cancel_feedback: params.cancelFeedback ?? null,
    },
    { onConflict: 'stripe_event_id', ignoreDuplicates: true }
  );
  if (error) {
    // Non-blocking — log but don't throw
    console.error('[stripe-webhook] subscription_events upsert failed:', error);
    Sentry.captureException(error, { tags: { route: 'stripe-webhook', action: 'subscription-events-insert' } });
  }
}

/** Sync Discord role for a user after tier change. Non-blocking. */
async function syncDiscordForUser(
  supabase: SupabaseClient,
  userId: string,
  tier: string,
  stripeEventId?: string
): Promise<void> {
  if (!isDiscordConfigured()) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('discord_id')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.discord_id) {
      const syncResult = await syncRole(profile.discord_id, tier);

      // Log the role event — action reflects actual outcome
      await supabase.from('discord_role_events').insert({
        user_id: userId,
        discord_id: profile.discord_id,
        role_id: tier,
        action: syncResult.ok
          ? (tier === 'community' ? 'revoke' : 'assign')
          : (tier === 'community' ? 'revoke_failed' : 'assign_failed'),
        reason: `stripe_tier_change_to_${tier}`,
        stripe_event_id: stripeEventId ?? null,
      });
    } else {
      // User hasn't linked Discord yet — try to auto-resolve if they saved a username
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('discord_username')
        .eq('id', userId)
        .maybeSingle();

      if (fullProfile?.discord_username) {
        // They saved a username — try to find them in the guild
        const searchResult = await searchGuildMember(fullProfile.discord_username);
        if (searchResult.status === 'found') {
          // Auto-link and assign role
          await supabase.from('profiles').update({
            discord_id: searchResult.discordId,
            discord_linked_at: new Date().toISOString(),
          }).eq('id', userId);

          const syncResult = await syncRole(searchResult.discordId, tier);

          await supabase.from('discord_role_events').insert({
            user_id: userId,
            discord_id: searchResult.discordId,
            role_id: tier,
            action: syncResult.ok
              ? (tier === 'community' ? 'revoke' : 'assign')
              : (tier === 'community' ? 'revoke_failed' : 'assign_failed'),
            reason: `stripe_auto_resolve_${tier}`,
            stripe_event_id: stripeEventId ?? null,
          });

          // Clean up any pending roles
          await supabase.from('discord_pending_roles').delete().eq('user_id', userId);
          return;
        }
      }

      // Could not auto-resolve — queue the role for when they link
      const { getTierRoleId } = await import('@/lib/discord');
      const roleId = getTierRoleId(tier);
      if (roleId) {
        await supabase.from('discord_pending_roles').upsert(
          { user_id: userId, role_id: roleId },
          { onConflict: 'user_id,role_id' }
        );
      } else {
        // Tier is community -- clear any pending roles
        await supabase
          .from('discord_pending_roles')
          .delete()
          .eq('user_id', userId);
      }
    }
  } catch (err) {
    // Non-blocking -- never fail the webhook over Discord
    console.error('[stripe-webhook] Discord sync failed:', err);
    Sentry.captureException(err, { tags: { route: 'stripe-webhook', action: 'discord-sync' } });
  }
}

function getTierFromPrice(priceId: string): 'supporter' | 'champion' {
  const supporter_monthly = process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID;
  const supporter_yearly = process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID;
  const champion_monthly = process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID;
  const champion_yearly = process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID;

  if (priceId === supporter_monthly || priceId === supporter_yearly) return 'supporter';
  if (priceId === champion_monthly || priceId === champion_yearly) return 'champion';

  console.error(`[stripe-webhook] Unknown price ID: ${priceId}, defaulting to supporter`);
  Sentry.captureMessage(`Unknown Stripe price ID: ${priceId}`, 'warning');
  return 'supporter';
}

/** Look up a user's email from the profiles table. Returns null if not found. */
async function getUserEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return data?.email ?? null;
}

/** Send welcome email after successful checkout. Fire-and-forget. */
async function sendWelcomeNotification(
  supabase: SupabaseClient,
  userId: string,
  tier: 'supporter' | 'champion',
  interval: string
): Promise<void> {
  try {
    const email = await getUserEmail(supabase, userId);
    if (!email) {
      console.error(`[stripe-webhook] No email found for user ${userId}, skipping welcome email`);
      return;
    }
    const { subject, html } = welcomeEmail(tier, interval);
    await sendEmail({ to: email, subject, html, metadata: { emailType: 'welcome', userId } });
  } catch (err) {
    console.error('[stripe-webhook] Welcome email failed:', err);
    Sentry.captureException(err, { tags: { route: 'stripe-webhook', action: 'welcome-email' } });
  }
}

/** Send cancellation confirmation email. Fire-and-forget. */
async function sendCancellationNotification(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const email = await getUserEmail(supabase, userId);
    if (!email) {
      console.error(`[stripe-webhook] No email found for user ${userId}, skipping cancellation email`);
      return;
    }

    // Look up period end from the subscription record
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', userId)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    const periodEnd = sub?.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : null;

    const { subject, html } = cancellationEmail(periodEnd);
    await sendEmail({ to: email, subject, html, metadata: { emailType: 'cancellation', userId } });
  } catch (err) {
    console.error('[stripe-webhook] Cancellation email failed:', err);
    Sentry.captureException(err, { tags: { route: 'stripe-webhook', action: 'cancellation-email' } });
  }
}

/**
 * Process a verified Stripe event. Called inside after() so it runs after the 200
 * response is sent to Stripe — prevents the outbound Stripe API call and DB writes
 * in checkout.session.completed from exceeding the function timeout.
 */
async function processStripeEvent(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const subscriptionId = session.subscription as string;

      if (!userId || !subscriptionId) {
        // H2: Log silent drops instead of silently breaking
        console.error(`[stripe-webhook] checkout.session.completed missing data: userId=${userId}, subscriptionId=${subscriptionId}, event=${event.id}`);
        Sentry.captureMessage('Stripe checkout.session.completed missing userId or subscriptionId', {
          level: 'warning',
          extra: { eventId: event.id, userId, subscriptionId },
        });
        break;
      }

      // Fetch the full subscription to get price/tier info
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const firstItem = subscription.items.data[0];
      const priceId = firstItem?.price.id;
      const tier = priceId ? getTierFromPrice(priceId) : 'supporter';
      const periodEnd = firstItem?.current_period_end;
      const interval = firstItem?.price.recurring?.interval ?? 'unknown';

      // AIR-1873: Guard against phantom supabase_user_id in Stripe metadata.
      // A profile-less userId produces a silent no-op on the UPDATE below.
      const { data: profileExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!profileExists) {
        Sentry.captureMessage('Stripe webhook: supabase_user_id in metadata has no matching profile', {
          level: 'error',
          tags: { route: 'stripe-webhook', event_type: event.type, check: 'phantom-user-id' },
          extra: { userId, eventId: event.id, subscriptionId, stripeCustomerId: session.customer },
        });
        console.error(`[stripe-webhook] Phantom supabase_user_id=${userId} on event=${event.id} — no profile row found`);
        break;
      }

      // Critical DB writes — parallel to minimize latency
      const [upsertResult, profileResult] = await Promise.all([
        supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId || '',
            status: subscription.status,
            tier,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          },
          { onConflict: 'stripe_subscription_id' }
        ),
        supabase
          .from('profiles')
          .update({ tier, stripe_customer_id: session.customer as string })
          .eq('id', userId),
      ]);

      if (upsertResult.error) {
        console.error('[stripe-webhook] Subscription upsert failed:', upsertResult.error);
        Sentry.captureException(upsertResult.error, { tags: { route: 'stripe-webhook', event_type: event.type } });
        throw new Error(`Subscription upsert failed: ${upsertResult.error.message}`);
      }
      if (profileResult.error) {
        console.error('[stripe-webhook] Profile update failed:', profileResult.error);
        Sentry.captureException(profileResult.error, { tags: { route: 'stripe-webhook', event_type: event.type } });
        throw new Error(`Profile update failed: ${profileResult.error.message}`);
      }

      await logSubscriptionEvent(supabase, {
        userId,
        eventType: 'created',
        tier,
        interval,
        stripeSubscriptionId: subscriptionId,
        mrrCents: computeMrrCents(firstItem?.price.unit_amount ?? 0, interval),
        stripeEventId: event.id,
      });

      void Promise.all([
        cancelSequence(supabase, userId, 'post_upload'),
        cancelSequence(supabase, userId, 'feature_education'),
        cancelSequence(supabase, userId, 'dormancy'),
        cancelSequence(supabase, userId, 'activation'),
        scheduleSequence(supabase, userId, 'premium_onboarding'),
      ]).catch((err) => {
        console.error('[stripe-webhook] Email sequence update failed:', err);
        Sentry.captureException(err, { tags: { route: 'stripe-webhook', action: 'email-sequence-update' } });
      });

      await sendWelcomeNotification(supabase, userId, tier, interval);
      await syncDiscordForUser(supabase, userId, tier, event.id);
      await sendAlert('revenue', '', [formatRevenueEmbed({
        event: 'new_subscription',
        tier,
        interval,
        mrrCents: computeMrrCents(firstItem?.price.unit_amount ?? 0, interval),
      })]);

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const updatedItem = subscription.items.data[0];
      const priceId = updatedItem?.price.id;
      const tier = priceId ? getTierFromPrice(priceId) : 'supporter';
      const periodEnd = updatedItem?.current_period_end;
      const updatedInterval = updatedItem?.price.recurring?.interval ?? 'unknown';

      if (!userId) {
        console.error(`[stripe-webhook] subscription.updated missing userId, event=${event.id}`);
        Sentry.captureMessage('Stripe subscription.updated missing userId', {
          level: 'warning',
          extra: { eventId: event.id, subscriptionId: subscription.id },
        });
      }

      const shouldUpdateProfile = !!userId && ['active', 'trialing'].includes(subscription.status);

      // Capture cancel reason when customer schedules cancellation via portal
      const cancelDetails = subscription.cancellation_details;
      const cancelFields = subscription.cancel_at_period_end && cancelDetails ? {
        cancel_reason: cancelDetails.reason ?? null,
        cancel_feedback: cancelDetails.feedback ?? null,
        cancel_comment: cancelDetails.comment ?? null,
      } : {};

      // Read prior tier/price/status BEFORE the update so we can tell a genuine
      // tier change (upgrade/downgrade) apart from the many other reasons Stripe
      // emits subscription.updated (renewal period-roll, status flips, and our
      // own dunning-metadata write echoing back). Without this, every update is
      // mislabelled as a "Tier Change" in #revenue.
      const { data: priorSub } = await supabase
        .from('subscriptions')
        .select('tier, stripe_price_id, status')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      const subUpdatePromise = supabase
        .from('subscriptions')
        .update({
          stripe_price_id: priceId || '',
          status: subscription.status,
          tier,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          ...cancelFields,
        })
        .eq('stripe_subscription_id', subscription.id);

      const profileUpdatePromise = shouldUpdateProfile
        ? supabase.from('profiles').update({ tier }).eq('id', userId!)
        : Promise.resolve({ error: null });

      const [subResult, profileResult] = await Promise.all([subUpdatePromise, profileUpdatePromise]);

      if (subResult.error) {
        console.error('[stripe-webhook] Subscription update failed:', subResult.error);
        Sentry.captureException(subResult.error, { tags: { route: 'stripe-webhook', event_type: event.type } });
        throw new Error(`Subscription update failed: ${subResult.error.message}`);
      }
      if (profileResult.error) {
        console.error('[stripe-webhook] Profile tier update failed:', profileResult.error);
        Sentry.captureException(profileResult.error, { tags: { route: 'stripe-webhook', event_type: event.type } });
        throw new Error(`Profile tier update failed: ${profileResult.error.message}`);
      }

      await logSubscriptionEvent(supabase, {
        userId,
        eventType: 'updated',
        tier,
        interval: updatedInterval,
        stripeSubscriptionId: subscription.id,
        mrrCents: computeMrrCents(updatedItem?.price.unit_amount ?? 0, updatedInterval),
        stripeEventId: event.id,
      });

      if (shouldUpdateProfile) {
        await syncDiscordForUser(supabase, userId!, tier, event.id);
      }

      // Alert only on a REAL tier/price change, or a recovery from dunning. A
      // renewal, a →past_due flip (already covered by the payment_failed alert),
      // and the dunning-metadata echo all stay silent. Email is masked inside
      // formatRevenueEmbed; the recovery alert dedupes itself because the next
      // update reads status='active' from the row we just wrote.
      const tierChanged = !!priorSub && (priorSub.tier !== tier || priorSub.stripe_price_id !== priceId);
      const recovered = !!priorSub
        && (priorSub.status === 'past_due' || priorSub.status === 'unpaid')
        && subscription.status === 'active';

      if (tierChanged || recovered) {
        const email = userId ? await getUserEmail(supabase, userId) : null;
        await sendAlert('revenue', '', [formatRevenueEmbed({
          event: tierChanged ? 'tier_change' : 'payment_recovered',
          fromTier: tierChanged ? (priorSub!.tier ?? undefined) : undefined,
          tier,
          interval: updatedInterval,
          mrrCents: computeMrrCents(updatedItem?.price.unit_amount ?? 0, updatedInterval),
          email: email ?? undefined,
        })]);
      }

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const deletedCancelDetails = subscription.cancellation_details;

      // The tier the user actually churned FROM, and the MRR lost. Computed from
      // the Stripe object (not the post-cancel landing tier). Sum ALL recurring
      // items so a multi-item sub is not under-reported; warn if there is >1
      // (checkout only ever creates single-item subs).
      const deletedItem = subscription.items.data[0];
      const churnedPriceId = deletedItem?.price.id;
      const churnedFrom = churnedPriceId ? getTierFromPrice(churnedPriceId) : 'supporter';
      const churnedInterval = deletedItem?.price.recurring?.interval ?? 'unknown';
      if (subscription.items.data.length > 1) {
        Sentry.captureMessage('Cancellation subscription has multiple items — MRR summed across all', {
          level: 'warning',
          tags: { route: 'stripe-webhook', event_type: event.type },
          extra: { subscriptionId: subscription.id, itemCount: subscription.items.data.length },
        });
      }
      const mrrCentsLost = subscription.items.data.reduce(
        (sum, it) => sum + computeMrrCents(it.price.unit_amount ?? 0, it.price.recurring?.interval ?? 'month'),
        0,
      );

      // Read the prior LOCAL status before we flip to canceled — lets us attribute
      // a dunning auto-cancel even when no metadata propagated.
      const { data: priorSub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();

      // Source attribution: explicit metadata wins (account deletion sets this
      // before cancelling; dunning sets it on payment_failed), then infer dunning
      // from a prior past_due/unpaid local status, else it was a portal cancel.
      const canceledVia = subscription.metadata?.canceled_via;
      const source: 'portal' | 'dunning' | 'account_deletion' =
        canceledVia === 'account_deletion'
          ? 'account_deletion'
          : canceledVia === 'dunning' || priorSub?.status === 'past_due' || priorSub?.status === 'unpaid'
            ? 'dunning'
            : 'portal';

      // Mark subscription as canceled, capturing churn reason for analysis
      const { error: cancelErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancelled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : new Date().toISOString(),
          cancel_reason: deletedCancelDetails?.reason ?? null,
          cancel_feedback: deletedCancelDetails?.feedback ?? null,
          cancel_comment: deletedCancelDetails?.comment ?? null,
        })
        .eq('stripe_subscription_id', subscription.id);
      if (cancelErr) {
        console.error('[stripe-webhook] Subscription cancel failed:', cancelErr);
        Sentry.captureException(cancelErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
        throw new Error(`Subscription cancel failed: ${cancelErr.message}`);
      }

      // M8: Only downgrade if no other active subscriptions remain
      if (userId) {
        const { data: activeSubs } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])
          .limit(1);

        const newTier = (!activeSubs || activeSubs.length === 0)
          ? 'community'
          : activeSubs[0]!.tier as string;

        const { error: downgradeErr } = await supabase
          .from('profiles')
          .update({ tier: newTier })
          .eq('id', userId);
        if (downgradeErr) {
          console.error('[stripe-webhook] Profile downgrade failed:', downgradeErr);
          Sentry.captureException(downgradeErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
          throw new Error(`Profile downgrade failed: ${downgradeErr.message}`);
        }

        // Send cancellation email (non-blocking)
        void sendCancellationNotification(supabase, userId);

        // Schedule win-back email 7 days from now for opted-in users (non-blocking)
        void scheduleWinBackForUser(supabase, userId);

        // Sync Discord role (revoke if downgraded to community)
        await syncDiscordForUser(supabase, userId, newTier, event.id);

        // Legible #revenue alert. Wrapped non-fatally: a notification failure must
        // never bubble out and fail the Stripe job, which would re-drive the
        // cancellation email + win-back. Email is looked up only for portal cancels
        // (an account-deleted user's profile is already gone) and masked downstream.
        try {
          const email = source === 'portal' ? await getUserEmail(supabase, userId) : null;
          await sendAlert('revenue', '', [formatRevenueEmbed({
            event: 'cancellation',
            churnedFrom,
            landingTier: newTier,
            interval: churnedInterval,
            mrrCents: mrrCentsLost,
            reason: deletedCancelDetails?.reason ?? undefined,
            feedback: deletedCancelDetails?.feedback ?? undefined,
            email: email ?? undefined,
            source,
          })]);
        } catch (alertErr) {
          console.error('[stripe-webhook] Cancellation alert failed (non-fatal):', alertErr);
          Sentry.captureException(alertErr, { tags: { route: 'stripe-webhook', event_type: event.type, action: 'cancellation-alert' } });
        }
      }

      await logSubscriptionEvent(supabase, {
        userId,
        eventType: 'cancelled',
        tier: churnedFrom,
        interval: churnedInterval,
        mrrCents: mrrCentsLost,
        stripeSubscriptionId: subscription.id,
        stripeEventId: event.id,
        source,
        cancelReason: deletedCancelDetails?.reason ?? undefined,
        cancelFeedback: deletedCancelDetails?.feedback ?? undefined,
      });

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;
      const subscriptionId = typeof subDetails?.subscription === 'string'
        ? subDetails.subscription
        : subDetails?.subscription?.id;

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        // Tag the Stripe subscription so a later auto-cancel is attributed to
        // dunning, not a user-initiated portal cancel. Retrieve-then-spread keeps
        // the existing metadata (e.g. supabase_user_id) intact. Non-fatal.
        try {
          const existing = await stripe.subscriptions.retrieve(subscriptionId);
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { ...existing.metadata, canceled_via: 'dunning' },
          });
        } catch (metaErr) {
          console.error('[stripe-webhook] Failed to tag dunning metadata (non-fatal):', metaErr);
          Sentry.captureException(metaErr, { tags: { route: 'stripe-webhook', event_type: event.type, action: 'dunning-metadata' } });
        }

        await logSubscriptionEvent(supabase, {
          userId: undefined,
          eventType: 'past_due',
          stripeSubscriptionId: subscriptionId,
          stripeEventId: event.id,
          source: 'dunning',
        });

        // Right-sized alert: the URGENT email + #critical fire ONLY on Stripe's
        // final dunning attempt (next_payment_attempt === null, sub about to be
        // lost). Earlier retries go to #revenue as a calm "retry pending" note.
        // Every alert carries amount, attempt #, masked customer, next retry.
        await alertStripePaymentFailed({
          amountCents: invoice.amount_due,
          attemptCount: invoice.attempt_count ?? undefined,
          nextAttemptAt: invoice.next_payment_attempt,
          customerEmail: invoice.customer_email,
          subscriptionId,
        });
      }

      break;
    }
  }
}

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify webhook signature — must happen synchronously before body is consumed
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    Sentry.captureEvent({
      level: 'error',
      message: 'Stripe webhook signature verification failed',
      tags: {
        route: 'webhooks/stripe',
        event_type: 'stripe_webhook_sig_failure',
      },
      extra: {
        hasSignatureHeader: !!request.headers.get('stripe-signature'),
        userAgent: request.headers.get('user-agent'),
      },
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency + job-state record (ST1). Insert the event as `pending`.
  //
  // The PRIMARY KEY on event_id makes this insert the idempotency gate:
  //   - success            -> first time we see this event, claim it as `pending`
  //   - unique violation   -> Stripe redelivered an event we already have a row
  //     for (Postgres code 23505). A TRUE duplicate. Ack with 200, do nothing.
  //   - any OTHER db error -> the DB is unhealthy (we cannot record the event).
  //     Return 500 so Stripe RETRIES later. Never swallow it as a duplicate.
  //
  // This fixes the pre-ST1 bug where ANY insert error was treated as a duplicate,
  // silently dropping events whenever the insert failed for a non-duplicate reason.
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type, status: 'pending' });

  if (insertError) {
    if (insertError.code === '23505') {
      // True duplicate — already recorded, return 200 to acknowledge.
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Non-duplicate DB failure — we could not durably record the event.
    // Return 500 so Stripe retries; do NOT process and do NOT 200.
    console.error('[stripe-webhook] stripe_events insert failed (non-duplicate):', insertError);
    Sentry.captureException(insertError, {
      level: 'error',
      tags: { route: 'stripe-webhook', event_type: event.type, action: 'idempotency-insert' },
    });
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  // Defer all event processing after the 200 response is sent. This prevents
  // the outbound Stripe API call (checkout.session.completed) and DB writes
  // from exceeding the function timeout under latency spikes (JAVASCRIPT-NEXTJS-56).
  //
  // The row is durable now (status `pending`). If processing fails we mark it
  // `failed` and the subscription-drift cron re-drives it — we NEVER delete the
  // row, because Stripe already got 200 and will not retry on its own.
  after(async () => {
    await runStripeJob(stripe, supabase, event);
  });

  return NextResponse.json({ received: true });
}

/**
 * Run a stripe_events job through its state machine: pending -> processing ->
 * done, or -> failed on error. Shared by the webhook route (first attempt) and
 * the subscription-drift re-drive cron (retries). The row is NEVER deleted; a
 * failure leaves a durable `failed` record with last_error + attempts so it can
 * be re-driven idempotently.
 *
 * CONCURRENCY (BLOCKER 1): the first step is an ATOMIC, CONDITIONAL claim. The
 * UPDATE flips the row to `processing` only when it is currently claimable
 * (pending|failed, or a `processing` row gone stale past STALE_PROCESSING_MS)
 * and RETURNING tells us whether THIS caller won the row. If no row comes back,
 * another worker already owns it (or it is already done/dead) and we return
 * WITHOUT processing. This makes after() and the cron re-drive mutually
 * exclusive — they can never both process the same event, so the non-idempotent
 * side effects inside processStripeEvent (Resend emails, subscription_events
 * inserts, Discord alerts) run at most once per real transition.
 *
 * @param attemptsBefore number of prior attempts recorded on the row (0 for a
 *   fresh webhook insert). The claim sets attempts to this + 1 atomically.
 * @returns true if this caller claimed and processed the row, false if another
 *   worker owned it / it was already terminal (no processing, no side effects).
 */
export async function runStripeJob(
  stripe: Stripe,
  supabase: SupabaseClient,
  event: Stripe.Event,
  attemptsBefore = 0
): Promise<boolean> {
  const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  // Atomic conditional claim via the claim_stripe_event SQL function
  // (migration 063). Equivalent SQL:
  //   UPDATE stripe_events
  //      SET status='processing', attempts=$attempts, updated_at=now()
  //    WHERE event_id=$id
  //      AND ( status IN ('pending','failed')
  //            OR (status='processing' AND updated_at < $staleCutoff) )
  //   RETURNING event_id;
  // This MUST be a function, not a PostgREST `.update().or(...)`: PostgREST
  // cannot build an `or` filter on a MUTATION and rejects it with 42703
  // "column stripe_events.status does not exist" (the identical `or` works on a
  // SELECT, and direct SQL runs the UPDATE fine). The function RETURNs the row
  // id so we know whether THIS caller won the claim. attempts is set to
  // attemptsBefore+1 (0 for a fresh insert, row.attempts for the cron);
  // updated_at is set inside the function so the stale-claim window is exact.
  const { data: claimed, error: claimErr } = await supabase.rpc('claim_stripe_event', {
    p_event_id: event.id,
    p_attempts: attemptsBefore + 1,
    p_stale_cutoff: staleCutoff,
  });

  if (claimErr) {
    // Could not even attempt the claim (DB unhealthy). Surface it; the row keeps
    // its prior status and the cron will retry on a later run.
    console.error('[stripe-webhook] Failed to claim event:', claimErr);
    Sentry.captureException(claimErr, {
      level: 'error',
      tags: { route: 'stripe-webhook', event_type: event.type, action: 'claim' },
    });
    return false;
  }

  if (!claimed || claimed.length === 0) {
    // No row returned -> another worker owns it, or it is already done/dead.
    // Do NOT process and do NOT run any side effects.
    return false;
  }

  // We won the claim. processStripeEvent (and its side effects) run exactly once
  // for this transition because the claim was atomic.
  try {
    await processStripeEvent(stripe, supabase, event);

    // Success — mark done. Clear last_error so a re-driven row reads clean.
    const { error: doneErr } = await supabase
      .from('stripe_events')
      .update({ status: 'done', last_error: null, processed_at: new Date().toISOString() })
      .eq('event_id', event.id);
    if (doneErr) {
      console.error('[stripe-webhook] Failed to mark event done:', doneErr);
      Sentry.captureException(doneErr, {
        level: 'error',
        tags: { route: 'stripe-webhook', event_type: event.type, action: 'mark-done' },
      });
    }
    return true;
  } catch (err) {
    // Processing failed. attempts was already incremented by the claim. Park the
    // row in a terminal `dead` state once it hits the attempt cap (BLOCKER/HIGH
    // 3) so a poison event stops re-driving; otherwise mark it `failed` so the
    // cron retries. Either way the row is kept (never deleted).
    const attemptsNow = attemptsBefore + 1;
    const terminal = attemptsNow >= MAX_ATTEMPTS;
    const { error: failErr } = await supabase
      .from('stripe_events')
      .update({
        status: terminal ? 'dead' : 'failed',
        last_error: err instanceof Error ? err.message : String(err),
      })
      .eq('event_id', event.id);
    if (failErr) {
      console.error('[stripe-webhook] Failed to mark event failed:', failErr);
      Sentry.captureException(failErr, {
        level: 'error',
        tags: { route: 'stripe-webhook', event_type: event.type, action: 'mark-failed' },
      });
    }

    if (terminal) {
      // Poison event parked. Emit ONE ops alert so it gets manual attention.
      Sentry.captureMessage('Stripe event hit max attempts — parked as dead', {
        level: 'error',
        fingerprint: ['stripe-event-dead', event.id],
        tags: { route: 'stripe-webhook', event_type: event.type, action: 'dead-letter' },
        extra: { event_id: event.id, attempts: attemptsNow },
      });
      await sendAlert('ops', '', [{
        title: ':skull: Stripe event parked (dead-letter)',
        description: `Event \`${event.id}\` (${event.type}) failed ${attemptsNow} times and will no longer be re-driven. Manual review required.`,
        color: 0xef4444,
        fields: [
          { name: 'Event ID', value: event.id, inline: true },
          { name: 'Type', value: event.type, inline: true },
          { name: 'Attempts', value: String(attemptsNow), inline: true },
          { name: 'Last error', value: (err instanceof Error ? err.message : String(err)).slice(0, 1000) },
        ],
        timestamp: new Date().toISOString(),
      }]);
    }

    Sentry.captureException(err, { tags: { route: 'stripe-webhook', event_type: event.type } });
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    return true;
  }
}
