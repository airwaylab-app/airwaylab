import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

// Allow up to 30s: a full-history hydration for a champion-tier user can return
// hundreds of analysis_data rows. The Vercel default (10s) was killing the function
// mid-response on large accounts, producing truncated/aborted payloads.
export const maxDuration = 30;

// 120 fetches/hour per user — generous for page loads and background refreshes
const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 120 });

// Hard cap on rows returned per fetch. The dashboard consumer (app/analyze/page.tsx)
// needs the full analysis_data blob — it hydrates the restore/merge path and every
// chart reads deep NightResult fields — so we cannot project to summary columns.
// Instead we bound the worst-case payload: 365 most-recent nights covers a full year,
// far exceeding the supporter (90d) and community (14d) windows, and is a sane ceiling
// for the unbounded champion window. Ordered night_date DESC, so the newest are kept.
const MAX_NIGHTS_RETURNED = 365;

const querySchema = z.object({
  since: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'since must be ISO date YYYY-MM-DD')
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ip = getRateLimitKey(request);
    if (await rateLimiter.isLimited(ip)) {
      console.error('[nights] 429 rate limited', { ip });
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

    const rawParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(rawParams);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid query parameters';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // RLS scopes rows to auth.uid(); explicit eq filter added for clarity.
    let query = supabase
      .from('user_nights')
      .select('night_date, analysis_data')
      .eq('user_id', user.id)
      .order('night_date', { ascending: false });

    if (parsed.data.since) {
      query = query.gte('night_date', parsed.data.since);
    }

    // Bound the payload (see MAX_NIGHTS_RETURNED). Applied after order DESC, so the
    // most recent nights are always returned.
    query = query.limit(MAX_NIGHTS_RETURNED);

    // Race the query against an 8s cap to prevent Supabase statement timeouts from
    // propagating as opaque Vercel 500s (JAVASCRIPT-NEXTJS-79 / AIR-2241).
    const QUERY_TIMEOUT_MS = 8_000;
    const queryResult = await Promise.race([
      query,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), QUERY_TIMEOUT_MS)),
    ]);

    if (queryResult === 'timeout') {
      console.error('[nights] Supabase query timed out', {
        action: 'nights_fetch_timeout',
        user_id: user.id.slice(0, 8),
      });
      Sentry.captureMessage('nights GET query timeout', {
        level: 'warning',
        tags: { route: 'nights/get', step: 'query-timeout' },
        extra: { userId: user.id.slice(0, 8) },
      });
      return NextResponse.json({ error: 'Request timed out — please try again' }, { status: 503 });
    }

    const { data, error: queryError } = queryResult;

    if (queryError) {
      Sentry.captureException(queryError, {
        tags: { route: 'nights/get' },
        extra: { userId: user.id.slice(0, 8) },
      });
      return NextResponse.json({ error: 'Failed to fetch nights' }, { status: 500 });
    }

    const anonymisedId = user.id.slice(0, 8);
    console.error('[nights] fetch complete', {
      action: 'nights_fetch',
      user_id: anonymisedId,
      count: data?.length ?? 0,
    });

    const nights = (data ?? []).map((row) => row.analysis_data);

    return NextResponse.json({ nights });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'nights/get' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
