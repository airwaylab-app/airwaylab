import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/cleanup
 *
 * Runs daily via Vercel Cron. Cleans up:
 * 1. Expired shared analyses (past 30-day TTL)
 * 2. Old analysis sessions (> 12 months)
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

  const results: Record<string, number> = {};

  try {
    // 1. Clean expired shared analyses
    const { data: sharesData, error: sharesError } = await supabase.rpc(
      'cleanup_expired_shared_analyses'
    );
    if (sharesError) {
      console.error('[cron/cleanup] shared_analyses cleanup error:', sharesError.message);
      Sentry.captureException(sharesError, { tags: { route: 'cron-cleanup' } });
    } else {
      results.expired_shares_deleted = sharesData?.[0]?.deleted_count ?? 0;
    }

    // 2. Clean old analysis sessions (> 12 months)
    const { data: sessionsData, error: sessionsError } = await supabase.rpc(
      'cleanup_old_analysis_sessions'
    );
    if (sessionsError) {
      console.error('[cron/cleanup] analysis_sessions cleanup error:', sessionsError.message);
      Sentry.captureException(sessionsError, { tags: { route: 'cron-cleanup' } });
    } else {
      results.old_sessions_deleted = sessionsData?.[0]?.deleted_count ?? 0;
    }

    console.error(
      `[cron/cleanup] completed: shares=${results.expired_shares_deleted ?? 'err'}, sessions=${results.old_sessions_deleted ?? 'err'}`
    );

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-cleanup' } });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
