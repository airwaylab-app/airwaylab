import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

/** Rate limit: 10 requests per minute per IP */
const communityRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 10,
});

export async function GET(request: NextRequest) {
  // CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Rate limiting
  const ip = getRateLimitKey(request);
  if (communityRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const iflRiskRaw = searchParams.get('ifl_risk');
  const pressureBucket = searchParams.get('pressure_bucket');

  const iflRisk = iflRiskRaw ? Number(iflRiskRaw) : null;

  const adminClient = getSupabaseServiceRole();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    const { data, error } = await adminClient.rpc('get_community_symptom_stats', {
      p_ifl_risk: iflRisk ?? 0,
      p_pressure_bucket: pressureBucket ?? '',
    });

    if (error) {
      console.error('[community-insights] RPC error:', error.message);
      Sentry.captureException(error, { tags: { route: 'community-insights' } });
      return NextResponse.json({ error: 'Failed to fetch community data' }, { status: 500 });
    }

    // Return null/insufficient if fewer than 20 ratings
    if (!data || data.total_ratings < 20) {
      return NextResponse.json({ insufficient: true, totalRatings: data?.total_ratings ?? 0 });
    }

    return NextResponse.json({
      avgRating: Number(data.avg_rating),
      totalRatings: data.total_ratings,
      sameBucketAvgRating: data.same_bucket_avg_rating !== null ? Number(data.same_bucket_avg_rating) : null,
      sameBucketCount: data.same_bucket_count ?? 0,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'community-insights' } });
    console.error('[community-insights] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
