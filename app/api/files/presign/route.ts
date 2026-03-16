import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { hasStorageConsent } from '@/lib/storage/quota';
import { STORAGE_BUCKET, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 2000 });

const presignSchema = z.object({
  filePath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  fileHash: z.string().length(64),
  nightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  mimeType: z.string().max(100).nullable().optional(),
});

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
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { filePath, fileName, fileSize, fileHash, nightDate, mimeType } = parsed.data;

    // Path traversal protection
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }
    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Check consent — registration now covers storage consent
    const consent = await hasStorageConsent(serviceRole, user.id);
    if (!consent) {
      return NextResponse.json({ error: 'Storage consent not granted' }, { status: 403 });
    }

    // Storage is unlimited for all registered users — no tier gate or quota check

    // Dedup: check if file with same hash already exists
    const { data: existing } = await serviceRole
      .from('user_files')
      .select('id, storage_path, upload_confirmed, uploaded_at')
      .eq('user_id', user.id)
      .eq('file_hash', fileHash)
      .eq('file_path', filePath)
      .maybeSingle();

    if (existing) {
      // Unconfirmed rows older than 1 hour are definitively orphaned —
      // delete without checking storage (the PUT never completed)
      const ageMs = Date.now() - new Date(existing.uploaded_at).getTime();
      const isStaleOrphan = !existing.upload_confirmed && ageMs > 60 * 60 * 1000;

      if (isStaleOrphan) {
        await serviceRole.from('user_files').delete().eq('id', existing.id);
      } else if (existing.upload_confirmed) {
        // Confirmed row — verify file actually exists in storage
        const { data: storageFile } = await serviceRole.storage
          .from(STORAGE_BUCKET)
          .list(existing.storage_path.split('/').slice(0, -1).join('/'), {
            search: existing.storage_path.split('/').pop(),
          });

        if (storageFile && storageFile.length > 0) {
          return NextResponse.json({ skipped: true, fileId: existing.id });
        }

        // Storage file missing despite confirmed — delete orphaned row
        await serviceRole.from('user_files').delete().eq('id', existing.id);
      } else {
        // Unconfirmed but recent (< 1 hour) — another upload may be in progress.
        // Delete and re-create to avoid blocking this upload attempt.
        await serviceRole.from('user_files').delete().eq('id', existing.id);
      }
    }

    // Build storage path: {user_id}/{nightDate or __shared__}/{fileName}
    const dateFolder = nightDate ?? '__shared__';
    const storagePath = `${user.id}/${dateFolder}/${fileName}`;

    // Determine if file format is supported
    const ext = fileName.includes('.') ? `.${fileName.split('.').pop()?.toLowerCase()}` : '';
    const isSupported = SUPPORTED_EXTENSIONS.has(ext);

    // Insert metadata row (pre-upload to reserve the slot)
    // upload_confirmed = false until the confirm endpoint verifies the file in storage
    const { data: fileRow, error: insertError } = await serviceRole
      .from('user_files')
      .insert({
        user_id: user.id,
        night_date: nightDate,
        file_path: filePath,
        storage_path: storagePath,
        file_name: fileName,
        file_size: fileSize,
        file_hash: fileHash,
        mime_type: mimeType ?? null,
        is_supported: isSupported,
        upload_confirmed: false,
      })
      .select('id')
      .single();

    if (insertError) {
      // Unique constraint violation = file already uploaded
      if (insertError.code === '23505') {
        return NextResponse.json({ skipped: true });
      }
      throw insertError;
    }

    // Create signed upload URL (expires in 5 minutes)
    const { data: signedUrl, error: signError } = await serviceRole.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (signError || !signedUrl) {
      // Rollback metadata row
      await serviceRole.from('user_files').delete().eq('id', fileRow.id);
      throw signError ?? new Error('Failed to create signed upload URL');
    }

    return NextResponse.json({
      uploadUrl: signedUrl.signedUrl,
      storagePath,
      fileId: fileRow.id,
      token: signedUrl.token,
    });
  } catch (err) {
    console.error('[files/presign] Error:', err);
    captureApiError(err, { route: 'files/presign' });
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}
