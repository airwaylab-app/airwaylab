'use client';

import { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';

const CACHE_KEY = 'airwaylab-community-stats';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (matches API cache)

interface Stats {
  totalNights: number;
  totalUploads: number;
}

interface CachedStats extends Stats {
  ts: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/**
 * Displays live community stats (total nights analyzed).
 * Fetches from /api/stats, caches in sessionStorage for 5 minutes.
 * Graceful fallback: hidden if stats are unavailable or zero.
 */
export function CommunityCounter({ className }: { className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Check cache first
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedStats = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL) {
          setStats({ totalNights: cached.totalNights, totalUploads: cached.totalUploads });
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    fetch('/api/stats', { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const result: Stats = {
          totalNights: data.totalNights ?? 0,
          totalUploads: data.totalUploads ?? 0,
        };
        setStats(result);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ...result, ts: Date.now() })
          );
        } catch {
          // sessionStorage may be unavailable
        }
      })
      .catch(() => {
        // fail silently — don't show counter
      });
  }, []);

  // Don't show if no data or both are zero
  if (!stats || (stats.totalNights === 0 && stats.totalUploads === 0)) {
    return null;
  }

  return (
    <div className={className}>
      <Moon className="h-3.5 w-3.5 text-primary" />
      <span>
        {formatNumber(stats.totalNights)} nights analyzed
      </span>
    </div>
  );
}
