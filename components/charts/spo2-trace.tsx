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
  ReferenceArea,
  Line,
} from 'recharts';
import type { OximetryTraceData } from '@/lib/types';
import { formatElapsedTimeShort, formatWallClockTime } from '@/lib/waveform-utils';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';
import { GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE } from '@/lib/chart-theme';
import { downsampleForChart } from '@/lib/chart-downsample';

interface Props {
  trace: OximetryTraceData;
  showHR?: boolean;
  showODIEvents?: boolean;
  recordingStartTime?: Date | null;
}

function SpO2TooltipContent({ active, payload, label, recordingStartTime }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  recordingStartTime?: Date | null;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatWallClockTime(recordingStartTime, label)}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
          <span className="font-mono">{entry.name === 'SpO₂' ? `${entry.value}%` : `${entry.value} bpm`}</span>
        </p>
      ))}
    </div>
  );
}

export const SpO2Trace = memo(function SpO2Trace({
  trace,
  showHR = true,
  showODIEvents = true,
  recordingStartTime,
}: Props) {
  const points = trace.trace;
  const viewport = useSyncedViewport();

  // SpO2 uses time-based slicing via the synced viewport
  const data = useMemo(() => {
    if (points.length === 0) return [];

    const timeStart = viewport.clampedStartSec;
    const timeEnd = viewport.clampedEndSec;

    // Binary search for start index in SpO2 trace
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid]!.t < timeStart) lo = mid + 1;
      else hi = mid;
    }
    const startIdx = lo;

    lo = startIdx;
    hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid]!.t <= timeEnd) lo = mid + 1;
      else hi = mid;
    }
    const endIdx = lo;

    return downsampleForChart(points.slice(startIdx, endIdx).map((p) => ({
      t: p.t,
      spo2: p.spo2,
      hr: p.hr > 0 ? p.hr : undefined,
    })));
  }, [points, viewport.clampedStartSec, viewport.clampedEndSec]);

  // Filter ODI events to visible range, capped to prevent SVG OOM
  const MAX_VISIBLE_ODI = 100;
  const { visibleODI3, odiCapped } = useMemo(() => {
    if (!showODIEvents || data.length === 0) return { visibleODI3: [] as number[], odiCapped: false };
    const startT = data[0]!.t;
    const endT = data[data.length - 1]!.t;
    const filtered = trace.odi3Events.filter((t) => t >= startT && t <= endT);
    if (filtered.length <= MAX_VISIBLE_ODI) {
      return { visibleODI3: filtered, odiCapped: false };
    }
    const step = filtered.length / MAX_VISIBLE_ODI;
    const sampled = Array.from({ length: MAX_VISIBLE_ODI }, (_, i) => filtered[Math.round(i * step)]!);
    return { visibleODI3: sampled, odiCapped: true };
  }, [trace.odi3Events, showODIEvents, data]);

  // Determine SpO2 Y-axis domain
  const spo2Domain = useMemo(() => {
    if (points.length === 0) return [85, 100] as [number, number];
    let min = 100;
    for (const p of points) {
      if (p.spo2 < min) min = p.spo2;
    }
    return [Math.min(min - 2, 85), 100] as [number, number];
  }, [points]);

  const hasHR = useMemo(() => points.some((p) => p.hr > 0), [points]);
  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">SpO₂ &amp; Heart Rate Trace</h3>
      </div>
      <div
        ref={viewport.chartRef}
        className="relative h-[160px] w-full cursor-grab select-none touch-none sm:h-[200px]"
        role="application"
        aria-label="SpO2 and heart rate trace chart. Synchronised with other charts."
        tabIndex={0}
        onKeyDown={viewport.handleKeyDown}
      >
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
          airwaylab.app
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: showHR && hasHR ? 50 : 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFormatter}
              tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
              axisLine={{ stroke: AXIS_LINE_STROKE }}
              tickLine={false}
            />
            <YAxis
              yAxisId="spo2"
              domain={spo2Domain}
              tick={{ fill: 'hsl(213 94% 56%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: 'SpO₂ %', angle: -90, position: 'insideLeft', style: { fill: 'hsl(213 94% 56%)', fontSize: 9 } }}
            />
            {showHR && hasHR && (
              <YAxis
                yAxisId="hr"
                orientation="right"
                tick={{ fill: 'hsl(0 84% 60%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                label={{ value: 'bpm', angle: 90, position: 'insideRight', style: { fill: 'hsl(0 84% 60%)', fontSize: 9 } }}
              />
            )}
            <Tooltip content={<SpO2TooltipContent recordingStartTime={recordingStartTime} />} isAnimationActive={false} />

            {/* Reference lines */}
            <ReferenceLine yAxisId="spo2" y={90} stroke="hsl(0 84% 60% / 0.5)" strokeDasharray="4 2" />
            <ReferenceLine yAxisId="spo2" y={94} stroke="hsl(38 92% 50% / 0.3)" strokeDasharray="4 2" />

            {/* ODI-3 event markers */}
            {visibleODI3.map((eventT, i) => (
              <ReferenceArea
                key={`odi-${i}`}
                yAxisId="spo2"
                x1={eventT - 5}
                x2={eventT + 5}
                fill="hsl(0 84% 60% / 0.15)"
                stroke="hsl(0 84% 60% / 0.3)"
                strokeWidth={0.5}
              />
            ))}

            {/* SpO2 trace */}
            <Area
              yAxisId="spo2"
              type="monotone"
              dataKey="spo2"
              stroke="hsl(213 94% 56%)"
              fill="hsl(213 94% 56% / 0.1)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="SpO₂"
            />

            {/* Heart rate overlay */}
            {showHR && hasHR && (
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="hr"
                stroke="hsl(0 84% 60%)"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
                name="HR"
                connectNulls={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend */}
      <div className="flex flex-wrap gap-3 px-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 bg-blue-500" />
          SpO₂
        </span>
        {showHR && hasHR && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-red-500" />
            Heart Rate
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'hsl(0 84% 60% / 0.2)' }} />
          ODI-3
        </span>
        {odiCapped && (
          <span className="text-amber-500/80">Zoom in to see all events</span>
        )}
      </div>
    </div>
  );
});
