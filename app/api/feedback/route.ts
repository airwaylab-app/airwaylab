import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── Rate limiter (per-IP, 5 submissions per hour) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ── Allowed feedback types ────────────────────────────────────
const ALLOWED_TYPES = ['feature', 'bug', 'support', 'feedback'] as const;
const MAX_PAYLOAD_BYTES = 8_000; // 8 KB

/**
 * POST /api/feedback
 *
 * Accepts feedback, feature requests, and support messages.
 * Stores in Supabase `feedback` table. No account required.
 */
export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
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
    const { message, email, type, page } = body as {
      message: unknown;
      email?: unknown;
      type?: unknown;
      page?: unknown;
    };

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json(
        { error: 'Message must be at least 5 characters.' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters).' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
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
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[feedback] ${cleanType}: ${message.slice(0, 100)} (Supabase not configured)`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
