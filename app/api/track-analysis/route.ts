import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });

const TrackAnalysisSchema = z.object({
  nightCount: z.number().int().min(1).max(1095),
  hasOximetry: z.boolean(),
  isDemo: z.boolean(),
  durationMs: z.number().optional(),
  glasgowAvg: z.number().optional(),
});

/**
 * POST /api/track-analysis
 *
 * Records an anonymous analysis session in Supabase.
 * Called once when analysis completes (not on demo loads).
 * No PII is collected -- just aggregate metrics.
 */
const MAX_PAYLOAD_BYTES = 4_000; // 4 KB

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.warn(`[track-analysis] 429 rate limited ip=${ip}`);
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.warn(`[track-analysis] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    const parsed = TrackAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      console.warn('[track-analysis] 400 invalid payload');
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { nightCount, hasOximetry, isDemo, durationMs, glasgowAvg } = parsed.data;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('analysis_sessions').insert({
        night_count: nightCount,
        has_oximetry: hasOximetry,
        is_demo: isDemo,
        duration_ms: durationMs ?? null,
        glasgow_avg: glasgowAvg ?? null,
        engines_used: ['glasgow', 'wat', 'ned', ...(hasOximetry ? ['oximetry'] : [])],
        user_agent: request.headers.get('user-agent')?.slice(0, 200) || null,
      });

      if (error) {
        console.error('[track-analysis] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'track-analysis' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(
        `[track-analysis] ${nightCount} nights tracked (Supabase not configured)`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'track-analysis' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
