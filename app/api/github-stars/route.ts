import { NextResponse } from 'next/server';

const REPO = 'airwaylab-app/airwaylab';

/**
 * GET /api/github-stars
 *
 * Server-side proxy for GitHub star count.
 * Avoids client-side rate limiting (60 req/hour unauthenticated).
 * Cached for 15 minutes via Cache-Control header.
 */
export async function GET() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'airwaylab-app',
      },
      next: { revalidate: 900 }, // ISR: 15 minutes
    });

    if (!r.ok) {
      console.error(`[github-stars] GitHub API returned ${r.status}`);
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
    return NextResponse.json(
      { stars: 0 },
      { status: 500 }
    );
  }
}
