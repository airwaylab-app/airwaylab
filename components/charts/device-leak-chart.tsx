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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LeakPoint } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChartViewport, ZOOM_PRESETS, PAN_STEP_FRACTION } from '@/hooks/use-chart-viewport';

/** ResMed published threshold for clinically significant total leak */
const LEAK_THRESHOLD_LMIN = 24;
/** Cap Y-axis to prevent single spikes from compressing the chart */
const Y_AXIS_MAX = 80;

interface Props {
  leak: LeakPoint[];
  durationSeconds: number;
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
  durationSeconds,
}: Props) {
  const bucketSeconds = leak.length > 1 ? leak[1].t - leak[0].t : 2;

  const viewport = useChartViewport({
    dataLength: leak.length,
    bucketSeconds,
    dateStr: '',
  });

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

  const visibleDuration = data.length > 0 ? data[data.length - 1].t - data[0].t : 0;
  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  if (leak.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">No leak data found in this recording.</p>
          <p className="text-xs text-muted-foreground/60">Leak monitoring may not be available for all device models.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Leak Rate</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {ZOOM_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                onClick={() => viewport.zoomToPreset(p.seconds)}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {p.label}
              </Button>
            ))}
            <div className="mx-1 h-4 w-px bg-border/50" />
            <Button variant="ghost" size="sm" onClick={() => viewport.zoomIn()} className="h-6 w-6 p-0" aria-label="Zoom in">
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => viewport.zoomOut()} className="h-6 w-6 p-0" aria-label="Zoom out">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={viewport.resetZoom} disabled={viewport.isFullView} className="h-6 w-6 p-0" aria-label="Reset zoom">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <div className="mx-1 h-4 w-px bg-border/50" />
            <Button variant="ghost" size="sm" onClick={() => viewport.panBy(-PAN_STEP_FRACTION)} disabled={viewport.clampedStart === 0} className="h-6 w-6 p-0" aria-label="Pan left">
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => viewport.panBy(PAN_STEP_FRACTION)} disabled={viewport.clampedEnd >= leak.length} className="h-6 w-6 p-0" aria-label="Pan right">
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {data.length > 0 ? formatElapsedTime(data[0].t) : '0:00:00'}
            {' – '}
            {data.length > 0 ? formatElapsedTime(data[data.length - 1].t) : '0:00:00'}
          </span>
          <span>
            {formatElapsedTimeShort(visibleDuration)} of {formatElapsedTimeShort(durationSeconds)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={viewport.chartRef}
          className="relative h-[200px] w-full cursor-grab select-none sm:h-[260px]"
          role="application"
          aria-label="Leak rate chart. Use arrow keys to pan, +/- to zoom, Escape to reset."
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
                label={{ value: `${LEAK_THRESHOLD_LMIN} L/min — clinically significant`, fill: 'hsl(38 92% 50%)', fontSize: 9, position: 'right' }}
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

        {/* Minimap */}
        <div className="mt-2 px-10">
          <div
            className="relative h-2 w-full cursor-pointer rounded-full bg-border/30"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const fraction = (e.clientX - rect.left) / rect.width;
              const visibleCount = viewport.clampedEnd - viewport.clampedStart;
              const center = Math.round(fraction * leak.length);
              const halfVisible = Math.round(visibleCount / 2);
              const newStart = Math.max(0, Math.min(center - halfVisible, leak.length - visibleCount));
              viewport.setViewStart(newStart);
              viewport.setViewEnd(newStart + visibleCount);
            }}
            aria-label="Click to jump to position"
          >
            <div
              className="absolute top-0 h-full rounded-full bg-primary/40 transition-all duration-100"
              style={{ left: `${viewport.minimapLeft}%`, width: `${Math.max(2, viewport.minimapWidth)}%` }}
            />
          </div>
        </div>

        {/* Time above threshold */}
        <div className="mt-3 text-xs text-muted-foreground">
          Time above {LEAK_THRESHOLD_LMIN} L/min:{' '}
          <strong className="text-foreground">{timeAboveThreshold.minutes} min ({timeAboveThreshold.pct}%)</strong>
        </div>

        <div className="mt-2 text-[9px] text-muted-foreground/40">
          Scroll to zoom · Drag to pan · Arrow keys navigate · Esc resets
        </div>
      </CardContent>
    </Card>
  );
});
