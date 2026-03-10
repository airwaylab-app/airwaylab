import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const statsRateLimiter = new RateLimiter({ windowMs: 60_000, max: 30 });

/**
 * GET /api/stats
 *
 * Returns aggregate community stats for the homepage counter.
 * Cached for 5 minutes via Cache-Control header.
 * No authentication required — data is fully anonymous.
 */
export async function GET(request: Request) {
  const ip = getRateLimitKey(request);
  if (statsRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Return fallback zeros when Supabase isn't configured
    return NextResponse.json(
      { totalUploads: 0, totalNights: 0, totalContributions: 0, totalContributedNights: 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  try {
    // Count non-demo analysis sessions
    const { count: totalUploads, error: uploadsError } = await supabase
      .from('analysis_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_demo', false);

    if (uploadsError) {
      console.error('[stats] uploads count error:', uploadsError.message);
    }

    // Sum all nights from non-demo sessions
    const { data: nightsData, error: nightsError } = await supabase
      .from('analysis_sessions')
      .select('night_count')
      .eq('is_demo', false);

    if (nightsError) {
      console.error('[stats] nights sum error:', nightsError.message);
    }

    const totalNights = nightsData?.reduce((sum, row) => sum + (row.night_count || 0), 0) ?? 0;

    // Count data contributions and sum contributed nights
    const { count: totalContributions, error: contribError } = await supabase
      .from('data_contributions')
      .select('*', { count: 'exact', head: true });

    if (contribError) {
      // Table might not exist yet — not critical
      console.info('[stats] contributions count skipped:', contribError.message);
    }

    // Sum night_count from data_contributions for research counter
    const { data: contribNightsData, error: contribNightsError } = await supabase
      .from('data_contributions')
      .select('night_count');

    if (contribNightsError) {
      console.info('[stats] contributed nights sum skipped:', contribNightsError.message);
    }

    const totalContributedNights = contribNightsData?.reduce(
      (sum, row) => sum + (row.night_count || 0), 0
    ) ?? 0;

    return NextResponse.json(
      {
        totalUploads: totalUploads ?? 0,
        totalNights: totalNights,
        totalContributions: totalContributions ?? 0,
        totalContributedNights,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { totalUploads: 0, totalNights: 0, totalContributions: 0, totalContributedNights: 0 },
      { status: 500 }
    );
  }
}
