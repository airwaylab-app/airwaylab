import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const rateLimiter = new RateLimiter({ max: 60, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const rateLimitKey = getRateLimitKey(request);
  if (await rateLimiter.isLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // Query user_files: count and sum of file_size
    const { count: fileCount, error: filesError } = await serviceRole
      .from('user_files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (filesError) {
      Sentry.captureException(filesError, {
        extra: { userId: user.id, step: 'query_user_files' },
      });
    }

    // Query user_storage_usage: total_bytes and file_count
    const { data: storageData, error: storageError } = await serviceRole
      .from('user_storage_usage')
      .select('total_bytes, file_count')
      .eq('user_id', user.id)
      .single();

    if (storageError && storageError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      Sentry.captureException(storageError, {
        extra: { userId: user.id, step: 'query_user_storage_usage' },
      });
    }

    // Query analysis_data: count nights
    const { count: nightCount, error: analysisError } = await serviceRole
      .from('analysis_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (analysisError) {
      Sentry.captureException(analysisError, {
        extra: { userId: user.id, step: 'query_analysis_data' },
      });
    }

    return NextResponse.json({
      fileCount: storageData?.file_count ?? fileCount ?? 0,
      totalBytes: storageData?.total_bytes ?? 0,
      nightCount: nightCount ?? 0,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
