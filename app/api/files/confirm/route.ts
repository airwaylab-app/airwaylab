import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 500 });

const confirmSchema = z.object({
  fileId: z.string().uuid(),
});

/**
 * Confirms a file upload completed successfully.
 * Verifies the file exists in storage. If not, cleans up the metadata row.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const ip = getRateLimitKey(request);
  if (rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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

  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { fileId } = parsed.data;

    // Verify the file belongs to this user
    const { data: fileRow, error: fetchError } = await serviceRole
      .from('user_files')
      .select('id, storage_path, user_id')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRow) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify file exists in storage
    const { data: storageFile } = await serviceRole.storage
      .from(STORAGE_BUCKET)
      .list(fileRow.storage_path.split('/').slice(0, -1).join('/'), {
        search: fileRow.storage_path.split('/').pop(),
      });

    if (!storageFile || storageFile.length === 0) {
      // Upload didn't complete — clean up metadata
      await serviceRole.from('user_files').delete().eq('id', fileId);
      return NextResponse.json({ error: 'Upload not found in storage. Metadata cleaned up.' }, { status: 404 });
    }

    return NextResponse.json({ confirmed: true });
  } catch (err) {
    console.error('[files/confirm] Error:', err);
    Sentry.captureException(err, { tags: { route: 'files/confirm' } });
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 });
  }
}
