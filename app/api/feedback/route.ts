import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const FeedbackSchema = z.object({
  message: z.string()
    .max(2000, 'Message too long (max 2000 characters).')
    .refine((s) => s.trim().length >= 5, 'Message must be at least 5 characters.'),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address.').nullable()
  ),
  type: z.enum(['feature', 'bug', 'support', 'feedback'] as const).catch('feedback'),
  page: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(200).regex(/^\/[\w/\-]*$/).nullable().catch(null)
  ),
});

// ── Allowed feedback types ────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
  support: 'Support request',
  feedback: 'Feedback',
};
const MAX_PAYLOAD_BYTES = 8_000; // 8 KB

async function sendNotificationEmail(fields: {
  type: string;
  message: string;
  email: string | null;
  page: string | null;
}) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const label = TYPE_LABELS[fields.type] ?? 'Feedback';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@mail.airwaylab.app>',
        to: ['dev@airwaylab.app'],
        subject: `${label}: ${fields.message.slice(0, 60)}${fields.message.length > 60 ? '...' : ''}`,
        text: [
          `New ${label.toLowerCase()} on airwaylab.app`,
          '',
          `Type: ${label}`,
          `Page: ${fields.page ?? '\u2014'}`,
          `Email: ${fields.email ?? '\u2014'}`,
          '',
          `Message:`,
          fields.message,
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[feedback] Resend error:', res.status, body);
    }
  } catch (err) {
    console.error('[feedback] Notification email failed:', err);
  }
}

/**
 * POST /api/feedback
 *
 * Accepts feedback, feature requests, and support messages.
 * Stores in Supabase `feedback` table. No account required.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.warn(`[feedback] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.warn(`[feedback] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { message, email, type: cleanType, page: cleanPage } = parsed.data;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('feedback').insert({
        message: `[${cleanType}] ${message.trim()}`,
        email: email?.trim() || null,
        page: cleanPage,
      });

      if (error) {
        console.error('[feedback] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'feedback' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
      // Fire-and-forget notification email
      sendNotificationEmail({
        type: cleanType,
        message: message.trim(),
        email: email?.trim() || null,
        page: cleanPage,
      });
    } else {
      console.info(`[feedback] ${cleanType}: ${message.slice(0, 100)} (Supabase not configured)`);
    }

    // Distinguish unsupported oximetry format requests from general feedback
    const isFormatRequest = message.startsWith('Oximetry format request');
    const alertType = isFormatRequest ? 'unsupported_format' : cleanType;
    const alertLevel = isFormatRequest || cleanType === 'bug' ? 'warning' : 'info';

    // Alert via Sentry so new submissions show up on our radar
    Sentry.captureMessage(`New ${alertType} submission`, {
      level: alertLevel,
      tags: { route: 'feedback', feedback_type: alertType },
      extra: {
        message: message.trim().slice(0, 500),
        page: cleanPage,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'feedback' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
