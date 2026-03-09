import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── Rate limiter (per-IP, 3 submissions per hour) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000;
const RATE_LIMIT_MAX = 3;

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

const MAX_PAYLOAD_BYTES = 256_000; // 256 KB

/**
 * POST /api/submit-error-data
 *
 * Accepts error reports when users try to upload unsupported data formats.
 * Stores file names, sizes, error message, and optional user email
 * so we can add support for new devices.
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

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await request.json();
    const { fileNames, errorMessage, email, userAgent } = body as {
      fileNames: string[];
      errorMessage: string;
      email?: string;
      userAgent?: string;
    };

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json({ error: 'No file names provided.' }, { status: 400 });
    }

    if (typeof errorMessage !== 'string' || errorMessage.length < 3) {
      return NextResponse.json({ error: 'Error message required.' }, { status: 400 });
    }

    // Sanitize file names — only keep name and extension, limit count
    const sanitizedFiles = fileNames
      .slice(0, 50)
      .map((f) => {
        const name = String(f).replace(/[^\w.\-/]/g, '_');
        return name.slice(0, 200);
      });

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('error_submissions').insert({
        file_names: sanitizedFiles,
        error_message: errorMessage.slice(0, 2000),
        email: email?.trim().slice(0, 200) || null,
        user_agent: userAgent?.slice(0, 500) || null,
      });

      if (error) {
        // Table might not exist — log but don't fail
        console.error('[submit-error-data] Supabase error:', error.message);
        // Fall through to success (we still want to acknowledge the submission)
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
