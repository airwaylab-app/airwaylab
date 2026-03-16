import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

/** Rate limit: 10 requests per minute per IP */
const benchmarkRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 10,
});

/** In-memory cache for aggregate percentiles (1 hour TTL) */
let cachedBenchmarks: BenchmarkResponse | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface MetricPercentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface BenchmarkResponse {
  iflRisk: MetricPercentiles;
  glasgow: MetricPercentiles;
  flScore: MetricPercentiles;
  reraIndex: MetricPercentiles;
  sampleSize: number;
  fetchedAt: string;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getRateLimitKey(request);
  if (await benchmarkRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  // Return cache if fresh
  if (cachedBenchmarks && Date.now() - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedBenchmarks);
  }

  const adminClient = getSupabaseServiceRole();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    // Query aggregate percentiles from contributed data
    // Using raw SQL via rpc for percentile_cont aggregates
    const { data, error } = await adminClient.rpc('get_community_benchmarks');

    if (error) {
      console.error('[community-benchmarks] RPC error:', error.message);
      Sentry.captureException(error, { tags: { route: 'community-benchmarks' } });

      // Serve stale cache if available
      if (cachedBenchmarks) {
        return NextResponse.json(cachedBenchmarks);
      }
      return NextResponse.json({ error: 'Failed to fetch benchmarks' }, { status: 500 });
    }

    if (!data || data.sample_size < 20) {
      return NextResponse.json({ insufficient: true, sampleSize: data?.sample_size ?? 0 });
    }

    const response: BenchmarkResponse = {
      iflRisk: {
        p10: Number(data.ifl_risk_p10),
        p25: Number(data.ifl_risk_p25),
        p50: Number(data.ifl_risk_p50),
        p75: Number(data.ifl_risk_p75),
        p90: Number(data.ifl_risk_p90),
      },
      glasgow: {
        p10: Number(data.glasgow_p10),
        p25: Number(data.glasgow_p25),
        p50: Number(data.glasgow_p50),
        p75: Number(data.glasgow_p75),
        p90: Number(data.glasgow_p90),
      },
      flScore: {
        p10: Number(data.fl_score_p10),
        p25: Number(data.fl_score_p25),
        p50: Number(data.fl_score_p50),
        p75: Number(data.fl_score_p75),
        p90: Number(data.fl_score_p90),
      },
      reraIndex: {
        p10: Number(data.rera_index_p10),
        p25: Number(data.rera_index_p25),
        p50: Number(data.rera_index_p50),
        p75: Number(data.rera_index_p75),
        p90: Number(data.rera_index_p90),
      },
      sampleSize: data.sample_size,
      fetchedAt: new Date().toISOString(),
    };

    // Update cache
    cachedBenchmarks = response;
    cachedAt = Date.now();

    return NextResponse.json(response);
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'community-benchmarks' } });
    console.error('[community-benchmarks] Error:', err);

    // Serve stale cache on error
    if (cachedBenchmarks) {
      return NextResponse.json(cachedBenchmarks);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
