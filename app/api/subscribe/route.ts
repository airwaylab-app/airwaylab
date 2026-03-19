import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 60_000, max: 5 });

const SubscribeSchema = z.object({
  email: z.string().min(1).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
  source: z.enum(['hero', 'post-analysis', 'footer', 'inline', 'about', 'unknown']).catch('unknown'),
});

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      Sentry.logger.warn('[subscribe] 429 rate limited', { ip });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      Sentry.logger.warn('[subscribe] 400 invalid payload');
      return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
    }

    const cleanEmail = parsed.data.email.trim().toLowerCase();
    const cleanSource = parsed.data.source;

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
      Sentry.logger.info('[subscribe] Supabase not configured', { email: cleanEmail, source: cleanSource });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'subscribe' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
