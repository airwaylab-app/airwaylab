'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';
import { computeIFLRisk } from '@/lib/ifl-risk';
import type { NightResult } from '@/lib/types';

interface MetricPercentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface BenchmarkData {
  iflRisk: MetricPercentiles;
  glasgow: MetricPercentiles;
  flScore: MetricPercentiles;
  reraIndex: MetricPercentiles;
  sampleSize: number;
  fetchedAt: string;
}

interface Props {
  night: NightResult;
  isDemo?: boolean;
}

function PositionBar({ value, percentiles, label, unit, format }: {
  value: number;
  percentiles: MetricPercentiles;
  label: string;
  unit?: string;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => v.toFixed(1));
  const min = percentiles.p10;
  const max = percentiles.p90;
  const range = max - min;

  // Clamp position between 0 and 100
  let pct = range > 0 ? ((value - min) / range) * 100 : 50;
  let outsideLabel: string | null = null;

  if (value < min) {
    pct = 0;
    outsideLabel = '(below community range)';
  } else if (value > max) {
    pct = 100;
    outsideLabel = '(above community range)';
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-medium tabular-nums">
          {fmt(value)}{unit}
          {outsideLabel && (
            <span className="ml-1 text-[10px] font-normal text-muted-foreground/60">{outsideLabel}</span>
          )}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-border/30">
        {/* Typical range band (p25-p75) */}
        <div
          className="absolute top-0 h-full rounded-full bg-primary/15"
          style={{
            left: `${range > 0 ? ((percentiles.p25 - min) / range) * 100 : 25}%`,
            width: `${range > 0 ? ((percentiles.p75 - percentiles.p25) / range) * 100 : 50}%`,
          }}
        />
        {/* User position dot */}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm"
          style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/50">
        <span>{fmt(percentiles.p10)}{unit}</span>
        <span>typical: {fmt(percentiles.p25)}-{fmt(percentiles.p75)}{unit}</span>
        <span>{fmt(percentiles.p90)}{unit}</span>
      </div>
    </div>
  );
}

export function CommunityBenchmarks({ night, isDemo = false }: Props) {
  const { isPaid } = useAuth();
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'insufficient' | 'error'>('loading');
  const tracked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/community-benchmarks', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((json) => {
        if (controller.signal.aborted) return;
        if (json.insufficient) {
          setStatus('insufficient');
        } else {
          setData(json);
          setStatus('loaded');
          if (!tracked.current) {
            events.communityBenchmarksViewed();
            tracked.current = true;
          }
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus('error');
      });

    return () => controller.abort();
  }, []);

  // Error: hide silently (non-blocking)
  if (status === 'error') return null;

  // Loading skeleton
  if (status === 'loading') {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Users className="h-4 w-4 shrink-0 animate-pulse" />
          <p className="text-xs text-muted-foreground/70">Loading community benchmarks...</p>
        </div>
      </div>
    );
  }

  // Insufficient data
  if (status === 'insufficient') {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Users className="h-4 w-4 shrink-0" />
          <p className="text-xs text-muted-foreground/70">
            Community benchmarks are coming soon as more users contribute data.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const iflRisk = computeIFLRisk(night);
  const isElevated = iflRisk > data.iflRisk.p75;

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0 text-primary/60" />
        <h3 className="text-xs font-semibold text-muted-foreground">
          How your results compare
          {isDemo && <span className="ml-1 text-[10px] font-normal text-muted-foreground/50">(demo data)</span>}
        </h3>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <PositionBar
          label="IFL Symptom Risk"
          value={iflRisk}
          percentiles={data.iflRisk}
          unit="%"
        />
        <PositionBar
          label="Glasgow Index"
          value={night.glasgow.overall}
          percentiles={data.glasgow}
          format={(v) => v.toFixed(2)}
        />
        <PositionBar
          label="FL Score"
          value={night.wat.flScore}
          percentiles={data.flScore}
          unit="%"
        />
        <PositionBar
          label="RERA Index"
          value={night.ned.reraIndex}
          percentiles={data.reraIndex}
          unit="/hr"
        />
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground/50">
        Based on {data.sampleSize.toLocaleString()} anonymised community analyses
      </p>

      {/* Premium nudge for free users */}
      {!isPaid && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/30 pt-3 text-[11px] text-muted-foreground/60">
          <Sparkles className="h-3 w-3 shrink-0 text-primary/40" />
          <span>
            {isElevated
              ? 'Your flow limitation is higher than most users at similar pressure settings. Supporters get AI analysis of what patterns like yours typically respond to.'
              : 'Your results are within the typical range. Supporters get AI insights into what is working and what to watch for.'}
            {' '}
            <Link href="/pricing" className="text-primary/60 hover:underline">
              See supporter benefits
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
