import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
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

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Some consent types are also load-bearing enforcement flags on the profile: the
  // relevant route reads the flag (service-role) and refuses processing when it is
  // false (ai-insights refuses to send PHI to Anthropic; contribute-* refuses to store
  // research contributions). Reflect grant/withdrawal onto the flag so the audit event
  // and the enforced flag stay in sync.
  const PROFILE_FLAG: Partial<Record<typeof body.consentType, { col: string; atCol: string }>> = {
    ai_insights: { col: 'ai_insights_consent', atCol: 'ai_insights_consent_at' },
    data_contribution: { col: 'data_contribution_consent', atCol: 'data_contribution_consent_at' },
  };
  const flag = PROFILE_FLAG[body.consentType];
  if (flag) {
    const granted = body.action === 'granted';
    // profiles UPDATE is service-role-only (migration 055 locks direct authenticated
    // writes to profiles), so use the service-role client for the flag write.
    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }
    const { error: profileError } = await serviceRole
      .from('profiles')
      .update({
        [flag.col]: granted,
        [flag.atCol]: granted ? new Date().toISOString() : null,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[consent-audit] consent flag update failed:', profileError.message);
      captureApiError(profileError, { route: 'consent-audit' });
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
