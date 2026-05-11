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
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { FlowSample, PressurePoint, WaveformEvent } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatWallClockTime } from '@/lib/waveform-utils';
import { CHART_COLORS, GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE, withAlpha } from '@/lib/chart-theme';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';
import { downsampleForChart } from '@/lib/chart-downsample';

export type EventType = WaveformEvent['type'];

interface Props {
  /** Pre-decimated flow samples for the visible range */
  flow: FlowSample[];
  /** Pre-sliced pressure data for the visible range (if available) */
  pressure: PressurePoint[];
  /** All events for the night */
  events: WaveformEvent[];
  /** Set of visible event types. If undefined, all events are shown. Empty set = no events. */
  visibleEventTypes?: Set<EventType>;
  /** Recording start time from EDF header — enables wall-clock timestamps in tooltips. */
  recordingStartTime?: Date | null;
}

const EVENT_COLORS: Record<string, { fill: string; stroke: string }> = {
  // Algorithm-detected
  'rera': { fill: withAlpha(CHART_COLORS[4], 0.15), stroke: withAlpha(CHART_COLORS[4], 0.4) },
  'flow-limitation': { fill: withAlpha(CHART_COLORS[2], 0.12), stroke: withAlpha(CHART_COLORS[2], 0.35) },
  'm-shape': { fill: withAlpha(CHART_COLORS[0], 0.12), stroke: withAlpha(CHART_COLORS[0], 0.35) },
  // Machine-recorded
  'obstructive-apnea': { fill: 'hsl(0 70% 50% / 0.18)', stroke: 'hsl(0 70% 50% / 0.45)' },
  'central-apnea': { fill: 'hsl(180 60% 45% / 0.18)', stroke: 'hsl(180 60% 45% / 0.45)' },
  'hypopnea': { fill: 'hsl(220 70% 55% / 0.15)', stroke: 'hsl(220 70% 55% / 0.40)' },
  'unclassified-apnea': { fill: 'hsl(45 80% 50% / 0.15)', stroke: 'hsl(45 80% 50% / 0.40)' },
};

const EVENT_SHORT_LABELS: Record<string, string> = {
  'rera': 'R',
  'flow-limitation': 'FL',
  'm-shape': 'M',
  'obstructive-apnea': 'OA',
  'central-apnea': 'CA',
  'hypopnea': 'H',
  'unclassified-apnea': 'UA',
};

/** Legend items grouped by source */
const MACHINE_LEGEND: { type: EventType; label: string; colorClass: string }[] = [
  { type: 'obstructive-apnea', label: 'OA', colorClass: 'hsl(0 70% 50% / 0.35)' },
  { type: 'central-apnea', label: 'CA', colorClass: 'hsl(180 60% 45% / 0.35)' },
  { type: 'hypopnea', label: 'H', colorClass: 'hsl(220 70% 55% / 0.35)' },
  { type: 'unclassified-apnea', label: 'UA', colorClass: 'hsl(45 80% 50% / 0.35)' },
];

const ALGORITHM_LEGEND: { type: EventType; label: string; tailwindClass: string }[] = [
  { type: 'rera', label: 'RERA', tailwindClass: 'bg-chart-5/30' },
  { type: 'flow-limitation', label: 'FL', tailwindClass: 'bg-chart-3/25' },
  { type: 'm-shape', label: 'M', tailwindClass: 'bg-chart-1/25' },
];

function FlowTooltipContent({ active, payload, label, recordingStartTime }: {
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
          <span className="font-mono">{entry.value.toFixed(1)}</span>
          {entry.name === 'Pressure' ? ' cmH₂O' : ' L/min'}
        </p>
      ))}
    </div>
  );
}

export const FlowWaveform = memo(function FlowWaveform({
  flow,
  pressure,
  events,
  visibleEventTypes,
  recordingStartTime,
}: Props) {
  const viewport = useSyncedViewport();
  const hasPressure = pressure.length > 0;

  // Determine which types are active
  const activeTypes: Set<EventType> | null = visibleEventTypes ?? null;
  const anyEventsVisible = activeTypes === null || activeTypes.size > 0;

  // Build chart data from pre-decimated flow + pressure
  const allData = useMemo(() => {
    const pressureMap = new Map<number, number>();
    if (hasPressure) {
      for (const p of pressure) {
        pressureMap.set(p.t, p.avg);
      }
    }

    return flow.map((f) => ({
      t: f.t,
      flow: f.value,
      pressure: pressureMap.get(f.t) ?? undefined,
    }));
  }, [flow, pressure, hasPressure]);

  // Apply downsampleForChart (1,500-point Recharts cap)
  const data = useMemo(() => downsampleForChart(allData), [allData]);

  // Filter events to visible range + active types, capped to prevent SVG OOM
  const MAX_VISIBLE_EVENTS = 100;
  const { visibleEvents, eventsCapped } = useMemo(() => {
    if (!anyEventsVisible || data.length === 0) return { visibleEvents: [] as typeof events, eventsCapped: false };
    const startT = data[0]!.t;
    const endT = data[data.length - 1]!.t;
    const filtered = events.filter(
      (e) => e.endSec >= startT && e.startSec <= endT && (activeTypes === null || activeTypes.has(e.type))
    );
    if (filtered.length <= MAX_VISIBLE_EVENTS) {
      return { visibleEvents: filtered, eventsCapped: false };
    }
    const step = filtered.length / MAX_VISIBLE_EVENTS;
    const sampled = Array.from({ length: MAX_VISIBLE_EVENTS }, (_, i) => filtered[Math.round(i * step)]!);
    return { visibleEvents: sampled, eventsCapped: true };
  }, [events, anyEventsVisible, activeTypes, data]);

  // Determine which event types exist in the data (for legend display)
  const presentTypes = useMemo(() => {
    const types = new Set<EventType>();
    for (const e of events) types.add(e.type);
    return types;
  }, [events]);

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  // Build legend items from types that exist in data and are visible
  const machineItems = MACHINE_LEGEND.filter((item) =>
    presentTypes.has(item.type) && (activeTypes === null || activeTypes.has(item.type))
  );
  const algorithmItems = ALGORITHM_LEGEND.filter((item) =>
    presentTypes.has(item.type) && (activeTypes === null || activeTypes.has(item.type))
  );
  const hasVisibleLegend = machineItems.length > 0 || algorithmItems.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">Flow Waveform</h3>
        {hasVisibleLegend && (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {machineItems.map((item) => (
              <span key={item.type} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{ backgroundColor: item.colorClass }}
                />
                {item.label}
              </span>
            ))}
            {algorithmItems.map((item) => (
              <span key={item.type} className="flex items-center gap-1">
                <span className={`inline-block h-2 w-3 rounded-sm ${item.tailwindClass}`} />
                {item.label}
              </span>
            ))}
            {eventsCapped && (
              <span className="text-amber-500/80">Zoom in to see all events</span>
            )}
          </div>
        )}
      </div>
      <div
        ref={viewport.chartRef}
        className="relative h-[200px] w-full cursor-grab select-none touch-none sm:h-[240px]"
        role="application"
        aria-label="Flow waveform chart. Synchronised with other charts."
        tabIndex={0}
        onKeyDown={viewport.handleKeyDown}
      >
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
          airwaylab.app
        </span>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: hasPressure ? 50 : 10, left: 0, bottom: 5 }}
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
            {hasPressure && (
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
              content={<FlowTooltipContent recordingStartTime={recordingStartTime} />}
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
            {visibleEvents.map((event) => {
              const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS['flow-limitation']!;
              const labelText = EVENT_SHORT_LABELS[event.type] ?? event.type;
              return (
                <ReferenceArea
                  key={`${event.type}-${event.startSec}-${event.endSec}`}
                  yAxisId="flow"
                  x1={event.startSec}
                  x2={event.endSec}
                  fill={colors?.fill}
                  stroke={colors?.stroke}
                  strokeWidth={0.5}
                  label={{
                    value: labelText,
                    fill: 'hsl(215 20% 55%)',
                    fontSize: 8,
                    position: 'insideTopLeft',
                  }}
                />
              );
            })}

            {/* Flow trace — single line of actual measured values */}
            <Area
              yAxisId="flow"
              type="monotone"
              dataKey="flow"
              stroke={withAlpha(CHART_COLORS[0], 0.8)}
              fill={withAlpha(CHART_COLORS[0], 0.1)}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              name="Flow"
            />

            {hasPressure && (
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
    </div>
  );
});
