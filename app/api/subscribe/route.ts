import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 60_000, max: 5 });

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

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (limiter.isLimited(ip)) {
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
        Sentry.captureException(error, { tags: { route: 'subscribe' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[subscribe] ${cleanEmail} from ${cleanSource} (Supabase not configured)`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'subscribe' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
