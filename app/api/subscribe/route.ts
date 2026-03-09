import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── In-memory rate limiter (per-IP, resets on cold start) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max requests per window

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

// ── Email validation ───────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_EMAIL_LENGTH &&
    EMAIL_RE.test(value)
  );
}

// ── Allowed sources (prevent injection of arbitrary strings) ───────
const ALLOWED_SOURCES = ['hero', 'post-analysis', 'footer', 'inline', 'about'];

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      console.warn(`[subscribe] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse body with size guard
    const body = await request.json();
    const { email, source } = body as { email: unknown; source: unknown };

    if (!isValidEmail(email)) {
      console.warn(`[subscribe] 400 invalid email`);
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanSource =
      typeof source === 'string' && ALLOWED_SOURCES.includes(source)
        ? source
        : 'unknown';

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase
        .from('waitlist')
        .upsert(
          {
            email: cleanEmail,
            source: cleanSource,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );

      if (error) {
        console.error('[subscribe] Supabase error:', error.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[subscribe] ${cleanEmail} from ${cleanSource} (Supabase not configured)`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
