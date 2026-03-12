import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import packageJson from '../../../package.json';

// Force dynamic so this endpoint always returns the deployed version
export const dynamic = 'force-dynamic';

/** Rate limit: 60 requests per minute per IP */
const versionRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 60,
});

/**
 * GET /api/version
 *
 * Returns the current app version and build ID.
 * Build ID changes on every deployment (set at build time in next.config).
 * Used by the client-side version checker to detect stale deployments.
 * Short cache (60s) so CDN doesn't serve stale versions too long.
 */
export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  if (versionRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  return NextResponse.json(
    {
      version: packageJson.version,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
      gitSha: process.env.NEXT_PUBLIC_GIT_SHA ?? null,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    }
  );
}
