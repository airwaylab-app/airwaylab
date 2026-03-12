import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { STORAGE_BUCKET } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 200 });

/**
 * Download a stored file. Returns a signed URL for direct download.
 * ?id={fileId} — download by file ID
 */
export async function GET(request: NextRequest) {
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
    const fileId = request.nextUrl.searchParams.get('id');
    if (!fileId) {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    // Verify file belongs to this user
    const { data: fileRow, error: fetchError } = await serviceRole
      .from('user_files')
      .select('storage_path, user_id, file_name')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileRow) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create a signed URL (60 seconds)
    const { data: signedUrl, error: signError } = await serviceRole.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(fileRow.storage_path, 60);

    if (signError || !signedUrl) {
      throw signError ?? new Error('Failed to create signed URL');
    }

    return NextResponse.json({ url: signedUrl.signedUrl, fileName: fileRow.file_name });
  } catch (err) {
    console.error('[files/download] Error:', err);
    captureApiError(err, { route: 'files/download' });
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
