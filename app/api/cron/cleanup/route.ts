import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SHARED_FILES_BUCKET = 'shared-files';

/**
 * GET /api/cron/cleanup
 *
 * Runs daily via Vercel Cron. Cleans up:
 * 1. Expired shared analyses (past 30-day TTL) + their Storage blobs
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

      // Delete Storage blobs for expired shares
      const deletedIds: string[] = sharesData?.[0]?.deleted_ids ?? [];
      let shareFilesDeleted = 0;

      for (const shareId of deletedIds) {
        const { data: files } = await supabase.storage
          .from(SHARED_FILES_BUCKET)
          .list(shareId);

        if (files && files.length > 0) {
          const paths = files.map((f) => `${shareId}/${f.name}`);
          const { error: removeError } = await supabase.storage
            .from(SHARED_FILES_BUCKET)
            .remove(paths);

          if (removeError) {
            console.error(`[cron/cleanup] Storage cleanup error for ${shareId}:`, removeError.message);
          } else {
            shareFilesDeleted += paths.length;
          }
        }
      }

      results.share_files_deleted = shareFilesDeleted;
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
      `[cron/cleanup] completed: shares=${results.expired_shares_deleted ?? 'err'}, files=${results.share_files_deleted ?? 0}, sessions=${results.old_sessions_deleted ?? 'err'}`
    );

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-cleanup' } });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
