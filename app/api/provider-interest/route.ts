import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const PRACTICE_TYPE_LABELS: Record<string, string> = {
  independent_sleep_consultant: 'Independent Sleep Consultant',
  respiratory_therapist: 'Respiratory Therapist',
  sleep_physician: 'Sleep Physician',
  other: 'Other',
};

async function sendNotificationEmail(fields: {
  name: string;
  email: string;
  practiceType: string | null;
  message: string | null;
}) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@airwaylab.app>',
        to: ['dev@airwaylab.app'],
        subject: `New provider interest: ${fields.name}`,
        text: [
          `New provider interest submission on airwaylab.app/providers`,
          '',
          `Name: ${fields.name}`,
          `Email: ${fields.email}`,
          `Practice type: ${fields.practiceType ? PRACTICE_TYPE_LABELS[fields.practiceType] ?? fields.practiceType : '—'}`,
          `Message: ${fields.message ?? '—'}`,
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[provider-interest] Resend error:', res.status, body);
    }
  } catch (err) {
    // Non-critical — don't fail the request if notification fails
    console.error('[provider-interest] Notification email failed:', err);
  }
}

const MAX_PAYLOAD_BYTES = 8_000; // 8 KB
const ALLOWED_PRACTICE_TYPES = [
  'independent_sleep_consultant',
  'respiratory_therapist',
  'sleep_physician',
  'other',
] as const;

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
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { name, email, practiceType, message } = body as {
      name: unknown;
      email: unknown;
      practiceType?: unknown;
      message?: unknown;
    };

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters.' },
        { status: 400 }
      );
    }
    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name too long (max 100 characters).' },
        { status: 400 }
      );
    }

    // Validate email
    if (
      !email ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Validate practiceType (optional)
    const cleanPracticeType =
      typeof practiceType === 'string' &&
      (ALLOWED_PRACTICE_TYPES as readonly string[]).includes(practiceType)
        ? practiceType
        : null;

    // Validate message (optional)
    if (message !== undefined && message !== null && message !== '') {
      if (typeof message !== 'string' || message.length > 2000) {
        return NextResponse.json(
          { error: 'Message too long (max 2000 characters).' },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('provider_interest').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        practice_type: cleanPracticeType,
        message: typeof message === 'string' ? message.trim() || null : null,
      });

      if (error) {
        console.error('[provider-interest] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'provider-interest' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }

      // Fire-and-forget notification email
      sendNotificationEmail({
        name: (name as string).trim(),
        email: (email as string).trim().toLowerCase(),
        practiceType: cleanPracticeType,
        message: typeof message === 'string' ? message.trim() || null : null,
      });
    } else {
      console.error('[provider-interest] Supabase not configured — submission not stored');
    }

    Sentry.captureMessage('New provider interest submission', {
      level: 'info',
      tags: { route: 'provider-interest', practice_type: cleanPracticeType ?? 'none' },
      extra: {
        name: (name as string).trim(),
        emailDomain: (email as string).split('@')[1],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'provider-interest' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
