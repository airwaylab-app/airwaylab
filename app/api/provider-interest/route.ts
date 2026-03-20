import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';
import { sendEmail } from '@/lib/email/send';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const ProviderInterestSchema = z.object({
  name: z.string()
    .max(100, 'Name too long (max 100 characters).')
    .refine((s) => s.trim().length >= 2, 'Name must be at least 2 characters.'),
  email: z.string().min(1).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'),
  practiceType: z.enum(['independent_sleep_consultant', 'respiratory_therapist', 'sleep_physician', 'other'] as const).nullable().catch(null),
  message: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(2000, 'Message too long (max 2000 characters).').nullable()
  ),
});

const PRACTICE_TYPE_LABELS: Record<string, string> = {
  independent_sleep_consultant: 'Independent Sleep Consultant',
  respiratory_therapist: 'Respiratory Therapist',
  sleep_physician: 'Sleep Physician',
  other: 'Other',
};

const MAX_PAYLOAD_BYTES = 8_000; // 8 KB

/**
 * POST /api/provider-interest
 *
 * Accepts provider interest form submissions.
 * No auth required. Rate limited to 5/hour per IP.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.error(`[provider-interest] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = ProviderInterestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, practiceType: cleanPracticeType, message } = parsed.data;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('provider_interest').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        practice_type: cleanPracticeType,
        message: message?.trim() || null,
      });

      if (error) {
        console.error('[provider-interest] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'provider-interest' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }

      // Fire-and-forget notification email
      void sendEmail({
        to: 'dev@airwaylab.app',
        subject: `New provider interest: ${name.trim()}`,
        text: [
          'New provider interest submission on airwaylab.app/providers',
          '',
          `Name: ${name.trim()}`,
          `Email: ${email.trim().toLowerCase()}`,
          `Practice type: ${cleanPracticeType ? PRACTICE_TYPE_LABELS[cleanPracticeType] ?? cleanPracticeType : '\u2014'}`,
          `Message: ${message?.trim() ?? '\u2014'}`,
        ].join('\n'),
        metadata: { emailType: 'admin_provider_interest' },
      });
    } else {
      console.error('[provider-interest] Supabase not configured -- submission not stored');
    }

    Sentry.captureMessage('New provider interest submission', {
      level: 'info',
      tags: { route: 'provider-interest', practice_type: cleanPracticeType ?? 'none' },
      extra: {
        name: name.trim(),
        emailDomain: email.split('@')[1],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'provider-interest' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
