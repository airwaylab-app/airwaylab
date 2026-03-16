import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { stripeRateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

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
  let priceId: string;
  try {
    const body = await request.json();
    priceId = body.priceId;
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/analyze?checkout=success`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
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
