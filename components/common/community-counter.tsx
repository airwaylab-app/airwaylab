'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Moon, HeartHandshake } from 'lucide-react';

const CACHE_KEY = 'airwaylab-community-stats';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (matches API cache)
const REFRESH_INTERVAL = 60 * 1000; // 60 seconds auto-refresh

interface Stats {
  totalNights: number;
  totalUploads: number;
  totalContributedNights: number;
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
 * Animated counter that counts up from 0 to target value.
 */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }

    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) return;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{formatNumber(display)}</>;
}

function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache) {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: CachedStats = JSON.parse(raw);
          if (Date.now() - cached.ts < CACHE_TTL) {
            setStats({
              totalNights: cached.totalNights,
              totalUploads: cached.totalUploads,
              totalContributedNights: cached.totalContributedNights,
            });
            return;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    try {
      const r = await fetch('/api/stats', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return;
      const data = await r.json();
      const result: Stats = {
        totalNights: data.totalNights ?? 0,
        totalUploads: data.totalUploads ?? 0,
        totalContributedNights: data.totalContributedNights ?? 0,
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
    } catch {
      // fail silently
    }
  }, []);

  useEffect(() => {
    fetchStats(true);

    // Auto-refresh every 60 seconds (bypass cache)
    const interval = setInterval(() => fetchStats(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return stats;
}

/**
 * Displays live community stats.
 *
 * variant="default" — "X nights analyzed" (existing behavior)
 * variant="research" — "X Nights Contributed for Research" (prominent, animated)
 */
export function CommunityCounter({
  className,
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'research';
}) {
  const stats = useStats();

  // Don't show if no data
  if (!stats) return null;

  if (variant === 'research') {
    // Hide if nobody has contributed yet
    if (stats.totalContributedNights === 0) return null;

    return (
      <div className={className}>
        <HeartHandshake className="h-4 w-4 text-rose-400" />
        <span>
          <strong className="font-semibold text-foreground">
            <AnimatedNumber value={stats.totalContributedNights} />
          </strong>{' '}
          Nights Contributed for Research
        </span>
      </div>
    );
  }

  // Default: hide if zero
  if (stats.totalNights === 0 && stats.totalUploads === 0) return null;

  return (
    <div className={className}>
      <Moon className="h-3.5 w-3.5 text-primary" />
      <span>
        {formatNumber(stats.totalNights)} nights analyzed
      </span>
    </div>
  );
}
