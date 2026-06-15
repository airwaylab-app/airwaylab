import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

// Allow up to 30s. Previously there was no maxDuration, so the Vercel default (10s)
// could kill the function mid-loop, returning truncated synced/skipped counts that
// lied to the client about what actually persisted.
export const maxDuration = 30;

// ~1000 nights/hour per user
const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 1000 });

const MAX_NIGHTS_PER_BATCH = 50;

// Permissive schema — bulk data stripped server-side as defence-in-depth
const strippedNightResultSchema = z.object({
  dateStr: z.string(),
  durationHours: z.number(),
  sessionCount: z.number(),
  settings: z.record(z.string(), z.unknown()),
  glasgow: z.record(z.string(), z.unknown()),
  wat: z.record(z.string(), z.unknown()),
  ned: z.record(z.string(), z.unknown()),
  oximetry: z.record(z.string(), z.unknown()).nullable().optional(),
  machineSummary: z.record(z.string(), z.unknown()).nullable().optional(),
  settingsMetrics: z.unknown().optional(),
}).passthrough();

const bodySchema = z.object({
  nights: z.array(strippedNightResultSchema).min(1).max(MAX_NIGHTS_PER_BATCH),
});

type StrippedNight = z.infer<typeof strippedNightResultSchema>;

function stripBulkData(night: StrippedNight): StrippedNight {
  const ned = { ...((night.ned ?? {}) as Record<string, unknown>) };
  delete ned.breaths;
  delete ned.reras;

  const csl = night.csl as Record<string, unknown> | null | undefined;

  return {
    ...night,
    ned,
    // oximetryTrace lives at the top level in full NightResult
    oximetryTrace: undefined,
    csl: csl ? { ...csl, episodes: [] } : csl,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    if (await rateLimiter.isLimited(ip)) {
      console.error('[nights/sync] 429 rate limited', { ip });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid request data';
      console.error('[nights/sync] 400 validation failed', { error: firstError });
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // Strip bulk data server-side as defence-in-depth
    const nights = parsed.data.nights.map(stripBulkData);

    const rows = nights.map((night) => ({
      user_id: user.id,
      night_date: night.dateStr,
      analysis_data: night,
    }));

    const { error: upsertError } = await serviceRole
      .from('user_nights')
      .upsert(rows, { onConflict: 'user_id,night_date' });

    let synced = 0;
    let skipped = 0;

    if (upsertError) {
      Sentry.captureException(upsertError, {
        tags: { route: 'nights/sync', step: 'upsert' },
        extra: { count: nights.length, userId: user.id.slice(0, 8) },
      });
      skipped = nights.length;
    } else {
      synced = nights.length;
    }

    // Anonymised user ID in logs (first 8 chars of UUID)
    const anonymisedId = user.id.slice(0, 8);
    console.error('[nights/sync] sync complete', {
      action: 'nights_sync',
      user_id: anonymisedId,
      count: nights.length,
      synced,
      skipped,
    });

    return NextResponse.json({ synced, skipped });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'nights/sync' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
