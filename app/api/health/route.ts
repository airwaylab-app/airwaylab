import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Rate limit: 60 requests per minute per IP */
const healthRateLimiter = new RateLimiter({
  windowMs: 60_000,
  max: 60,
});

export async function GET(request: NextRequest) {
  const ip = getRateLimitKey(request);
  if (await healthRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const version = process.env.npm_package_version ?? 'unknown';
  // Vercel injects the deployed commit SHA at build time. Exposing it lets the
  // smoke check assert deployed-SHA == merged-SHA after a release.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';

  return NextResponse.json({ status: 'ok', version, sha });
}
