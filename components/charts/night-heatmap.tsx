'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NightResult } from '@/lib/types';
import { CHART_COLORS } from '@/lib/chart-theme';

// ── Types ──────────────────────────────────────────────────────

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

type MetricDef = {
  key: string;
  label: string;
  get: (n: NightResult) => number;
  thresholds: [number, number, number];
  unit: string;
};

type SortConfig = {
  column: 'date' | 'metric';
  metricKey?: string;
  direction: 'asc' | 'desc';
};

// ── Metric definitions ─────────────────────────────────────────

const METRICS: MetricDef[] = [
  {
    key: 'glasgow',
    label: 'Glasgow',
    get: (n) => n.glasgow.overall,
    thresholds: [1.0, 2.0, 3.0],
    unit: '',
  },
  {
    key: 'fl',
    label: 'FL Score',
    get: (n) => n.wat.flScore,
    thresholds: [20, 40, 60],
    unit: '%',
  },
  {
    key: 'regularity',
    label: 'Regularity',
    get: (n) => n.wat.regularityScore,
    thresholds: [30, 50, 70],
    unit: '%',
  },
  {
    key: 'periodicity',
    label: 'Periodicity',
    get: (n) => n.wat.periodicityIndex,
    thresholds: [10, 25, 50],
    unit: '%',
  },
  {
    key: 'ned',
    label: 'NED Mean',
    get: (n) => n.ned.nedMean,
    thresholds: [15, 25, 35],
    unit: '%',
  },
  {
    key: 'rera',
    label: 'RERA/hr',
    get: (n) => n.ned.reraIndex,
    thresholds: [5, 10, 20],
    unit: '/hr',
  },
  {
    key: 'combinedFL',
    label: 'Combined FL',
    get: (n) => n.ned.combinedFLPct,
    thresholds: [20, 40, 60],
    unit: '%',
  },
  {
    key: 'eai',
    label: 'Resp. DI',
    get: (n) => n.ned.estimatedArousalIndex ?? 0,
    thresholds: [5, 10, 20],
    unit: '/hr',
  },
];

// ── Color mapping ──────────────────────────────────────────────

function getColor(value: number, thresholds: [number, number, number]): string {
  const [t1, t2, t3] = thresholds;
  const ascending = t1 < t3;

  if (ascending) {
    if (value <= t1) return 'bg-emerald-900/40 text-emerald-300';
    if (value <= t2) return 'bg-amber-900/40 text-amber-300';
    if (value <= t3) return 'bg-orange-900/40 text-orange-300';
    return 'bg-red-900/40 text-red-300';
  } else {
    if (value >= t1) return 'bg-emerald-900/40 text-emerald-300';
    if (value >= t2) return 'bg-amber-900/40 text-amber-300';
    if (value >= t3) return 'bg-orange-900/40 text-orange-300';
    return 'bg-red-900/40 text-red-300';
  }
}

// ── Mini sparkline ─────────────────────────────────────────────

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 48;
  const height = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block" aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={CHART_COLORS[0]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────

export const NightHeatmap = memo(function NightHeatmap({ nights, therapyChangeDate }: Props) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    () => new Set(METRICS.map((m) => m.key))
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'date',
    direction: 'desc',
  });
  const [showSparklines, setShowSparklines] = useState(false);

  // Toggle a metric's visibility
  const toggleMetric = useCallback((key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding all metrics
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Handle sort click
  const handleSort = useCallback((column: 'date' | 'metric', metricKey?: string) => {
    setSortConfig((prev) => {
      if (prev.column === column && prev.metricKey === metricKey) {
        return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDir = column === 'date' ? 'desc' : 'asc';
      return { column, metricKey, direction: defaultDir };
    });
  }, []);

  // Sort nights
  const sortedNights = useMemo(() => {
    const base = [...nights].reverse(); // chronological order (oldest first)

    if (sortConfig.column === 'date') {
      return sortConfig.direction === 'asc' ? base : [...base].reverse();
    }

    // Sort by a specific metric's values across nights
    if (sortConfig.column === 'metric' && sortConfig.metricKey) {
      const metric = METRICS.find((m) => m.key === sortConfig.metricKey);
      if (metric) {
        return [...base].sort((a, b) => {
          const va = metric.get(a);
          const vb = metric.get(b);
          return sortConfig.direction === 'asc' ? va - vb : vb - va;
        });
      }
    }

    return base;
  }, [nights, sortConfig]);

  // Filtered metrics
  const activeMetrics = useMemo(
    () => METRICS.filter((m) => visibleMetrics.has(m.key)),
    [visibleMetrics]
  );

  const sortArrow = (col: 'date' | 'metric', key?: string) => {
    if (sortConfig.column !== col) return null;
    if (col === 'metric' && sortConfig.metricKey !== key) return null;
    return (
      <span className="ml-0.5 text-primary">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Night-by-Night Heatmap</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                aria-pressed={visibleMetrics.has(m.key)}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  visibleMetrics.has(m.key)
                    ? 'border-border bg-card text-foreground'
                    : 'border-transparent text-muted-foreground/80 line-through'
                }`}
              >
                {m.label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-border/50" />
            <button
              onClick={() => setShowSparklines((s) => !s)}
              aria-pressed={showSparklines}
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                showSparklines
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              Sparklines
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div
            className="relative max-w-full overflow-x-auto"
            role="region"
            aria-label="Night-by-night heatmap of sleep metrics"
          >
            <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
              airwaylab.app
            </span>
            <table
              className="w-full text-xs"
              aria-label={`Sleep metrics heatmap for ${sortedNights.length} nights. Color indicates severity: green is normal, amber is borderline, red is elevated.`}
            >
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th
                    className="cursor-pointer pb-2 pr-3 text-left font-medium hover:text-foreground"
                    onClick={() => handleSort('date')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('date'); } }}
                    role="button"
                    tabIndex={0}
                    title="Sort by date"
                  >
                    Date {sortArrow('date')}
                  </th>
                  {sortedNights.map((n) => (
                    <th
                      key={n.dateStr}
                      className={`pb-2 px-1 text-center font-mono ${
                        n.dateStr === therapyChangeDate ? 'text-amber-500' : ''
                      }`}
                    >
                      {n.dateStr === therapyChangeDate ? (
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-amber-500/40 decoration-dotted underline-offset-2">
                            {n.dateStr.slice(5)}
                          </TooltipTrigger>
                          <TooltipContent>
                            Therapy settings changed on this date
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        n.dateStr.slice(5)
                      )}
                    </th>
                  ))}
                  {showSparklines && (
                    <th className="pb-2 px-2 text-center font-medium">Trend</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeMetrics.map((m) => (
                  <tr key={m.key} className="border-b border-border/30">
                    <td
                      className="cursor-pointer py-1.5 pr-3 text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort('metric', m.key)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('metric', m.key); } }}
                      role="button"
                      tabIndex={0}
                      title={`Sort by ${m.label}`}
                    >
                      {m.label}
                      {sortArrow('metric', m.key)}
                    </td>
                    {sortedNights.map((n) => {
                      const val = m.get(n);
                      const color = getColor(val, m.thresholds);
                      return (
                        <td key={n.dateStr} className="px-1 py-1">
                          <Tooltip>
                            <TooltipTrigger
                              className={`block w-full rounded px-1.5 py-0.5 text-center font-mono tabular-nums ${color}`}
                            >
                              {val.toFixed(1)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {m.label}: {val.toFixed(2)}
                              {m.unit} on {n.dateStr}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                    {showSparklines && (
                      <td className="px-2 py-1 text-center">
                        <MiniSparkline values={sortedNights.map((n) => m.get(n))} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
});
