/**
 * GET /api/cron/db-integrity-check
 *
 * Runs the AIR-1877 Phase 1 orphan queries via the run_db_integrity_checks()
 * RPC and posts a summary embed to #platform-health on Discord.
 *
 * Cohorts checked:
 *   1.1  subscriptions orphans (expected zero)
 *   1.2  user_nights orphans (expected zero)
 *   1.4  email_sequences orphans (expected zero)
 *   1.12a profiles with stripe_customer_id but no subscription (informational)
 *   1.12b profiles with paid tier but no active subscription (expected zero)
 *
 * Protected by CRON_SECRET (Bearer token, timing-safe compare).
 * Schedule: 0 7 * * * (daily at 07:00 UTC)
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendAlert } from '@/lib/discord-webhook';
import {
  buildIntegrityEmbed,
  CRITICAL_KEYS,
  type IntegrityCheckResult,
} from '@/lib/db-integrity-check';

export const dynamic = 'force-dynamic';

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
    // Run all 5 integrity checks in a single DB round-trip via RPC.
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('run_db_integrity_checks');

    if (rpcError) {
      console.error('[db-integrity-check] RPC failed:', rpcError);
      Sentry.captureException(rpcError, { tags: { route: 'cron-db-integrity-check' } });
      return NextResponse.json({ error: 'Integrity check failed' }, { status: 500 });
    }

    const result = rpcResult as IntegrityCheckResult;

    // Persist snapshot into daily_usage_snapshots under the 'db_integrity' key.
    const today = new Date().toISOString().split('T')[0]!;
    const { data: existing } = await supabase
      .from('daily_usage_snapshots')
      .select('id, metrics')
      .eq('snapshot_date', today)
      .maybeSingle();

    if (existing) {
      const merged = { ...(existing.metrics as Record<string, unknown>), db_integrity: result };
      const { error: updateError } = await supabase
        .from('daily_usage_snapshots')
        .update({ metrics: merged })
        .eq('snapshot_date', today);

      if (updateError) {
        console.error('[db-integrity-check] Snapshot update failed:', updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from('daily_usage_snapshots')
        .insert({
          snapshot_date: today,
          metrics: { db_integrity: result },
          critical_alerts: [],
          alerts_sent: 0,
        });

      if (insertError) {
        console.error('[db-integrity-check] Snapshot insert failed:', insertError);
      }
    }

    // Post Discord embed to #platform-health.
    const embed = buildIntegrityEmbed(result);
    await sendAlert('ops', '', [embed]);

    const hasCritical = CRITICAL_KEYS.some((k) => result[k] > 0);

    if (hasCritical) {
      Sentry.captureMessage('DB integrity check: orphans detected', {
        level: 'error',
        tags: { route: 'cron-db-integrity-check' },
        extra: result as unknown as Record<string, unknown>,
      });
    }

    console.error(
      `[db-integrity-check] completed: sub_orphans=${result.subscriptions_orphans} night_orphans=${result.user_nights_orphans} seq_orphans=${result.email_sequences_orphans} stripe_no_sub=${result.profiles_stripe_no_sub} paid_no_active=${result.profiles_paid_no_active_sub}`
    );

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('[db-integrity-check] Cron failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-db-integrity-check' } });
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
