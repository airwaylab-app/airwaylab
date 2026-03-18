import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { requireAuthWithServiceRole } from '@/lib/api/require-auth';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 20 });

/**
 * GET: Check storage consent status
 * POST: Update storage consent (grant or revoke)
 */
export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await requireAuthWithServiceRole();
  if (auth.error) return auth.error;
  const { user, serviceRole } = auth;

  const { data } = await serviceRole
    .from('profiles')
    .select('storage_consent, storage_consent_at')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    consent: data?.storage_consent ?? false,
    consentAt: data?.storage_consent_at ?? null,
  });
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const ip = getRateLimitKey(request);
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await requireAuthWithServiceRole();
  if (auth.error) return auth.error;
  const { user, serviceRole } = auth;

  try {
    const body = await request.json();
    const consent = body.consent === true;

    const { error: updateError } = await serviceRole
      .from('profiles')
      .update({
        storage_consent: consent,
        storage_consent_at: consent ? new Date().toISOString() : null,
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ consent });
  } catch (err) {
    console.error('[files/consent] Error:', err);
    captureApiError(err, { route: 'files/consent' });
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
  }
}
