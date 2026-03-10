'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';

const CACHE_KEY = 'airwaylab_gh-stars-v3';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (matches server cache)
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes auto-refresh

interface CachedStars {
  count: number;
  ts: number;
}

/**
 * Fetches and displays the live GitHub star count for the repo.
 * Uses server-side proxy to avoid GitHub API rate limiting.
 * Caches in sessionStorage for 15 minutes, auto-refreshes every 5 min.
 * Graceful fallback: shows "Star" without count if API fails.
 */
export function GitHubStars({ className }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);

  const fetchStars = useCallback(async (useCache = true) => {
    if (useCache) {
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
    }

    try {
      const r = await fetch('/api/github-stars', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const data = await r.json();
      const count = typeof data.stars === 'number' ? data.stars : 0;
      setStars(count);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
      } catch {
        // sessionStorage may be unavailable
      }
    } catch {
      // fail silently
    }
  }, []);

  useEffect(() => {
    fetchStars(true);
    const interval = setInterval(() => fetchStars(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStars]);

  return (
    <a
      href="https://github.com/airwaylab-app/airwaylab"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={stars !== null && stars > 0 ? `Star AirwayLab on GitHub (${stars} stars)` : 'Star AirwayLab on GitHub'}
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
