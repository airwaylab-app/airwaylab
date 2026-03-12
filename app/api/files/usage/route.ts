import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { getUserTier, getStorageUsage } from '@/lib/storage/quota';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 60 });

/**
 * GET: Get storage usage for the authenticated user.
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
    const tier = await getUserTier(serviceRole, user.id);
    const usage = await getStorageUsage(serviceRole, user.id, tier);
    return NextResponse.json(usage);
  } catch (err) {
    console.error('[files/usage] Error:', err);
    captureApiError(err, { route: 'files/usage' });
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
  }
}
