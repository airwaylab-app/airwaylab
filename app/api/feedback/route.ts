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

    const body = await request.json();
    const { message, email, type, page } = body as {
      message: string;
      email?: string;
      type?: string;
      page?: string;
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
    if (email && (typeof email !== 'string' || !email.includes('@') || email.length > 200)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('feedback').insert({
        message: `[${type || 'feedback'}] ${message.trim()}`,
        email: email?.trim() || null,
        page: page || null,
      });

      if (error) {
        console.error('[feedback] Supabase error:', error.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(`[feedback] ${type}: ${message.slice(0, 100)} (Supabase not configured)`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
