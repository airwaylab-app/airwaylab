import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer } from '@/lib/supabase/server';
import { stripeRateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

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
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });

  try {
    // Verify customer exists in Stripe before creating portal session
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (customer.deleted) {
        throw new Error('Customer deleted');
      }
    } catch {
      console.error(`[customer-portal] Stale Stripe customer: ${profile.stripe_customer_id}`);
      Sentry.captureMessage(`Stale Stripe customer ID on portal access: ${profile.stripe_customer_id}`, {
        level: 'warning',
        tags: { route: 'customer-portal' },
        extra: { userId: user.id },
      });
      return NextResponse.json(
        { error: 'Your billing account could not be found. Please contact us via the contact form at /contact.' },
        { status: 404 }
      );
    }

    // M3: Use env var for origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://airwaylab.app';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/analyze`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'customer-portal' } });
    console.error('[customer-portal] Error:', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
