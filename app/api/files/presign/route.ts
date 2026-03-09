import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { getUserTier, getStorageUsage, hasStorageConsent } from '@/lib/storage/quota';
import { STORAGE_BUCKET, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 500 });

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

    // Check consent
    const consent = await hasStorageConsent(serviceRole, user.id);
    if (!consent) {
      return NextResponse.json({ error: 'Storage consent not granted' }, { status: 403 });
    }

    // Check tier & quota
    const tier = await getUserTier(serviceRole, user.id);
    if (tier === 'community') {
      return NextResponse.json({ error: 'Cloud storage requires a Supporter or Champion subscription' }, { status: 403 });
    }

    const usage = await getStorageUsage(serviceRole, user.id, tier);
    if (usage.remainingBytes < fileSize) {
      return NextResponse.json({
        error: 'Storage quota exceeded',
        usage: { totalBytes: usage.totalBytes, quotaBytes: usage.quotaBytes },
      }, { status: 413 });
    }

    // Dedup: check if file with same hash already exists
    const { data: existing } = await serviceRole
      .from('user_files')
      .select('id, storage_path')
      .eq('user_id', user.id)
      .eq('file_hash', fileHash)
      .eq('file_path', filePath)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ skipped: true, fileId: existing.id });
    }

    // Build storage path: {user_id}/{nightDate or __shared__}/{fileName}
    const dateFolder = nightDate ?? '__shared__';
    const storagePath = `${user.id}/${dateFolder}/${fileName}`;

    // Determine if file format is supported
    const ext = fileName.includes('.') ? `.${fileName.split('.').pop()?.toLowerCase()}` : '';
    const isSupported = SUPPORTED_EXTENSIONS.has(ext);

    // Insert metadata row (pre-upload to reserve the slot)
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
    Sentry.captureException(err, { tags: { route: 'files/presign' } });
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}
