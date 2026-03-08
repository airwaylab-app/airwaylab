import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── Rate limiter (per-IP, 10 tracks per hour) ──────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour
const RATE_LIMIT_MAX = 10;

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

/**
 * POST /api/track-analysis
 *
 * Records an anonymous analysis session in Supabase.
 * Called once when analysis completes (not on demo loads).
 * No PII is collected — just aggregate metrics.
 */
const MAX_PAYLOAD_BYTES = 4_000; // 4 KB

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await request.json();
    const {
      nightCount,
      hasOximetry,
      isDemo,
      durationMs,
      glasgowAvg,
    } = body as {
      nightCount: number;
      hasOximetry: boolean;
      isDemo: boolean;
      durationMs?: number;
      glasgowAvg?: number;
    };

    // Basic validation
    if (
      typeof nightCount !== 'number' ||
      nightCount < 1 ||
      nightCount > 365 ||
      typeof hasOximetry !== 'boolean' ||
      typeof isDemo !== 'boolean'
    ) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

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
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(
        `[track-analysis] ${nightCount} nights tracked (Supabase not configured)`
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
