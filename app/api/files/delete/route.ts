import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 30 });

const deleteSchema = z.union([
  z.object({ fileIds: z.array(z.string().uuid()).min(1).max(500) }),
  z.object({ nightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ deleteAll: z.literal(true) }),
]);

/**
 * Delete stored files. Supports:
 * - { fileIds: string[] } — delete specific files
 * - { nightDate: string } — delete all files for a night
 * - { deleteAll: true } — delete everything
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
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const input = parsed.data;

    // Get files to delete
    let query = serviceRole
      .from('user_files')
      .select('id, storage_path')
      .eq('user_id', user.id);

    if ('fileIds' in input) {
      query = query.in('id', input.fileIds);
    } else if ('nightDate' in input) {
      query = query.eq('night_date', input.nightDate);
    }
    // deleteAll: no additional filter needed

    const { data: files, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!files || files.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete from storage
    const storagePaths = files.map(f => f.storage_path);
    const { error: storageError } = await serviceRole.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error('[files/delete] Storage deletion error:', storageError);
      // Continue with metadata cleanup even if storage delete partially fails
    }

    // Delete metadata rows
    const fileIds = files.map(f => f.id);
    const { error: dbError } = await serviceRole
      .from('user_files')
      .delete()
      .in('id', fileIds);

    if (dbError) throw dbError;

    return NextResponse.json({ deleted: files.length });
  } catch (err) {
    console.error('[files/delete] Error:', err);
    captureApiError(err, { route: 'files/delete' });
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
  }
}
