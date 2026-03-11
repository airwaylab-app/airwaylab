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
import type { WaveformData } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { CHART_COLORS, GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE, withAlpha } from '@/lib/chart-theme';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';

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
  const viewport = useSyncedViewport();

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

  // Visible data slice using synced viewport
  const data = useMemo(() =>
    allData.slice(viewport.clampedStart, viewport.clampedEnd),
    [allData, viewport.clampedStart, viewport.clampedEnd]
  );

  // Filter events to visible range
  const visibleEvents = useMemo(() => {
    if (!showEvents || data.length === 0) return [];
    const startT = data[0].t;
    const endT = data[data.length - 1].t;
    return waveform.events.filter(
      (e) => e.endSec >= startT && e.startSec <= endT
    );
  }, [waveform.events, showEvents, data]);

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">Flow Waveform</h3>
        {showEvents && (
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-chart-5/30" />
              RERA
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-chart-3/25" />
              FL
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-chart-1/25" />
              M
            </span>
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
              const labelText = event.type === 'rera' ? 'R' : event.type === 'm-shape' ? 'M' : 'FL';
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
                    value: labelText,
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
    </div>
  );
});
