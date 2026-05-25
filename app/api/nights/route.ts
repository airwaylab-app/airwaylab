import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

// 120 fetches/hour per user — generous for page loads and background refreshes
const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 120 });

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

    const { data, error: queryError } = await query;

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
