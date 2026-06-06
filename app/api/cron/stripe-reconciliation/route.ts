/**
 * GET /api/cron/stripe-reconciliation
 *
 * Phase 1b integrity check (AIR-2255): per-customer Stripe API reconciliation.
 *
 * For every profile with a stripe_customer_id:
 *   - Verifies the Stripe customer exists and is not deleted
 *   - Checks that metadata.supabase_user_id matches the profile id
 *   - Checks that any active Stripe subscription has a row in the subscriptions table
 *
 * Divergences fire Sentry alerts (CRITICAL for missing DB row, HIGH otherwise).
 * A summary embed is posted to #ops on Discord.
 *
 * Protected by CRON_SECRET (Bearer token, timing-safe compare).
 * Schedule: 0 9 * * 0 (weekly Sunday 09:00 UTC)
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendAlert, COLORS } from '@/lib/discord-webhook';
import { runStripeReconciliation } from '@/lib/stripe-reconciliation';

export const dynamic = 'force-dynamic';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeSecretKey) return null;
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

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

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const result = await runStripeReconciliation(supabase, stripe);

    const hasCritical = result.active_sub_not_in_db > 0;
    const hasHighSeverity =
      hasCritical || result.metadata_mismatch > 0 || result.customer_not_in_stripe > 0;

    const color = hasCritical
      ? COLORS.red
      : hasHighSeverity
        ? COLORS.amber
        : COLORS.green;

    const title = hasCritical
      ? ':rotating_light: Stripe Reconciliation — CRITICAL: active sub missing from DB'
      : hasHighSeverity
        ? ':warning: Stripe Reconciliation — Divergences Found'
        : ':white_check_mark: Stripe Reconciliation — All Clean';

    await sendAlert('ops', '', [
      {
        title,
        color,
        fields: [
          { name: 'Profiles checked', value: String(result.profiles_checked), inline: true },
          {
            name: ':rotating_light: Active sub not in DB',
            value: String(result.active_sub_not_in_db),
            inline: true,
          },
          {
            name: 'Customer not in Stripe',
            value: String(result.customer_not_in_stripe),
            inline: true,
          },
          { name: 'Metadata mismatch', value: String(result.metadata_mismatch), inline: true },
          { name: 'API errors', value: String(result.api_errors), inline: true },
        ],
        footer: { text: 'stripe-reconciliation cron' },
        timestamp: new Date().toISOString(),
      },
    ]);

    if (hasCritical) {
      Sentry.captureMessage(
        `Stripe reconciliation: ${result.active_sub_not_in_db} active subscription(s) missing from DB`,
        {
          level: 'error',
          tags: { route: 'cron-stripe-reconciliation', severity: 'CRITICAL' },
          extra: {
            profiles_checked: result.profiles_checked,
            active_sub_not_in_db: result.active_sub_not_in_db,
            metadata_mismatch: result.metadata_mismatch,
            customer_not_in_stripe: result.customer_not_in_stripe,
          },
        }
      );
    }

    console.error(
      `[stripe-reconciliation] completed: checked=${result.profiles_checked} active_sub_not_in_db=${result.active_sub_not_in_db} customer_not_in_stripe=${result.customer_not_in_stripe} metadata_mismatch=${result.metadata_mismatch} api_errors=${result.api_errors}`
    );

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('[stripe-reconciliation] Cron failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-stripe-reconciliation' } });
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
