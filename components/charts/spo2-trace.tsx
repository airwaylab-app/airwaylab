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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { OximetryTraceData } from '@/lib/types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChartViewport, ZOOM_PRESETS, PAN_STEP_FRACTION } from '@/hooks/use-chart-viewport';

interface Props {
  trace: OximetryTraceData;
  showHR?: boolean;
  showODIEvents?: boolean;
}

function SpO2TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatElapsedTime(label)}</p>
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
}: Props) {
  const points = trace.trace;
  const bucketSeconds = points.length > 1 ? points[1].t - points[0].t : 2;

  const viewport = useChartViewport({
    dataLength: points.length,
    bucketSeconds,
    dateStr: '',
  });

  const data = useMemo(() =>
    points.slice(viewport.clampedStart, viewport.clampedEnd).map((p) => ({
      t: p.t,
      spo2: p.spo2,
      hr: p.hr > 0 ? p.hr : undefined,
    })),
    [points, viewport.clampedStart, viewport.clampedEnd]
  );

  // Filter ODI events to visible range
  const visibleODI3 = useMemo(() => {
    if (!showODIEvents || data.length === 0) return [];
    const startT = data[0].t;
    const endT = data[data.length - 1].t;
    return trace.odi3Events.filter((t) => t >= startT && t <= endT);
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
  const visibleDuration = data.length > 0 ? data[data.length - 1].t - data[0].t : 0;
  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">SpO₂ &amp; Heart Rate Trace</CardTitle>
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
            <Button variant="ghost" size="sm" onClick={() => viewport.panBy(PAN_STEP_FRACTION)} disabled={viewport.clampedEnd >= points.length} className="h-6 w-6 p-0" aria-label="Pan right">
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
            {formatElapsedTimeShort(visibleDuration)} of {formatElapsedTimeShort(trace.durationSeconds)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={viewport.chartRef}
          className="relative h-[280px] w-full cursor-grab select-none sm:h-[360px]"
          role="application"
          aria-label="SpO2 and heart rate trace chart. Use arrow keys to pan, +/- to zoom, Escape to reset."
          tabIndex={0}
          onKeyDown={viewport.handleKeyDown}
        >
          <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
            airwaylab.app
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: showHR && hasHR ? 50 : 10, left: 0, bottom: 5 }}>
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
              <Tooltip content={<SpO2TooltipContent />} isAnimationActive={false} />

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

        {/* Minimap */}
        <div className="mt-2 px-10">
          <div
            className="relative h-2 w-full cursor-pointer rounded-full bg-border/30"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const fraction = (e.clientX - rect.left) / rect.width;
              const visibleCount = viewport.clampedEnd - viewport.clampedStart;
              const center = Math.round(fraction * points.length);
              const halfVisible = Math.round(visibleCount / 2);
              const newStart = Math.max(0, Math.min(center - halfVisible, points.length - visibleCount));
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

        {/* Legend + keyboard hints */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
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
              ODI-3 event
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ borderTop: '1px dashed hsl(0 84% 60% / 0.5)' }} />
              90% threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3" style={{ borderTop: '1px dashed hsl(38 92% 50% / 0.3)' }} />
              94% threshold
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground/40">
            Scroll to zoom · Drag to pan · Arrow keys navigate · Esc resets
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
