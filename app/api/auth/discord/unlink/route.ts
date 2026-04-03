/**
 * Discord unlink endpoint.
 * Removes discord_id from the user's profile.
 * Does NOT remove the user from the Discord server or revoke roles.
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getUserRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });

export async function POST() {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Rate limit by authenticated user
  if (await limiter.isLimited(getUserRateLimitKey(user.id))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    const { error } = await serviceRole
      .from('profiles')
      .update({
        discord_id: null,
        discord_username: null,
        discord_linked_at: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('[discord-unlink] Failed:', error);
      Sentry.captureException(error, { tags: { action: 'discord-unlink' } });
      return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[discord-unlink] Unexpected error:', err);
    Sentry.captureException(err, { tags: { action: 'discord-unlink' } });
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
