import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Supabase free tier limits
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const ALERT_THRESHOLD = 0.8; // Alert at 80% usage

interface StorageStats {
  database_size_bytes: number;
  shared_analyses_rows: number;
  analysis_sessions_rows: number;
  data_contributions_rows: number;
  waveform_contributions_rows: number;
  user_files_rows: number;
  user_files_total_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function sendAlert(subject: string, body: string) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[cron/monitor] RESEND_API_KEY not configured — cannot send alert');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@airwaylab.app>',
        to: ['dev@airwaylab.app'],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[cron/monitor] Resend error:', res.status, text);
    }
  } catch (err) {
    console.error('[cron/monitor] Alert email failed:', err);
  }
}

/**
 * GET /api/cron/monitor
 *
 * Runs daily via Vercel Cron. Checks database and storage usage
 * against Supabase free tier limits. Sends email alert via Resend
 * when usage exceeds 80%.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const { data, error } = await supabase.rpc('get_storage_stats');

    if (error) {
      console.error('[cron/monitor] get_storage_stats error:', error.message);
      Sentry.captureException(error, { tags: { route: 'cron-monitor' } });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const stats = data as StorageStats;
    const dbUsage = stats.database_size_bytes / DB_LIMIT_BYTES;
    const storageUsage = stats.user_files_total_bytes / STORAGE_LIMIT_BYTES;

    const alerts: string[] = [];

    if (dbUsage >= ALERT_THRESHOLD) {
      alerts.push(
        `Database: ${formatBytes(stats.database_size_bytes)} / ${formatBytes(DB_LIMIT_BYTES)} (${(dbUsage * 100).toFixed(1)}%)`
      );
    }

    if (storageUsage >= ALERT_THRESHOLD) {
      alerts.push(
        `File storage: ${formatBytes(stats.user_files_total_bytes)} / ${formatBytes(STORAGE_LIMIT_BYTES)} (${(storageUsage * 100).toFixed(1)}%)`
      );
    }

    if (alerts.length > 0) {
      const subject = `AirwayLab: Storage usage alert (${alerts.length} threshold${alerts.length > 1 ? 's' : ''} exceeded)`;
      const body = [
        'One or more Supabase free tier thresholds exceeded 80%:',
        '',
        ...alerts,
        '',
        '--- Full breakdown ---',
        '',
        `Database size: ${formatBytes(stats.database_size_bytes)} / ${formatBytes(DB_LIMIT_BYTES)} (${(dbUsage * 100).toFixed(1)}%)`,
        `File storage:  ${formatBytes(stats.user_files_total_bytes)} / ${formatBytes(STORAGE_LIMIT_BYTES)} (${(storageUsage * 100).toFixed(1)}%)`,
        '',
        `shared_analyses:        ${stats.shared_analyses_rows.toLocaleString()} rows`,
        `analysis_sessions:      ${stats.analysis_sessions_rows.toLocaleString()} rows`,
        `data_contributions:     ${stats.data_contributions_rows.toLocaleString()} rows`,
        `waveform_contributions: ${stats.waveform_contributions_rows.toLocaleString()} rows`,
        `user_files:             ${stats.user_files_rows.toLocaleString()} rows`,
        '',
        'Action: Consider upgrading Supabase or archiving old data.',
      ].join('\n');

      await sendAlert(subject, body);

      Sentry.captureMessage('Storage threshold alert triggered', {
        level: 'warning',
        tags: { route: 'cron-monitor' },
        extra: { dbUsage, storageUsage, stats },
      });
    }

    console.error(
      `[cron/monitor] db=${(dbUsage * 100).toFixed(1)}%, storage=${(storageUsage * 100).toFixed(1)}%, alerts=${alerts.length}`
    );

    return NextResponse.json({
      ok: true,
      database: {
        size_bytes: stats.database_size_bytes,
        size_human: formatBytes(stats.database_size_bytes),
        limit_bytes: DB_LIMIT_BYTES,
        usage_pct: Math.round(dbUsage * 1000) / 10,
      },
      storage: {
        size_bytes: stats.user_files_total_bytes,
        size_human: formatBytes(stats.user_files_total_bytes),
        limit_bytes: STORAGE_LIMIT_BYTES,
        usage_pct: Math.round(storageUsage * 1000) / 10,
      },
      table_rows: {
        shared_analyses: stats.shared_analyses_rows,
        analysis_sessions: stats.analysis_sessions_rows,
        data_contributions: stats.data_contributions_rows,
        waveform_contributions: stats.waveform_contributions_rows,
        user_files: stats.user_files_rows,
      },
      alerts_sent: alerts.length,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-monitor' } });
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
