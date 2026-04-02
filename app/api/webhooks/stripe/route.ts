import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelSequence, scheduleSequence } from '@/lib/email/sequences';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail, cancellationEmail } from '@/lib/email/transactional';
import { isDiscordConfigured, syncRole, searchGuildMember } from '@/lib/discord';
import { sendAlert, formatRevenueEmbed } from '@/lib/discord-webhook';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/** Compute monthly recurring revenue in cents from a unit amount and interval. */
function computeMrrCents(unitAmount: number, interval: string): number {
  if (interval === 'year') return Math.round(unitAmount / 12);
  return unitAmount; // monthly
}

/** Log a subscription lifecycle event for LTV/churn analytics. Non-blocking. */
async function logSubscriptionEvent(
  supabase: SupabaseClient,
  params: {
    userId: string | undefined;
    eventType: 'created' | 'updated' | 'cancelled' | 'renewed' | 'past_due';
    tier?: string;
    interval?: string;
    stripeSubscriptionId?: string;
    mrrCents?: number;
  }
) {
  const { error } = await supabase.from('subscription_events').insert({
    user_id: params.userId ?? null,
    event_type: params.eventType,
    tier: params.tier ?? null,
    interval: params.interval ?? null,
    stripe_subscription_id: params.stripeSubscriptionId ?? null,
    mrr_cents: params.mrrCents ?? null,
  });
  if (error) {
    // Non-blocking — log but don't throw
    console.error('[stripe-webhook] subscription_events insert failed:', error);
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
      await syncRole(profile.discord_id, tier);

      // Log the role event
      await supabase.from('discord_role_events').insert({
        user_id: userId,
        discord_id: profile.discord_id,
        role_id: tier,
        action: tier === 'community' ? 'revoke' : 'assign',
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

          await syncRole(searchResult.discordId, tier);

          await supabase.from('discord_role_events').insert({
            user_id: userId,
            discord_id: searchResult.discordId,
            role_id: tier,
            action: tier === 'community' ? 'revoke' : 'assign',
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

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify webhook signature
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency check (H1) — skip if already processed
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type });

  if (insertError) {
    // Duplicate event — already processed, return 200 to acknowledge
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
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

        // Log subscription event for analytics
        await logSubscriptionEvent(supabase, {
          userId,
          eventType: 'created',
          tier,
          interval,
          stripeSubscriptionId: subscriptionId,
          mrrCents: computeMrrCents(firstItem?.price.unit_amount ?? 0, interval),
        });

        // Upsert subscription record
        const { error: upsertErr } = await supabase.from('subscriptions').upsert(
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
        );
        if (upsertErr) {
          console.error('[stripe-webhook] Subscription upsert failed:', upsertErr);
          Sentry.captureException(upsertErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
          throw new Error(`Subscription upsert failed: ${upsertErr.message}`);
        }

        // Update profile tier
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            tier,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId);
        if (profileErr) {
          console.error('[stripe-webhook] Profile update failed:', profileErr);
          Sentry.captureException(profileErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
          throw new Error(`Profile update failed: ${profileErr.message}`);
        }

        // Cancel marketing drip sequences -- user just paid, stop selling
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

        // Send welcome email (non-blocking)
        void sendWelcomeNotification(supabase, userId, tier, interval);

        // Sync Discord role (non-blocking)
        void syncDiscordForUser(supabase, userId, tier, event.id);

        // Discord #revenue alert (non-blocking)
        void sendAlert('revenue', '', [formatRevenueEmbed({
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

        // Log subscription event for analytics
        await logSubscriptionEvent(supabase, {
          userId,
          eventType: 'updated',
          tier,
          interval: updatedInterval,
          stripeSubscriptionId: subscription.id,
          mrrCents: computeMrrCents(updatedItem?.price.unit_amount ?? 0, updatedInterval),
        });

        if (!userId) {
          console.error(`[stripe-webhook] subscription.updated missing userId, event=${event.id}`);
          Sentry.captureMessage('Stripe subscription.updated missing userId', {
            level: 'warning',
            extra: { eventId: event.id, subscriptionId: subscription.id },
          });
        }

        // Update subscription record
        const { error: subUpdateErr } = await supabase
          .from('subscriptions')
          .update({
            stripe_price_id: priceId || '',
            status: subscription.status,
            tier,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subUpdateErr) {
          console.error('[stripe-webhook] Subscription update failed:', subUpdateErr);
          Sentry.captureException(subUpdateErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
          throw new Error(`Subscription update failed: ${subUpdateErr.message}`);
        }

        // Update profile tier if subscription is still active
        if (userId && ['active', 'trialing'].includes(subscription.status)) {
          const { error: profileUpdateErr } = await supabase.from('profiles').update({ tier }).eq('id', userId);
          if (profileUpdateErr) {
            console.error('[stripe-webhook] Profile tier update failed:', profileUpdateErr);
            Sentry.captureException(profileUpdateErr, { tags: { route: 'stripe-webhook', event_type: event.type } });
            throw new Error(`Profile tier update failed: ${profileUpdateErr.message}`);
          }

          // Sync Discord role (non-blocking)
          void syncDiscordForUser(supabase, userId, tier, event.id);
        }

        // Discord #revenue alert (non-blocking)
        void sendAlert('revenue', '', [formatRevenueEmbed({
          event: 'tier_change',
          tier,
          interval: updatedInterval,
          mrrCents: computeMrrCents(updatedItem?.price.unit_amount ?? 0, updatedInterval),
        })]);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        // Log subscription event for analytics
        await logSubscriptionEvent(supabase, {
          userId,
          eventType: 'cancelled',
          stripeSubscriptionId: subscription.id,
        });

        // Mark subscription as canceled
        const { error: cancelErr } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
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

          // Sync Discord role (revoke if downgraded to community)
          void syncDiscordForUser(supabase, userId, newTier, event.id);

          // Discord #revenue alert (non-blocking)
          void sendAlert('revenue', '', [formatRevenueEmbed({
            event: 'cancellation',
            tier: newTier,
          })]);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId = typeof subDetails?.subscription === 'string'
          ? subDetails.subscription
          : subDetails?.subscription?.id;

        if (subscriptionId) {
          // Log subscription event for analytics
          await logSubscriptionEvent(supabase, {
            userId: undefined,
            eventType: 'past_due',
            stripeSubscriptionId: subscriptionId,
          });

          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          // Discord #revenue alert (non-blocking)
          void sendAlert('revenue', '', [formatRevenueEmbed({
            event: 'payment_failed',
          })]);
        }

        break;
      }
    }
  } catch (err) {
    // Compensating action: remove idempotency record so Stripe can retry
    const { error: deleteErr } = await supabase
      .from('stripe_events')
      .delete()
      .eq('event_id', event.id);
    if (deleteErr) {
      console.error('[stripe-webhook] Failed to remove idempotency record:', deleteErr);
      Sentry.captureException(deleteErr, {
        level: 'error',
        tags: { route: 'stripe-webhook', event_type: event.type, action: 'compensating-delete' },
      });
    }

    Sentry.captureException(err, { tags: { route: 'stripe-webhook', event_type: event.type } });
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
