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
 * Verifies the file exists in storage. Returns 503 (retriable) if the storage
 * list does not yet show the object — the client retries confirm, giving the
 * eventually-consistent storage list more time to propagate. Rows that remain
 * unconfirmed > 10 minutes are cleaned up by the stale orphan logic in presign.
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
      .select('id, storage_path, user_id, file_size')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRow) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify file exists in storage. Retry on both list errors and empty results.
    // Supabase Storage can be eventually consistent after a signed PUT — the object
    // may not appear in a listing immediately after the upload completes, causing a
    // false-absent result that deletes the metadata row and surfaces as a client-side
    // cloud_upload_partial_failure event. Retrying with progressive delays handles
    // both transient list errors and propagation-delay empty results.
    const storageFolder = fileRow.storage_path.split('/').slice(0, -1).join('/');
    const storageFileName = fileRow.storage_path.split('/').pop();
    let storageFile: { name: string; metadata?: { size?: number } | null }[] | null = null;
    let listError: unknown = null;
    const LIST_DELAYS_MS = [0, 150, 300, 450];

    for (let attempt = 0; attempt < LIST_DELAYS_MS.length; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, LIST_DELAYS_MS[attempt]!));
      }
      const result = await serviceRole.storage
        .from(STORAGE_BUCKET)
        .list(storageFolder, { search: storageFileName });
      if (result.error) {
        listError = result.error;
        continue;
      }
      listError = null;
      if (result.data && result.data.length > 0) {
        storageFile = result.data;
        break;
      }
      // List succeeded but returned empty — possible propagation delay; retry
    }

    if (listError) {
      // Storage list failed after retries — cannot determine file presence; do not delete metadata
      console.error('[files/confirm] Storage list error:', listError);
      captureApiError(listError, { route: 'files/confirm', context: 'storage_list' });
      return NextResponse.json({ error: 'Storage unavailable. Please retry.' }, { status: 503 });
    }

    if (!storageFile || storageFile.length === 0) {
      // Storage list returned empty after all retries — the object may not have
      // propagated yet. Capture for diagnosis but do NOT delete the metadata row;
      // the client retries confirm on 5xx, extending the propagation window.
      // Stale unconfirmed rows (> 10 min) are cleaned up in /api/files/presign.
      captureApiError(new Error('File absent from storage at confirm step'), {
        route: 'files/confirm',
        context: 'storage_list_empty',
        fileId,
        storagePath: fileRow.storage_path,
      });
      return NextResponse.json(
        { error: 'File not yet visible in storage. Please retry.' },
        { status: 503 }
      );
    }

    // Reconcile actual stored size against the client-declared size.
    // Signed PUTs let a client declare a small `file_size` to pass the
    // upload-time Zod/API cap, then push a far larger object. Storage now
    // carries a bucket-level file_size_limit (migration 052), but we also
    // reject here when the listed object size exceeds what was declared.
    // Fail open when size metadata is unavailable (Storage list does not
    // always populate it, e.g. right after a propagation-delayed PUT).
    const actualSize = storageFile[0]?.metadata?.size;
    const declaredSize = fileRow.file_size;
    if (
      typeof actualSize === 'number' &&
      typeof declaredSize === 'number' &&
      actualSize > declaredSize
    ) {
      captureApiError(new Error('Uploaded object exceeds declared file_size'), {
        route: 'files/confirm',
        context: 'size_mismatch',
        fileId,
        storagePath: fileRow.storage_path,
        declaredSize: String(declaredSize),
        actualSize: String(actualSize),
      });
      // Remove the oversized object and its metadata row so it is not served.
      await serviceRole.storage.from(STORAGE_BUCKET).remove([fileRow.storage_path]);
      await serviceRole.from('user_files').delete().eq('id', fileId);
      return NextResponse.json(
        { error: 'Uploaded file is larger than declared. Upload rejected.' },
        { status: 413 }
      );
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
