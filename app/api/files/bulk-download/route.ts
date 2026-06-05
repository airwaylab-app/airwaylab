import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { STORAGE_BUCKET } from '@/lib/storage/types';

/**
 * GET /api/files/bulk-download
 *
 * GDPR Art 20 data portability: lets a user retrieve ALL of their own cloud
 * data in one request — short-lived signed URLs for every raw device file
 * plus their full analysis (user_nights) as portable JSON.
 *
 * Returns a manifest (not a binary archive) so the function stays within
 * memory/time limits; the client downloads each file via its signed URL.
 * Scoped strictly to the authenticated user — never another user's data.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });
const SIGNED_URL_TTL = 600; // seconds the download links stay valid

export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = await getSupabaseServer();
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

  try {
    // 1. Enumerate this user's own raw files (strictly user-scoped).
    const { data: fileRows, error: filesError } = await serviceRole
      .from('user_files')
      .select('id, night_date, file_path, storage_path, file_name, file_size')
      .eq('user_id', user.id)
      .order('night_date', { ascending: true });
    if (filesError) throw filesError;

    // 2. Sign all paths in one batch (short-lived links).
    const signedByPath = new Map<string, string>();
    const paths = (fileRows ?? []).map((f) => f.storage_path);
    if (paths.length > 0) {
      const { data: signed, error: signError } = await serviceRole.storage
        .from(STORAGE_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      if (signError) throw signError;
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }
    }

    const files = (fileRows ?? []).map((f) => ({
      name: f.file_name,
      originalPath: f.file_path,
      nightDate: f.night_date,
      sizeBytes: f.file_size,
      url: signedByPath.get(f.storage_path) ?? null,
    }));

    // 3. The user's full analysis as portable JSON.
    const { data: nightRows, error: nightsError } = await serviceRole
      .from('user_nights')
      .select('night_date, analysis_data')
      .eq('user_id', user.id)
      .order('night_date', { ascending: true });
    if (nightsError) throw nightsError;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      urlTtlSeconds: SIGNED_URL_TTL,
      fileCount: files.length,
      files,
      nightCount: nightRows?.length ?? 0,
      analysis: nightRows ?? [],
    });
  } catch (err) {
    captureApiError(err, { route: 'files/bulk-download' });
    return NextResponse.json({ error: 'Failed to prepare data export' }, { status: 500 });
  }
}
