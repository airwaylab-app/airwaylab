import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/sentry-utils';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const rateLimiter = new RateLimiter({ max: 30, windowMs: 60_000 });

const REPO = 'airwaylab-app/airwaylab';

/**
 * GET /api/github-stars
 *
 * Server-side proxy for GitHub star count.
 * Uses GITHUB_TOKEN for authenticated requests (5000 req/hr vs 60 unauthenticated).
 * Cached for 15 minutes via Cache-Control header.
 */
export async function GET(request: NextRequest) {
  const rateLimitKey = getRateLimitKey(request);
  if (await rateLimiter.isLimited(rateLimitKey)) {
    return NextResponse.json({ stars: 0 }, { status: 429 });
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'airwaylab-app',
    };
    if (serverEnv.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${serverEnv.GITHUB_TOKEN}`;
    }

    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers,
      next: { revalidate: 900 }, // ISR: 15 minutes
    });

    if (!r.ok) {
      console.error(`[github-stars] GitHub API returned ${r.status}`);
      captureApiError(new Error(`GitHub API returned ${r.status}`), { route: 'github-stars' });
      return NextResponse.json(
        { stars: 0 },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    const data = await r.json();
    const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;

    return NextResponse.json(
      { stars },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      }
    );
  } catch (error) {
    console.error('[github-stars] fetch error:', error);
    captureApiError(error, { route: 'github-stars' });
    return NextResponse.json(
      { stars: 0 },
      { status: 500 }
    );
  }
}
