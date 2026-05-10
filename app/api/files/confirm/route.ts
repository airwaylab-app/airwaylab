import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 2000 });

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
    const { data: storageFile, error: listError } = await serviceRole.storage
      .from(STORAGE_BUCKET)
      .list(fileRow.storage_path.split('/').slice(0, -1).join('/'), {
        search: fileRow.storage_path.split('/').pop(),
      });

    if (listError) {
      // Storage list failed — cannot determine file presence; do not delete metadata
      console.error('[files/confirm] Storage list error:', listError);
      captureApiError(listError, { route: 'files/confirm', context: 'storage_list' });
      return NextResponse.json({ error: 'Storage unavailable. Please retry.' }, { status: 503 });
    }

    if (!storageFile || storageFile.length === 0) {
      // File absent from storage despite PUT succeeding — capture for diagnosis before cleanup
      captureApiError(new Error('File absent from storage at confirm step'), {
        route: 'files/confirm',
        context: 'storage_list_empty',
        fileId,
        storagePath: fileRow.storage_path,
      });
      await serviceRole.from('user_files').delete().eq('id', fileId);
      return NextResponse.json({ error: 'Upload not found in storage. Metadata cleaned up.' }, { status: 404 });
    }

    // Mark upload as confirmed — only confirmed rows are returned by check-hashes
    const { error: updateError } = await serviceRole
      .from('user_files')
      .update({ upload_confirmed: true })
      .eq('id', fileId);

    if (updateError) {
      console.error('[files/confirm] Metadata update failed:', updateError);
      captureApiError(updateError, { route: 'files/confirm', context: 'metadata_update', fileId });
      return NextResponse.json({ error: 'Failed to confirm upload. Please retry.' }, { status: 500 });
    }

    return NextResponse.json({ confirmed: true });
  } catch (err) {
    console.error('[files/confirm] Error:', err);
    captureApiError(err, { route: 'files/confirm' });
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 });
  }
}
