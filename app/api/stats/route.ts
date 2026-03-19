import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/sentry-utils';

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
  if (await statsRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Return fallback zeros when Supabase isn't configured
    return NextResponse.json(
      {
        totalUploads: 0, totalNights: 0, totalContributions: 0, totalContributedNights: 0,
        uniqueRawUploaders: 0, totalRawFiles: 0, totalWaveformContributions: 0,
        uniqueWaveformContributors: 0, totalRegisteredUsers: 0,
      },
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
      Sentry.logger.warn('[stats] uploads count error', { error: uploadsError.message });
      captureApiError(uploadsError, { route: 'stats', query: 'uploads' });
    }

    // Sum all nights from non-demo sessions
    const { data: nightsData, error: nightsError } = await supabase
      .from('analysis_sessions')
      .select('night_count')
      .eq('is_demo', false);

    if (nightsError) {
      Sentry.logger.warn('[stats] nights sum error', { error: nightsError.message });
      captureApiError(nightsError, { route: 'stats', query: 'nights' });
    }

    const totalNights = nightsData?.reduce((sum, row) => sum + (row.night_count || 0), 0) ?? 0;

    // Count data contributions and sum contributed nights
    const { count: totalContributions, error: contribError } = await supabase
      .from('data_contributions')
      .select('*', { count: 'exact', head: true });

    if (contribError) {
      // Table might not exist yet — not critical
      Sentry.logger.info('[stats] contributions count skipped', { error: contribError.message });
    }

    // Sum night_count from data_contributions for research counter
    const { data: contribNightsData, error: contribNightsError } = await supabase
      .from('data_contributions')
      .select('night_count');

    if (contribNightsError) {
      Sentry.logger.info('[stats] contributed nights sum skipped', { error: contribNightsError.message });
    }

    const totalContributedNights = contribNightsData?.reduce(
      (sum, row) => sum + (row.night_count || 0), 0
    ) ?? 0;

    // Fetch extended stats via RPC (raw uploads, waveform contributions, registered users)
    let extendedStats = {
      uniqueRawUploaders: 0,
      totalRawFiles: 0,
      totalWaveformContributions: 0,
      uniqueWaveformContributors: 0,
      totalRegisteredUsers: 0,
    };

    const { data: extData, error: extError } = await supabase.rpc('get_extended_stats');
    if (extError) {
      Sentry.logger.info('[stats] extended stats RPC skipped', { error: extError.message });
    } else if (extData) {
      extendedStats = {
        uniqueRawUploaders: extData.unique_raw_uploaders ?? 0,
        totalRawFiles: extData.total_raw_files ?? 0,
        totalWaveformContributions: extData.total_waveform_contributions ?? 0,
        uniqueWaveformContributors: extData.unique_waveform_contributors ?? 0,
        totalRegisteredUsers: extData.total_registered_users ?? 0,
      };
    }

    return NextResponse.json(
      {
        totalUploads: totalUploads ?? 0,
        totalNights: totalNights,
        totalContributions: totalContributions ?? 0,
        totalContributedNights,
        ...extendedStats,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    captureApiError(err, { route: 'stats' });
    return NextResponse.json(
      {
        totalUploads: 0, totalNights: 0, totalContributions: 0, totalContributedNights: 0,
        uniqueRawUploaders: 0, totalRawFiles: 0, totalWaveformContributions: 0,
        uniqueWaveformContributors: 0, totalRegisteredUsers: 0,
      },
      { status: 500 }
    );
  }
}
