import { NextResponse } from 'next/server';
import packageJson from '../../../package.json';

// Force dynamic so this endpoint always returns the deployed version
export const dynamic = 'force-dynamic';

/**
 * GET /api/version
 *
 * Returns the current app version and build ID.
 * Build ID changes on every deployment (set at build time in next.config).
 * Used by the client-side version checker to detect stale deployments.
 * Short cache (60s) so CDN doesn't serve stale versions too long.
 */
export async function GET() {
  return NextResponse.json(
    {
      version: packageJson.version,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    }
  );
}
