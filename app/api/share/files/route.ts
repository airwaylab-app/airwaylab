import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const SHARED_FILES_BUCKET = 'shared-files';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB total per share
const SIGNED_URL_TTL = 300; // 5 minutes

const presignLimiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });
const downloadLimiter = new RateLimiter({ windowMs: 3_600_000, max: 50 });

// ── Schemas ──────────────────────────────────────────────────

const PresignFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
});

const PresignRequestSchema = z.object({
  shareId: z.string().uuid(),
  files: z.array(PresignFileSchema).min(1).max(500),
});

const FinaliseSchema = z.object({
  shareId: z.string().uuid(),
  filePaths: z.array(z.string().min(1)).min(1),
});

// ── Helpers ──────────────────────────────────────────────────

function isSafeFileName(name: string): boolean {
  return (
    !name.includes('..') &&
    !name.includes('/') &&
    !name.includes('\\') &&
    name.length > 0 &&
    name.length <= 255
  );
}

/**
 * POST /api/share/files
 *
 * Generate presigned upload URLs for share files.
 * Requires authentication. Rate limited to 5/hour per user.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await presignLimiter.isLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many file uploads. Please try again later.' },
        { status: 429 }
      );
    }

    // Auth check
    const supabaseAuth = getSupabaseServer();
    if (!supabaseAuth) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const body = await request.json();
    const parsed = PresignRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { shareId, files } = parsed.data;

    // Validate total size
    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    if (totalSize > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: 'Total file size exceeds 500 MB limit.' },
        { status: 413 }
      );
    }

    // Verify share exists and belongs to this user
    const { data: share, error: shareError } = await serviceRole
      .from('shared_analyses')
      .select('id, created_by_user_id, expires_at')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.created_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    // Validate filenames
    for (const file of files) {
      if (!isSafeFileName(file.fileName)) {
        return NextResponse.json(
          { error: `Invalid file name: ${file.fileName}` },
          { status: 400 }
        );
      }
    }

    // Generate presigned upload URLs
    const uploadUrls: { fileName: string; uploadUrl: string; storagePath: string }[] = [];

    for (const file of files) {
      const storagePath = `${shareId}/${file.fileName}`;
      const { data: signedData, error: signError } = await serviceRole.storage
        .from(SHARED_FILES_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (signError || !signedData) {
        console.error(`[share/files] Failed to create upload URL for ${storagePath}:`, signError?.message);
        Sentry.captureException(signError, { tags: { route: 'share-files-presign' } });
        return NextResponse.json(
          { error: 'Could not prepare file upload. Please try again.' },
          { status: 500 }
        );
      }

      uploadUrls.push({
        fileName: file.fileName,
        uploadUrl: signedData.signedUrl,
        storagePath,
      });
    }

    return NextResponse.json({ uploadUrls }, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'share-files-presign' } });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share/files?shareId={id}
 *
 * Return signed download URLs for a shared analysis's files.
 * No authentication required (anyone with the share link can view).
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getRateLimitKey(request);
    if (await downloadLimiter.isLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const shareId = request.nextUrl.searchParams.get('shareId');
    if (!shareId || !z.string().uuid().safeParse(shareId).success) {
      return NextResponse.json({ error: 'Invalid share ID' }, { status: 400 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // Verify share exists, has files, and is not expired
    const { data: share, error: shareError } = await serviceRole
      .from('shared_analyses')
      .select('id, has_files, file_paths, expires_at')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 404 });
    }

    if (!share.has_files || !Array.isArray(share.file_paths) || share.file_paths.length === 0) {
      return NextResponse.json({ error: 'No files available for this share' }, { status: 404 });
    }

    // Generate signed download URLs for each file
    const filePaths = share.file_paths as string[];
    const downloadUrls: { fileName: string; downloadUrl: string }[] = [];

    for (const storagePath of filePaths) {
      const { data: signedData, error: signError } = await serviceRole.storage
        .from(SHARED_FILES_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL);

      if (signError || !signedData) {
        console.error(`[share/files] Failed to create download URL for ${storagePath}:`, signError?.message);
        continue; // Skip failed files, return what we can
      }

      const fileName = storagePath.split('/').pop() ?? storagePath;
      downloadUrls.push({
        fileName,
        downloadUrl: signedData.signedUrl,
      });
    }

    if (downloadUrls.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate download links. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ downloadUrls }, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'share-files-download' } });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/share/files
 *
 * Finalise file upload — set has_files = true and store file_paths.
 * Requires authentication.
 */
export async function PATCH(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    // Auth check
    const supabaseAuth = getSupabaseServer();
    if (!supabaseAuth) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const body = await request.json();
    const parsed = FinaliseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { shareId, filePaths } = parsed.data;

    // Verify share exists and belongs to this user
    const { data: share, error: shareError } = await serviceRole
      .from('shared_analyses')
      .select('id, created_by_user_id')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    if (share.created_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update share record
    const { error: updateError } = await serviceRole
      .from('shared_analyses')
      .update({
        has_files: true,
        file_paths: filePaths,
      })
      .eq('id', shareId);

    if (updateError) {
      console.error('[share/files] Finalise update error:', updateError.message);
      Sentry.captureException(updateError, { tags: { route: 'share-files-finalise' } });
      return NextResponse.json(
        { error: 'Could not finalise upload. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'share-files-finalise' } });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
