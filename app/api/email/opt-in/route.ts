import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { cancelAllPending } from '@/lib/email/sequences';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });

const OptInSchema = z.object({
  opt_in: z.boolean(),
});

/**
 * POST /api/email/opt-in
 *
 * Toggles email_opt_in for the authenticated user.
 * On opt-in: sets the flag (sequences are scheduled by triggers, not here).
 * On opt-out: cancels all pending email sequences.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const ip = getRateLimitKey(request);
  if (await limiter.isLimited(ip)) {
    console.error('[email/opt-in] 429 rate limited', { ip });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const supabaseAuth = await getSupabaseServer();
  if (!supabaseAuth) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = OptInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { opt_in } = parsed.data;

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_opt_in: opt_in })
      .eq('id', user.id);

    if (updateError) {
      console.error('[email/opt-in] Profile update failed:', updateError.message);
      Sentry.captureException(updateError, { tags: { route: 'email-opt-in', action: 'profile-update' } });
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
    }

    if (!opt_in) {
      // Cancel all pending sequences
      await cancelAllPending(supabase, user.id);
    }

    return NextResponse.json({ ok: true, email_opt_in: opt_in });
  } catch (err) {
    console.error('[email/opt-in] Error:', err);
    Sentry.captureException(err, { tags: { route: 'email-opt-in' } });
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
  }
}
