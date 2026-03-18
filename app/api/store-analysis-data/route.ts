import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { requireAuthWithServiceRole } from '@/lib/api/require-auth';
import { captureError } from '@/lib/sentry-utils';

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 100 });

const nightSchema = z.object({
  dateStr: z.string(),
  glasgowOverall: z.number(),
  flScore: z.number(),
  nedMean: z.number(),
  reraIndex: z.number(),
  eai: z.number(),
  durationHours: z.number(),
  sessionCount: z.number(),
  settings: z.record(z.string(), z.unknown()),
});

const bodySchema = z.object({
  nights: z.array(nightSchema),
});

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = await requireAuthWithServiceRole();
    if (auth.error) return auth.error;
    const { user, serviceRole } = auth;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      console.error('[store-analysis-data] 400 validation failed:', parsed.error.issues);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { nights } = parsed.data;

    const rows = nights.map((night) => ({
      user_id: user.id,
      night_date: night.dateStr,
      glasgow_overall: night.glasgowOverall,
      fl_score: night.flScore,
      ned_mean: night.nedMean,
      rera_index: night.reraIndex,
      eai: night.eai,
      duration_hours: night.durationHours,
      session_count: night.sessionCount,
      settings: night.settings,
    }));

    const { error: upsertError } = await serviceRole
      .from('analysis_data')
      .upsert(rows, { onConflict: 'user_id,night_date' });

    if (upsertError) {
      Sentry.captureException(upsertError, {
        extra: { userId: user.id, nightCount: nights.length },
      });
      return NextResponse.json({ error: 'Failed to store analysis data' }, { status: 500 });
    }

    return NextResponse.json({ stored: nights.length });
  } catch (error) {
    captureError(error, 'store-analysis-data');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
