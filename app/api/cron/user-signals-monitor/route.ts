import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALERT_THRESHOLD = 20;

interface SignalRow {
  signal_type: string;
  signal_name: string;
  signal_date: string;
  count: number;
  webhook_fired_at_thresholds: number[];
}

/**
 * GET /api/cron/user-signals-monitor
 *
 * Runs daily via Vercel Cron (09:00 UTC). Reads today's signal_daily_counts
 * rows that have crossed the alert threshold but whose Paperclip webhook has
 * not yet been fired (webhook_fired_at_thresholds is empty).
 *
 * For each such signal, fires PAPERCLIP_SIGNALS_WEBHOOK_URL so the routine
 * creates a bug-triage execution issue for the CTO agent.
 *
 * This is a backstop for the per-request fireThresholdWebhook in
 * lib/signal-tracker.ts — it catches failures where the count crossed a
 * threshold but the real-time webhook call failed (network, timeout, etc.).
 *
 * Protected by CRON_SECRET.
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

  const webhookUrl = process.env.PAPERCLIP_SIGNALS_WEBHOOK_URL;
  const webhookSecret = process.env.PAPERCLIP_SIGNALS_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.error('[cron/user-signals-monitor] PAPERCLIP_SIGNALS_WEBHOOK_URL not configured — skipping');
    return NextResponse.json({ skipped: true, reason: 'webhook_not_configured' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data: signals, error } = await supabase
      .from('signal_daily_counts')
      .select('signal_type, signal_name, signal_date, count, webhook_fired_at_thresholds')
      .eq('signal_date', today)
      .gte('count', ALERT_THRESHOLD)
      .order('count', { ascending: false });

    if (error) {
      Sentry.captureException(error, { tags: { route: 'cron-user-signals-monitor' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const rows = (signals ?? []) as SignalRow[];

    // Only fire for signals that haven't had any threshold webhook yet
    const unfired = rows.filter((r) => r.webhook_fired_at_thresholds.length === 0);

    let fired = 0;
    let failed = 0;

    for (const signal of unfired) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(8_000),
          headers: {
            Authorization: `Bearer ${webhookSecret ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signal_type: signal.signal_type,
            signal_name: signal.signal_name,
            hits_24h: signal.count,
            threshold: ALERT_THRESHOLD,
            source: 'daily-cron-backstop',
          }),
        });

        if (res.ok) {
          fired++;
        } else {
          failed++;
          console.error(
            `[cron/user-signals-monitor] webhook returned ${res.status} for signal=${signal.signal_type}`
          );
        }
      } catch (err) {
        failed++;
        Sentry.captureException(err, {
          tags: { route: 'cron-user-signals-monitor', signal_type: signal.signal_type },
        });
      }
    }

    console.error(
      `[cron/user-signals-monitor] date=${today} above_threshold=${rows.length} unfired=${unfired.length} fired=${fired} failed=${failed}`
    );

    return NextResponse.json({
      ok: true,
      date: today,
      above_threshold: rows.length,
      unfired: unfired.length,
      fired,
      failed,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-user-signals-monitor' } });
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
