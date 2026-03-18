import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { requireAuthWithServiceRole } from '@/lib/api/require-auth';
import { captureError } from '@/lib/sentry-utils';

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

  const auth = await requireAuthWithServiceRole();
  if (auth.error) return auth.error;
  const { user, serviceRole } = auth;

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
    Sentry.captureMessage(`Account deletion requested by ${user.email}`, {
      level: 'info',
      tags: { route: 'request-account-deletion' },
      extra: { userId: user.id, email: user.email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    captureError(err, 'request-account-deletion');
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
