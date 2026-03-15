import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const ALLOWED_CATEGORIES = ['general', 'privacy', 'billing', 'accessibility', 'security'] as const;
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
        from: 'AirwayLab <noreply@airwaylab.app>',
        to: ['dev@airwaylab.app'],
        reply_to: fields.email,
        subject: `[${label}] ${fields.message.slice(0, 60)}${fields.message.length > 60 ? '...' : ''}`,
        text: [
          `New contact form submission on airwaylab.app`,
          '',
          `Category: ${label}`,
          `Name: ${fields.name ?? '—'}`,
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

    const body = await request.json();
    const { name, email, category, message } = body as {
      name?: unknown;
      email: unknown;
      category?: unknown;
      message: unknown;
    };

    // Validate email (required)
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters.' },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters).' },
        { status: 400 }
      );
    }

    // Sanitize category
    const cleanCategory =
      typeof category === 'string' && (ALLOWED_CATEGORIES as readonly string[]).includes(category)
        ? category
        : 'general';

    // Sanitize name
    const cleanName =
      typeof name === 'string' && name.trim().length > 0 && name.length <= 100
        ? name.trim()
        : null;

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
