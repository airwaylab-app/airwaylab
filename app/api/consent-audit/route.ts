import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/require-auth';
import { validateOrigin } from '@/lib/csrf';
import { captureApiError } from '@/lib/sentry-utils';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import crypto from 'crypto';

const rateLimiter = new RateLimiter({ max: 30, windowMs: 3600_000 });

const ConsentAuditSchema = z.object({
  consentType: z.enum(['ai_insights', 'data_contribution', 'cloud_storage', 'email_notifications']),
  action: z.enum(['granted', 'withdrawn']),
});

/**
 * POST /api/consent-audit
 *
 * Records a consent action in the audit trail for GDPR compliance.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const rateLimitKey = getRateLimitKey(request);
  if (await rateLimiter.isLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  let body: z.infer<typeof ConsentAuditSchema>;
  try {
    const raw = await request.json();
    const parsed = ConsentAuditSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Hash IP for audit without storing raw IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

  const userAgent = request.headers.get('user-agent') ?? 'unknown';

  const { error: insertError } = await supabase
    .from('consent_audit')
    .insert({
      user_id: user.id,
      consent_type: body.consentType,
      action: body.action,
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500),
    });

  if (insertError) {
    console.error('[consent-audit] Insert failed:', insertError.message);
    captureApiError(insertError, { route: 'consent-audit' });
    return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
