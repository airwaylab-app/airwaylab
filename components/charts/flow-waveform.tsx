'use client';

import { memo, useMemo, useState, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WaveformData } from '@/lib/waveform-types';
import { formatElapsedTimeShort } from '@/lib/waveform-utils';

interface Props {
  waveform: WaveformData;
  showPressure?: boolean;
  showEvents?: boolean;
}

const EVENT_COLORS: Record<string, { fill: string; stroke: string }> = {
  'rera': { fill: 'hsl(0 84% 60% / 0.15)', stroke: 'hsl(0 84% 60% / 0.4)' },
  'flow-limitation': { fill: 'hsl(38 92% 50% / 0.12)', stroke: 'hsl(38 92% 50% / 0.35)' },
  'm-shape': { fill: 'hsl(213 94% 56% / 0.12)', stroke: 'hsl(213 94% 56% / 0.35)' },
};

function FlowTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;

  const h = Math.floor(label / 3600);
  const m = Math.floor((label % 3600) / 60);
  const s = Math.floor(label % 60);
  const time = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{time}</p>
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
  const [brushStart, setBrushStart] = useState<number | undefined>(undefined);
  const [brushEnd, setBrushEnd] = useState<number | undefined>(undefined);
  const brushRef = useRef<{ startIndex: number; endIndex: number } | null>(null);

  // Prepare chart data — merge flow and pressure into single array
  const data = useMemo(() => {
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

  // Filter events to visible range
  const visibleEvents = useMemo(() => {
    if (!showEvents) return [];
    const startT = brushStart !== undefined ? data[brushStart]?.t ?? 0 : 0;
    const endT = brushEnd !== undefined ? data[brushEnd]?.t ?? Infinity : Infinity;
    return waveform.events.filter(
      (e) => e.endSec >= startT && e.startSec <= endT
    );
  }, [waveform.events, showEvents, brushStart, brushEnd, data]);

  const handleBrushChange = useCallback((newRange: { startIndex?: number; endIndex?: number }) => {
    setBrushStart(newRange.startIndex);
    setBrushEnd(newRange.endIndex);
    brushRef.current = {
      startIndex: newRange.startIndex ?? 0,
      endIndex: newRange.endIndex ?? data.length - 1,
    };
  }, [data.length]);

  // Compute visible range duration for display
  const visibleDuration = useMemo(() => {
    const startIdx = brushStart ?? 0;
    const endIdx = brushEnd ?? data.length - 1;
    const startT = data[startIdx]?.t ?? 0;
    const endT = data[endIdx]?.t ?? 0;
    return endT - startT;
  }, [brushStart, brushEnd, data]);

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Flow Waveform</CardTitle>
          <span className="text-[10px] text-muted-foreground">
            Showing {formatElapsedTimeShort(visibleDuration)} of {formatElapsedTimeShort(waveform.durationSeconds)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-[280px] w-full sm:h-[360px]"
          role="img"
          aria-label={`Flow waveform chart for ${waveform.dateStr}. Duration: ${formatElapsedTimeShort(waveform.durationSeconds)}. ${waveform.events.length} events detected.`}
        >
          <span className="pointer-events-none absolute bottom-8 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
            airwaylab.app
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: showPressure ? 50 : 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(217 33% 15% / 0.3)"
                vertical={false}
              />
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
                yAxisId="flow"
                tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
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
                  tick={{ fill: 'hsl(142 71% 45%)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  label={{
                    value: 'cmH₂O',
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: 'hsl(142 71% 45%)', fontSize: 9 },
                  }}
                />
              )}
              <Tooltip
                content={<FlowTooltipContent />}
                isAnimationActive={false}
              />

              {/* Zero flow reference line */}
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

              {/* Flow envelope (min to max area) */}
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="flowMax"
                stroke="hsl(213 94% 56% / 0.6)"
                fill="hsl(213 94% 56% / 0.15)"
                strokeWidth={0.5}
                dot={false}
                isAnimationActive={false}
                name="Flow Max"
              />
              <Area
                yAxisId="flow"
                type="monotone"
                dataKey="flowMin"
                stroke="hsl(213 94% 56% / 0.4)"
                fill="hsl(217 33% 8%)"
                strokeWidth={0.5}
                dot={false}
                isAnimationActive={false}
                name="Flow Min"
              />

              {/* Pressure overlay */}
              {showPressure && (
                <Area
                  yAxisId="pressure"
                  type="monotone"
                  dataKey="pressure"
                  stroke="hsl(142 71% 45%)"
                  fill="hsl(142 71% 45% / 0.05)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Pressure"
                />
              )}

              {/* Brush zoom control */}
              <Brush
                dataKey="t"
                height={24}
                stroke="hsl(217 33% 25%)"
                fill="hsl(217 33% 8%)"
                tickFormatter={tickFormatter}
                onChange={handleBrushChange}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Event legend */}
        {showEvents && waveform.events.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'hsl(0 84% 60% / 0.3)' }} />
              RERA
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'hsl(38 92% 50% / 0.25)' }} />
              Flow Limitation
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: 'hsl(213 94% 56% / 0.25)' }} />
              M-Shape
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
