import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const VALID_SCOPES = ['single', 'all'] as const;

/**
 * POST /api/share
 *
 * Creates a share link by storing analysis results in Supabase.
 * No auth required. Rate limited to 10/hour per IP.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (limiter.isLimited(ip)) {
      console.error(`[share] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many shares. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.error(`[share] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: 'Payload too large. Maximum 5MB.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { analysisData, machineInfo, nightsCount, shareScope } = body as {
      analysisData: unknown;
      machineInfo: unknown;
      nightsCount: unknown;
      shareScope: unknown;
    };

    // Validate analysisData
    if (!analysisData || typeof analysisData !== 'object') {
      return NextResponse.json(
        { error: 'Analysis data is required.' },
        { status: 400 }
      );
    }

    // Validate shareScope
    if (
      typeof shareScope !== 'string' ||
      !(VALID_SCOPES as readonly string[]).includes(shareScope)
    ) {
      return NextResponse.json(
        { error: 'Invalid share scope.' },
        { status: 400 }
      );
    }

    // Validate nightsCount
    const count = typeof nightsCount === 'number' && nightsCount > 0
      ? nightsCount
      : Array.isArray(analysisData) ? analysisData.length : 1;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[share] Supabase not configured');
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('shared_analyses')
      .insert({
        analysis_data: analysisData,
        machine_info: machineInfo ?? null,
        nights_count: count,
        share_scope: shareScope,
      })
      .select('id, expires_at')
      .single();

    if (error) {
      console.error('[share] Supabase insert error:', error.message);
      Sentry.captureException(error, { tags: { route: 'share' } });
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://airwaylab.app';
    const shareUrl = `${appUrl}/shared/${data.id}`;

    return NextResponse.json(
      {
        shareId: data.id,
        shareUrl,
        expiresAt: data.expires_at,
        nightsCount: count,
        shareScope,
      },
      { status: 201 }
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'share' } });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
