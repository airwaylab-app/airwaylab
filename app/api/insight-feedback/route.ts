import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── Rate limiter (per-IP, 20 feedback submissions per hour) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000;
const RATE_LIMIT_MAX = 20;

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

// ── Validation ───────────────────────────────────────────────
const VALID_RATINGS = new Set(['helpful', 'not_helpful']);
const VALID_SOURCES = new Set(['rule', 'ai']);
const VALID_CATEGORIES = new Set(['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend']);

interface InsightFeedbackBody {
  insightId: string;
  rating: 'helpful' | 'not_helpful';
  source: 'rule' | 'ai';
  category: string;
  /** Optional: the insight title for debugging/analysis */
  insightTitle?: string;
}

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10_000) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { insightId, rating, source, category, insightTitle } = body as InsightFeedbackBody;

    // Validate required fields
    if (typeof insightId !== 'string' || insightId.length === 0 || insightId.length > 100) {
      return NextResponse.json({ error: 'Invalid insightId.' }, { status: 400 });
    }
    if (!VALID_RATINGS.has(rating)) {
      return NextResponse.json({ error: 'Invalid rating.' }, { status: 400 });
    }
    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
    }

    const sanitizedTitle = typeof insightTitle === 'string'
      ? insightTitle.trim().slice(0, 200)
      : null;

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('insight_feedback').insert({
        insight_id: insightId,
        rating,
        source,
        category,
        insight_title: sanitizedTitle,
      });

      if (error) {
        console.error('[insight-feedback] Supabase error:', error.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[insight-feedback] Feedback received for ${insightId}: ${rating} (Supabase not configured)`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
