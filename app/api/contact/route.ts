import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const ContactSchema = z.object({
  email: z.string().min(1).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'A valid email address is required.'),
  message: z.string()
    .max(2000, 'Message too long (max 2000 characters).')
    .refine((s) => s.trim().length >= 10, 'Message must be at least 10 characters.'),
  name: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
    z.string().max(100).nullable()
  ),
  category: z.enum(['general', 'privacy', 'billing', 'accessibility', 'security'] as const).catch('general'),
});

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  privacy: 'Privacy & Data',
  billing: 'Billing',
  accessibility: 'Accessibility',
  security: 'Security',
};
const MAX_PAYLOAD_BYTES = 8_000;

async function sendNotificationEmail(fields: {
  category: string;
  name: string | null;
  email: string;
  message: string;
}) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const label = CATEGORY_LABELS[fields.category] ?? 'General';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@mail.airwaylab.app>',
        to: ['dev@airwaylab.app'],
        reply_to: fields.email,
        subject: `[${label}] ${fields.message.slice(0, 60)}${fields.message.length > 60 ? '...' : ''}`,
        text: [
          `New contact form submission on airwaylab.app`,
          '',
          `Category: ${label}`,
          `Name: ${fields.name ?? '\u2014'}`,
          `Email: ${fields.email}`,
          '',
          `Message:`,
          fields.message,
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[contact] Resend error:', res.status, body);
    }
  } catch (err) {
    console.error('[contact] Notification email failed:', err);
  }
}

/**
 * POST /api/contact
 *
 * Contact form submissions. Stores in Supabase `feedback` table and sends
 * notification email via Resend. No account required.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.warn(`[contact] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.warn(`[contact] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, message, name: cleanName, category: cleanCategory } = parsed.data;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('feedback').insert({
        message: `[contact:${cleanCategory}] ${cleanName ? `${cleanName}: ` : ''}${message.trim()}`,
        email: email.trim().toLowerCase(),
        page: '/contact',
      });

      if (error) {
        console.error('[contact] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'contact' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }

      // Fire-and-forget notification email
      sendNotificationEmail({
        category: cleanCategory,
        name: cleanName,
        email: email.trim().toLowerCase(),
        message: message.trim(),
      });
    } else {
      console.info(`[contact] ${cleanCategory}: ${message.slice(0, 100)} (Supabase not configured)`);
    }

    Sentry.captureMessage(`New contact form: ${cleanCategory}`, {
      level: cleanCategory === 'security' ? 'warning' : 'info',
      tags: { route: 'contact', contact_category: cleanCategory },
      extra: {
        message: message.trim().slice(0, 500),
        category: cleanCategory,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contact' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
