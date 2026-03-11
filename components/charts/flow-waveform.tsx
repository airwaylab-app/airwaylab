'use client';

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WaveformData } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CHART_COLORS, GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE, withAlpha } from '@/lib/chart-theme';

interface Props {
  waveform: WaveformData;
  showPressure?: boolean;
  showEvents?: boolean;
}

const EVENT_COLORS: Record<string, { fill: string; stroke: string }> = {
  'rera': { fill: withAlpha(CHART_COLORS[4], 0.15), stroke: withAlpha(CHART_COLORS[4], 0.4) },
  'flow-limitation': { fill: withAlpha(CHART_COLORS[2], 0.12), stroke: withAlpha(CHART_COLORS[2], 0.35) },
  'm-shape': { fill: withAlpha(CHART_COLORS[0], 0.12), stroke: withAlpha(CHART_COLORS[0], 0.35) },
};

const ZOOM_PRESETS = [
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '2h', seconds: 7200 },
] as const;

const MIN_VISIBLE_POINTS = 20;
const PAN_STEP_FRACTION = 0.25; // Pan 25% of visible range per step
const ZOOM_FACTOR = 0.8; // Each zoom step shows 80% of previous range

function FlowTooltipContent({ active, payload, label }: {
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
          <span className="font-mono">{entry.value.toFixed(1)}</span>
          {entry.name === 'Pressure' ? ' cmH₂O' : ' L/min'}
        </p>
      ))}
    </div>
  );
}

export const FlowWaveform = memo(function FlowWaveform({
  waveform,
  showPressure = false,
  showEvents = true,
}: Props) {
  // Viewport state: indices into the data array
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(Infinity);
  const chartRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });

  // Full data array
  const allData = useMemo(() => {
    const pressureMap = new Map<number, number>();
    if (showPressure) {
      for (const p of waveform.pressure) {
        pressureMap.set(p.t, p.avg);
      }
    }

    return waveform.flow.map((f) => ({
      t: f.t,
      flowMin: f.min,
      flowMax: f.max,
      flowAvg: f.avg,
      pressure: pressureMap.get(f.t) ?? undefined,
    }));
  }, [waveform.flow, waveform.pressure, showPressure]);

  // Clamp viewport indices
  const clampedStart = Math.max(0, Math.min(viewStart, allData.length - MIN_VISIBLE_POINTS));
  const clampedEnd = Math.min(allData.length, Math.max(viewEnd, clampedStart + MIN_VISIBLE_POINTS));
  const isFullView = clampedStart === 0 && clampedEnd >= allData.length;

  // Visible data slice
  const data = useMemo(() =>
    allData.slice(clampedStart, clampedEnd),
    [allData, clampedStart, clampedEnd]
  );

  // Reset viewport when waveform changes
  useEffect(() => {
    setViewStart(0);
    setViewEnd(Infinity);
  }, [waveform.dateStr]);

  // Filter events to visible range
  const visibleEvents = useMemo(() => {
    if (!showEvents || data.length === 0) return [];
    const startT = data[0].t;
    const endT = data[data.length - 1].t;
    return waveform.events.filter(
      (e) => e.endSec >= startT && e.startSec <= endT
    );
  }, [waveform.events, showEvents, data]);

  // Visible duration
  const visibleDuration = data.length > 0 ? data[data.length - 1].t - data[0].t : 0;

  // ── Navigation helpers ──────────────────────────────────────

  const panBy = useCallback((fraction: number) => {
    const visibleCount = clampedEnd - clampedStart;
    const step = Math.max(1, Math.round(visibleCount * fraction));
    setViewStart((s) => {
      const newStart = Math.max(0, Math.min(s + step, allData.length - MIN_VISIBLE_POINTS));
      return newStart;
    });
    setViewEnd((_prev) => {
      const visCount = clampedEnd - clampedStart;
      const newStart = Math.max(0, Math.min(clampedStart + step, allData.length - MIN_VISIBLE_POINTS));
      return Math.min(allData.length, newStart + visCount);
    });
  }, [clampedStart, clampedEnd, allData.length]);

  const zoomIn = useCallback((centerFraction = 0.5) => {
    const visibleCount = clampedEnd - clampedStart;
    const newCount = Math.max(MIN_VISIBLE_POINTS, Math.round(visibleCount * ZOOM_FACTOR));
    const reduction = visibleCount - newCount;
    const leftReduction = Math.round(reduction * centerFraction);
    const rightReduction = reduction - leftReduction;
    setViewStart(Math.max(0, clampedStart + leftReduction));
    setViewEnd(Math.min(allData.length, clampedEnd - rightReduction));
  }, [clampedStart, clampedEnd, allData.length]);

  const zoomOut = useCallback((centerFraction = 0.5) => {
    const visibleCount = clampedEnd - clampedStart;
    const newCount = Math.min(allData.length, Math.round(visibleCount / ZOOM_FACTOR));
    const expansion = newCount - visibleCount;
    const leftExpansion = Math.round(expansion * centerFraction);
    const rightExpansion = expansion - leftExpansion;
    setViewStart(Math.max(0, clampedStart - leftExpansion));
    setViewEnd(Math.min(allData.length, clampedEnd + rightExpansion));
  }, [clampedStart, clampedEnd, allData.length]);

  const resetZoom = useCallback(() => {
    setViewStart(0);
    setViewEnd(Infinity);
  }, []);

  const zoomToPreset = useCallback((seconds: number) => {
    const bucketSeconds = allData.length > 1 ? allData[1].t - allData[0].t : 2;
    const pointsNeeded = Math.max(MIN_VISIBLE_POINTS, Math.round(seconds / bucketSeconds));
    // Center on current view
    const currentCenter = Math.round((clampedStart + clampedEnd) / 2);
    const halfPoints = Math.round(pointsNeeded / 2);
    const newStart = Math.max(0, currentCenter - halfPoints);
    const newEnd = Math.min(allData.length, newStart + pointsNeeded);
    setViewStart(newEnd - pointsNeeded < 0 ? 0 : newEnd - pointsNeeded);
    setViewEnd(newEnd);
  }, [allData, clampedStart, clampedEnd]);

  // ── Mouse wheel zoom ───────────────────────────────────────

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Compute zoom center based on mouse position
      const rect = el.getBoundingClientRect();
      const centerFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (e.deltaY < 0) {
        zoomIn(centerFraction);
      } else {
        zoomOut(centerFraction);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomIn, zoomOut]);

  // ── Drag to pan ────────────────────────────────────────────

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only left click
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartView.current = { start: clampedStart, end: clampedEnd };
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - dragStartX.current;
      const visibleCount = dragStartView.current.end - dragStartView.current.start;
      // Map pixel delta to index delta
      const indexDelta = Math.round((-dx / rect.width) * visibleCount);
      const newStart = Math.max(0, Math.min(
        dragStartView.current.start + indexDelta,
        allData.length - visibleCount
      ));
      setViewStart(newStart);
      setViewEnd(newStart + visibleCount);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        el.style.cursor = 'grab';
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampedStart, clampedEnd, allData.length]);

  // ── Keyboard navigation ────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        panBy(-PAN_STEP_FRACTION);
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        panBy(PAN_STEP_FRACTION);
        break;
      case 'ArrowUp':
      case '+':
      case '=':
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
        break;
      case 'ArrowDown':
      case '-':
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
        break;
      case 'Escape':
      case '0':
        e.preventDefault();
        e.stopPropagation();
        resetZoom();
        break;
    }
  }, [panBy, zoomIn, zoomOut, resetZoom]);

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  // Viewport position for the minimap indicator
  const minimapLeft = allData.length > 0 ? (clampedStart / allData.length) * 100 : 0;
  const minimapWidth = allData.length > 0 ? ((clampedEnd - clampedStart) / allData.length) * 100 : 100;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Flow Waveform</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Zoom presets */}
            {ZOOM_PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                onClick={() => zoomToPreset(p.seconds)}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {p.label}
              </Button>
            ))}
            <div className="mx-1 h-4 w-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => zoomIn()}
              className="h-6 w-6 p-0"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => zoomOut()}
              className="h-6 w-6 p-0"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              disabled={isFullView}
              className="h-6 w-6 p-0"
              aria-label="Reset zoom"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <div className="mx-1 h-4 w-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => panBy(-PAN_STEP_FRACTION)}
              disabled={clampedStart === 0}
              className="h-6 w-6 p-0"
              aria-label="Pan left"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => panBy(PAN_STEP_FRACTION)}
              disabled={clampedEnd >= allData.length}
              className="h-6 w-6 p-0"
              aria-label="Pan right"
            >
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
            {formatElapsedTimeShort(visibleDuration)} of {formatElapsedTimeShort(waveform.durationSeconds)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main chart area — captures mouse/keyboard events */}
        <div
          ref={chartRef}
          className="relative h-[280px] w-full cursor-grab select-none sm:h-[360px]"
          role="application"
          aria-label={`Flow waveform chart. Use arrow keys to pan, +/- to zoom, Escape to reset. Scroll wheel zooms. Drag to pan.`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
            airwaylab.app
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: showPressure ? 50 : 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_STROKE}
                vertical={false}
              />
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
                yAxisId="flow"
                tick={{ fill: AXIS_TICK_FILL, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                label={{
                  value: 'L/min',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: 'hsl(215 20% 45%)', fontSize: 9 },
                }}
              />
              {showPressure && (
                <YAxis
                  yAxisId="pressure"
                  orientation="right"
                  tick={{ fill: CHART_COLORS[1], fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  label={{
                    value: 'cmH₂O',
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: CHART_COLORS[1], fontSize: 9 },
                  }}
                />
              )}
              <Tooltip
                content={<FlowTooltipContent />}
                isAnimationActive={false}
              />

              <ReferenceLine
                yAxisId="flow"
                y={0}
                stroke="hsl(215 20% 40%)"
                strokeDasharray="4 2"
                strokeWidth={0.5}
              />

              {/* Event overlays */}
              {visibleEvents.map((event, i) => {
                const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS['flow-limitation'];
                return (
                  <ReferenceArea
                    key={`${event.type}-${i}`}
                    yAxisId="flow"
                    x1={event.startSec}
                    x2={event.endSec}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={0.5}
                    label={{
                      value: event.type === 'rera' ? 'R' : 'FL',
                      fill: 'hsl(215 20% 55%)',
                      fontSize: 8,
                      position: 'insideTopLeft',
                    }}
                  />
                );
              })}

              {/* Flow envelope */}
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="flowMax"
                stroke={withAlpha(CHART_COLORS[0], 0.6)}
                fill={withAlpha(CHART_COLORS[0], 0.15)}
                strokeWidth={0.5}
                dot={false}
                isAnimationActive={false}
                name="Flow Max"
              />
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="flowMin"
                stroke={withAlpha(CHART_COLORS[0], 0.4)}
                fill="hsl(217 33% 8%)"
                strokeWidth={0.5}
                dot={false}
                isAnimationActive={false}
                name="Flow Min"
              />

              {showPressure && (
                <Area
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="pressure"
                  stroke={CHART_COLORS[1]}
                  fill={withAlpha(CHART_COLORS[1], 0.05)}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Pressure"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Minimap overview bar */}
        <div className="mt-2 px-10">
          <div
            className="relative h-2 w-full cursor-pointer rounded-full bg-border/30"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const fraction = (e.clientX - rect.left) / rect.width;
              const visibleCount = clampedEnd - clampedStart;
              const center = Math.round(fraction * allData.length);
              const halfVisible = Math.round(visibleCount / 2);
              const newStart = Math.max(0, Math.min(center - halfVisible, allData.length - visibleCount));
              setViewStart(newStart);
              setViewEnd(newStart + visibleCount);
            }}
            aria-label="Click to jump to position"
          >
            <div
              className="absolute top-0 h-full rounded-full bg-primary/40 transition-all duration-100"
              style={{
                left: `${minimapLeft}%`,
                width: `${Math.max(2, minimapWidth)}%`,
              }}
            />
          </div>
        </div>

        {/* Event legend + keyboard hints */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {showEvents && waveform.events.length > 0 && (
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-chart-5/30" />
                RERA
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-chart-3/25" />
                Flow Limitation
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-chart-1/25" />
                M-Shape
              </span>
            </div>
          )}
          <div className="text-[9px] text-muted-foreground/40">
            Scroll to zoom · Drag to pan · Arrow keys navigate · Esc resets
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
