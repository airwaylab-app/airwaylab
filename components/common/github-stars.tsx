'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';

const REPO = 'airwaylab-app/airwaylab';
const CACHE_KEY = 'airwaylab-gh-stars-v2';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 60 * 1000; // 60 seconds auto-refresh

interface CachedStars {
  count: number;
  ts: number;
}

/**
 * Fetches and displays the live GitHub star count for the repo.
 * Caches in sessionStorage for 5 minutes, auto-refreshes every 60s.
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
      const r = await fetch(`https://api.github.com/repos/${REPO}`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const data = await r.json();
      const count = data.stargazers_count as number;
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
