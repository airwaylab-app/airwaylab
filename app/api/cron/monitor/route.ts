import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { checkAll, formatAlertEmail, writeSnapshot, buildCriticalAlerts } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

async function sendAlert(subject: string, body: string) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[cron/monitor] RESEND_API_KEY not configured -- cannot send alert');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@mail.airwaylab.app>',
        to: ['dev@airwaylab.app'],
        reply_to: 'dev@airwaylab.app',
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[cron/monitor] Resend error:', res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[cron/monitor] Alert email failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-monitor', phase: 'send-alert' } });
    return false;
  }
}

/**
 * GET /api/cron/monitor
 *
 * Runs daily via Vercel Cron (04:00 UTC). Checks usage across all paid
 * services (Supabase, Vercel, Anthropic, Sentry, Resend, Upstash).
 * Sends email alert when any service exceeds 80% of its limit.
 * Writes daily snapshot for trend analysis.
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    // Run all service checks in parallel (fail-open per service)
    const checks = await checkAll(supabase);

    // Determine if we need to send an alert
    const alertChecks = checks.filter((c) => c.status === 'warning' || c.status === 'critical');
    let alertsSent = 0;

    if (alertChecks.length > 0) {
      const { subject, body } = formatAlertEmail(checks);
      const sent = await sendAlert(subject, body);
      if (sent) alertsSent = 1;

      const criticalAlerts = buildCriticalAlerts(checks);
      Sentry.captureMessage('Service usage alert triggered', {
        level: criticalAlerts.length > 0 ? 'warning' : 'info',
        tags: { route: 'cron-monitor' },
        extra: {
          alert_count: alertChecks.length,
          critical_count: criticalAlerts.length,
          services: alertChecks.map((c) => `${c.service}:${c.usage_pct}%`),
        },
      });
    }

    // Write daily snapshot for trend analysis
    await writeSnapshot(supabase, checks, alertsSent);

    // Structured log
    const summary = checks
      .map((c) => `${c.service}=${c.usage_pct !== null ? `${c.usage_pct}%` : c.status}`)
      .join(', ');
    console.error(`[cron/monitor] ${summary}, alerts=${alertsSent}`);

    return NextResponse.json({
      ok: true,
      checks,
      alerts_sent: alertsSent,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-monitor' } });
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
