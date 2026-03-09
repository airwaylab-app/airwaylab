import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {};
  const version = process.env.npm_package_version ?? 'unknown';

  // Supabase connectivity
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      // Lightweight auth health check — doesn't need a session
      const { error } = await sb.auth.getSession();
      checks.supabase = !error;
    } catch {
      checks.supabase = false;
    }
  } else {
    checks.supabase = false;
  }

  // Stripe connectivity
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      checks.stripe = res.ok;
    } catch {
      checks.stripe = false;
    }
  } else {
    checks.stripe = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      version,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
