'use client';

import { memo, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { LeakPoint } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';

/** ResMed published threshold for clinically significant total leak */
const LEAK_THRESHOLD_LMIN = 24;
/** Cap Y-axis to prevent single spikes from compressing the chart */
const Y_AXIS_MAX = 80;

interface Props {
  leak: LeakPoint[];
}

function LeakTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatElapsedTime(label)}</p>
      <p className="text-muted-foreground">
        <span style={{ color: 'hsl(280 60% 55%)' }}>Leak:</span>{' '}
        <span className="font-mono">{payload[0].value.toFixed(1)}</span> L/min
      </p>
    </div>
  );
}

export const DeviceLeakChart = memo(function DeviceLeakChart({
  leak,
}: Props) {
  const viewport = useSyncedViewport();
  const bucketSeconds = leak.length > 1 ? leak[1].t - leak[0].t : 2;

  const data = useMemo(() => {
    const sliced = leak.slice(viewport.clampedStart, viewport.clampedEnd);
    return sliced.map((l) => ({
      t: l.t,
      avg: Math.min(l.avg, Y_AXIS_MAX),
      aboveThreshold: l.avg > LEAK_THRESHOLD_LMIN ? Math.min(l.avg, Y_AXIS_MAX) : undefined,
    }));
  }, [leak, viewport.clampedStart, viewport.clampedEnd]);

  // Compute time above threshold
  const timeAboveThreshold = useMemo(() => {
    let count = 0;
    for (const l of leak) {
      if (l.avg > LEAK_THRESHOLD_LMIN) count++;
    }
    const minutes = (count * bucketSeconds) / 60;
    const pct = leak.length > 0 ? (count / leak.length) * 100 : 0;
    return { minutes: Math.round(minutes), pct: pct.toFixed(1) };
  }, [leak, bucketSeconds]);

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">
          Leak Rate
          <span className="ml-2 text-[10px] font-normal text-muted-foreground/60">
            &gt;{LEAK_THRESHOLD_LMIN}: {timeAboveThreshold.minutes}min ({timeAboveThreshold.pct}%)
          </span>
        </h3>
      </div>
      <div
        ref={viewport.chartRef}
        className="relative h-[140px] w-full cursor-grab select-none touch-none sm:h-[160px]"
        role="application"
        aria-label="Leak rate chart. Synchronised with other charts."
        tabIndex={0}
        onKeyDown={viewport.handleKeyDown}
      >
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
          airwaylab.app
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 15% / 0.3)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFormatter}
              tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
              axisLine={{ stroke: 'hsl(217 33% 15%)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, Y_AXIS_MAX]}
              tick={{ fill: 'hsl(280 60% 55%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: 'L/min', angle: -90, position: 'insideLeft', style: { fill: 'hsl(280 60% 55%)', fontSize: 9 } }}
            />
            <Tooltip content={<LeakTooltipContent />} isAnimationActive={false} />

            {/* Threshold line */}
            <ReferenceLine
              y={LEAK_THRESHOLD_LMIN}
              stroke="hsl(38 92% 50% / 0.6)"
              strokeDasharray="4 2"
              label={{ value: `${LEAK_THRESHOLD_LMIN} L/min`, fill: 'hsl(38 92% 50%)', fontSize: 9, position: 'right' }}
            />

            {/* Above-threshold area (amber) */}
            <Area
              type="monotone"
              dataKey="aboveThreshold"
              stroke="hsl(38 92% 50% / 0.6)"
              fill="hsl(38 92% 50% / 0.15)"
              strokeWidth={0}
              dot={false}
              isAnimationActive={false}
              name="Above Threshold"
            />

            {/* Main leak trace */}
            <Area
              type="monotone"
              dataKey="avg"
              stroke="hsl(280 60% 55%)"
              fill="hsl(280 60% 55% / 0.1)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="Leak"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
