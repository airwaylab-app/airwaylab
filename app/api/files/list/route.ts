import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { requireAuthWithServiceRole } from '@/lib/api/require-auth';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { getUserTier, getStorageUsage } from '@/lib/storage/quota';
import type { StoredFileMetadata } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 60 });

/**
 * List stored files for the authenticated user.
 * Optional: ?nightDate=YYYY-MM-DD to filter to a specific night.
 */
export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await requireAuthWithServiceRole();
  if (auth.error) return auth.error;
  const { user, serviceRole } = auth;

  try {
    const nightDate = request.nextUrl.searchParams.get('nightDate');
    if (nightDate && !/^\d{4}-\d{2}-\d{2}$/.test(nightDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    let query = serviceRole
      .from('user_files')
      .select('id, night_date, file_path, storage_path, file_name, file_size, file_hash, is_supported, uploaded_at')
      .eq('user_id', user.id)
      .order('night_date', { ascending: false, nullsFirst: false })
      .order('file_name');

    if (nightDate) {
      // Include both night-specific files and shared files (STR.edf etc.)
      query = query.or(`night_date.eq.${nightDate},night_date.is.null`);
    }

    const { data: files, error } = await query;
    if (error) throw error;

    const mapped: StoredFileMetadata[] = (files ?? []).map(f => ({
      id: f.id,
      nightDate: f.night_date,
      filePath: f.file_path,
      storagePath: f.storage_path,
      fileName: f.file_name,
      fileSize: f.file_size,
      fileHash: f.file_hash,
      isSupported: f.is_supported,
      uploadedAt: f.uploaded_at,
    }));

    // Include usage info
    const tier = await getUserTier(serviceRole, user.id);
    const usage = await getStorageUsage(serviceRole, user.id, tier);

    return NextResponse.json({ files: mapped, usage });
  } catch (err) {
    console.error('[files/list] Error:', err);
    captureApiError(err, { route: 'files/list' });
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
