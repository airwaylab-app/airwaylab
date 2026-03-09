import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 100 });

const schema = z.object({
  hashes: z.array(z.object({
    filePath: z.string(),
    fileHash: z.string().length(64),
  })).max(2000),
});

/**
 * Batch dedup check. Returns which file hashes already exist for this user.
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { hashes } = parsed.data;
    if (hashes.length === 0) {
      return NextResponse.json({ existing: [] });
    }

    // Query all user's file hashes in one go
    const hashValues = hashes.map(h => h.fileHash);
    const { data: existingFiles, error } = await serviceRole
      .from('user_files')
      .select('file_hash, file_path')
      .eq('user_id', user.id)
      .in('file_hash', hashValues);

    if (error) throw error;

    // Build a set of existing hash+path combos
    const existingSet = new Set(
      (existingFiles ?? []).map(f => `${f.file_hash}|${f.file_path}`)
    );

    // Return which input hashes already exist
    const existing = hashes
      .filter(h => existingSet.has(`${h.fileHash}|${h.filePath}`))
      .map(h => h.fileHash);

    return NextResponse.json({ existing });
  } catch (err) {
    console.error('[files/check-hashes] Error:', err);
    Sentry.captureException(err, { tags: { route: 'files/check-hashes' } });
    return NextResponse.json({ error: 'Failed to check hashes' }, { status: 500 });
  }
}
