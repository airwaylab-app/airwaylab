'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

const REPO = 'airwaylab-app/airwaylab';
const CACHE_KEY = 'airwaylab-gh-stars';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedStars {
  count: number;
  ts: number;
}

/**
 * Fetches and displays the live GitHub star count for the repo.
 * Caches in sessionStorage for 1 hour.
 * Graceful fallback: shows "Star" without count if API fails.
 */
export function GitHubStars({ className }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedStars = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          setStars(cached.count);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    fetch(`https://api.github.com/repos/${REPO}`, { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const count = data.stargazers_count as number;
        setStars(count);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
        } catch {
          // sessionStorage may be unavailable
        }
      })
      .catch(() => {
        // fail silently — show button without count
      });
  }, []);

  return (
    <a
      href={`https://github.com/${REPO}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <Star className="h-3.5 w-3.5" />
      {stars !== null && stars > 0 ? (
        <span>{stars}</span>
      ) : (
        <span>Star</span>
      )}
    </a>
  );
}
