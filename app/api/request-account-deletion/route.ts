import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

/** Account deletion requests: 3 per hour per IP */
const deletionRateLimiter = new RateLimiter({
  windowMs: 3_600_000,
  max: 3,
});

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Rate limiting
  const ip = getRateLimitKey(request);
  if (await deletionRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Auth check
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Insert deletion request via service role (bypasses RLS for write)
  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    const { error: insertError } = await serviceRole
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        status: 'pending',
      });

    if (insertError) {
      console.error('[request-account-deletion] Insert failed:', insertError.message);
      Sentry.captureException(insertError, {
        tags: { route: 'request-account-deletion' },
        extra: { userId: user.id },
      });
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    // Notify via Sentry so the team sees it in monitoring
    Sentry.captureMessage('Account deletion requested', {
      level: 'info',
      tags: { route: 'request-account-deletion' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'request-account-deletion' } });
    console.error('[request-account-deletion] Error:', err);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
