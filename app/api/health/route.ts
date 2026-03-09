import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateServerEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {};
  const warnings: string[] = [];
  const version = process.env.npm_package_version ?? 'unknown';

  // Environment variable validation
  try {
    const envWarnings = validateServerEnv();
    checks.env = envWarnings.length === 0;
    warnings.push(...envWarnings);
  } catch (err) {
    checks.env = false;
    warnings.push(err instanceof Error ? err.message : 'Env validation failed');
  }

  // Stripe price IDs
  const priceVars = [
    'NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID',
  ];
  const missingPrices = priceVars.filter((v) => !process.env[v]);
  checks.stripe_prices = missingPrices.length === 0;
  if (missingPrices.length > 0) {
    warnings.push(`Missing Stripe price IDs: ${missingPrices.join(', ')}`);
  }

  // Supabase connectivity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { error } = await sb.auth.getSession();
      checks.supabase = !error;
      if (error) warnings.push(`Supabase auth check failed: ${error.message}`);
    } catch (err) {
      checks.supabase = false;
      warnings.push(`Supabase connection failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  } else {
    checks.supabase = false;
    warnings.push('Supabase env vars not configured');
  }

  // Stripe API connectivity
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      checks.stripe_api = res.ok;
      if (!res.ok) warnings.push(`Stripe API returned ${res.status}`);
    } catch (err) {
      checks.stripe_api = false;
      warnings.push(`Stripe API unreachable: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  } else {
    checks.stripe_api = false;
    warnings.push('STRIPE_SECRET_KEY not configured');
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      version,
      timestamp: new Date().toISOString(),
      checks,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
