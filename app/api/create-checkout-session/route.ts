import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { stripeRateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const CheckoutSchema = z.object({
  priceId: z.string({ error: 'Missing priceId' }).min(1, 'Missing priceId').max(200),
  source: z.string().max(50).optional(),
});

// M5: Whitelist of allowed price IDs
function getAllowedPriceIds(): Set<string> {
  const ids = [
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID,
  ].filter((id): id is string => !!id);
  return new Set(ids);
}

export async function POST(request: NextRequest) {
  // L8: CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // C3: Rate limiting
  const ip = getRateLimitKey(request);
  if (await stripeRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  if (!stripeSecretKey) {
    Sentry.captureMessage('Stripe not configured', {
      level: 'error',
      tags: { route: 'create-checkout-session' },
    });
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  // Auth check
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request
  const raw = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }
  const { priceId, source } = parsed.data;

  // M5: Validate priceId against allowed list
  const allowedPrices = getAllowedPriceIds();
  if (!allowedPrices.has(priceId)) {
    return NextResponse.json({ error: 'Invalid price selected' }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });

  try {
    // Check for existing Stripe customer — use maybeSingle() to avoid throwing on 0 rows
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[create-checkout-session] Profile lookup failed:', profileError.message);
      Sentry.captureException(profileError, { tags: { route: 'create-checkout-session', step: 'profile-lookup' } });
      return NextResponse.json({ error: 'Could not load your account. Please try again.' }, { status: 500 });
    }

    let customerId = profile?.stripe_customer_id;

    // Verify the stored customer still exists in Stripe (may have been deleted or be from a different mode)
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (stripeErr) {
        console.error(`[create-checkout-session] Stale Stripe customer ${customerId}, will recreate:`, stripeErr);
        Sentry.captureMessage(`Stale Stripe customer ID: ${customerId}`, {
          level: 'warning',
          tags: { route: 'create-checkout-session' },
          extra: { userId: user.id },
        });
        customerId = undefined;
      }
    }

    // H5: Create Stripe customer if needed — use service role for atomic update
    if (!customerId) {
      const adminClient = getSupabaseServiceRole();
      if (!adminClient) {
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
      }

      // Re-check under service role to prevent race condition
      const { data: freshProfile } = await adminClient
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      if (freshProfile?.stripe_customer_id) {
        customerId = freshProfile.stripe_customer_id;
      } else {
        // AIR-1873: A valid auth session with no profile row (e.g. anonymous user, deleted
        // account, profile trigger failure) must not create an orphan Stripe customer —
        // the webhook would silently fail to link the subscription to any real user.
        if (!freshProfile) {
          Sentry.captureMessage('Checkout blocked: no profile row for authenticated user', {
            level: 'error',
            tags: { route: 'create-checkout-session', check: 'profile-existence-gate' },
            extra: { userId: user.id },
          });
          return NextResponse.json(
            { error: 'Account setup incomplete. Please sign out, sign back in, and try again.' },
            { status: 400 }
          );
        }

        Sentry.addBreadcrumb({
          category: 'stripe',
          message: 'Creating new Stripe customer',
          level: 'info',
          data: { userId: user.id },
        });

        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;

        // M9: Check service role update result
        const { error: updateErr } = await adminClient
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);

        if (updateErr) {
          console.error('[create-checkout-session] Profile update failed:', updateErr);
          Sentry.captureException(updateErr, { tags: { route: 'create-checkout-session' } });
        }
      }
    }

    // M3: Use env var for origin, fallback to hardcoded domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://airwaylab.app';

    // Single active paid sub per user. A user who already holds an active/trialing
    // subscription must CHANGE plan via the billing portal (Stripe owns
    // upgrade/downgrade + interval switch + proration), NOT create a parallel
    // second subscription (the double-charge bug). Placed immediately before
    // session creation so it also serves as the concurrency re-check. Service-role
    // read so RLS can never hide an existing sub and let a duplicate through.
    const subCheckClient = getSupabaseServiceRole() ?? supabase;
    const { data: activePaidSubs } = await subCheckClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .limit(1);

    if (activePaidSubs && activePaidSubs.length > 0) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/account`,
      });
      return NextResponse.json({ url: portalSession.url, viaPortal: true });
    }

    const sessionMeta: Record<string, string> = { supabase_user_id: user.id };
    if (source) sessionMeta.source = source;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/analyze?checkout=success`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: {
        metadata: sessionMeta,
      },
      metadata: sessionMeta,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'create-checkout-session' } });
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[create-checkout-session] Error:', errMsg, err);

    // Surface Stripe-specific errors so users know what went wrong
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${err.message}` },
        { status: err.statusCode ?? 500 },
      );
    }

    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
