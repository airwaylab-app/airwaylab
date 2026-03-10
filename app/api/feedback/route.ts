import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

// ── Allowed feedback types ────────────────────────────────────
const ALLOWED_TYPES = ['feature', 'bug', 'support', 'feedback'] as const;
const MAX_PAYLOAD_BYTES = 8_000; // 8 KB

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
    if (limiter.isLimited(ip)) {
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

    const body = await request.json();
    const { message, email, type, page } = body as {
      message: unknown;
      email?: unknown;
      type?: unknown;
      page?: unknown;
    };

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      console.warn('[feedback] 400 message too short');
      return NextResponse.json(
        { error: 'Message must be at least 5 characters.' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      console.warn('[feedback] 400 message too long');
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters).' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        console.warn('[feedback] 400 invalid email');
        return NextResponse.json(
          { error: 'Invalid email address.' },
          { status: 400 }
        );
      }
    }

    // Sanitize type — only allow known values
    const cleanType = typeof type === 'string' && (ALLOWED_TYPES as readonly string[]).includes(type)
      ? type
      : 'feedback';

    // Sanitize page — only allow path-like strings, max 200 chars
    const cleanPage = typeof page === 'string' && page.length <= 200 && /^\/[\w/\-]*$/.test(page)
      ? page
      : null;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('feedback').insert({
        message: `[${cleanType}] ${message.trim()}`,
        email: typeof email === 'string' ? email.trim() || null : null,
        page: cleanPage,
      });

      if (error) {
        console.error('[feedback] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'feedback' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[feedback] ${cleanType}: ${message.slice(0, 100)} (Supabase not configured)`);
    }

    // Alert via Sentry so new submissions show up on our radar
    Sentry.captureMessage(`New ${cleanType} submission`, {
      level: cleanType === 'bug' ? 'warning' : 'info',
      tags: { route: 'feedback', feedback_type: cleanType },
      extra: {
        message: message.trim().slice(0, 500),
        email: typeof email === 'string' ? email.trim() || null : null,
        page: cleanPage,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'feedback' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
