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
import type { PressurePoint } from '@/lib/waveform-types';
import type { MachineSettings } from '@/lib/types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChartViewport, ZOOM_PRESETS, PAN_STEP_FRACTION } from '@/hooks/use-chart-viewport';

interface Props {
  pressure: PressurePoint[];
  settings: MachineSettings;
  durationSeconds: number;
}

function PressureTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatElapsedTime(label)}</p>
      <p className="text-muted-foreground">
        <span style={{ color: 'hsl(142 71% 45%)' }}>Pressure:</span>{' '}
        <span className="font-mono">{payload[0].value.toFixed(1)}</span> cmH₂O
      </p>
    </div>
  );
}

export const DevicePressureChart = memo(function DevicePressureChart({
  pressure,
  settings,
  durationSeconds,
}: Props) {
  const bucketSeconds = pressure.length > 1 ? pressure[1].t - pressure[0].t : 2;

  const viewport = useChartViewport({
    dataLength: pressure.length,
    bucketSeconds,
    dateStr: '', // reset handled by parent
  });

  const data = useMemo(() =>
    pressure.slice(viewport.clampedStart, viewport.clampedEnd),
    [pressure, viewport.clampedStart, viewport.clampedEnd]
  );

  const visibleDuration = data.length > 0 ? data[data.length - 1].t - data[0].t : 0;
  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  const isCPAP = settings.papMode?.toUpperCase().includes('CPAP') && !settings.papMode?.toUpperCase().includes('APAP');
  const isAPAP = settings.papMode?.toUpperCase().includes('APAP') || settings.papMode?.toUpperCase().includes('AUTO');

  if (pressure.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">No pressure data found in this recording.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Pressure Delivery</CardTitle>
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
            <Button variant="ghost" size="sm" onClick={() => viewport.panBy(PAN_STEP_FRACTION)} disabled={viewport.clampedEnd >= pressure.length} className="h-6 w-6 p-0" aria-label="Pan right">
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
          aria-label="Pressure delivery chart. Use arrow keys to pan, +/- to zoom, Escape to reset."
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
                tick={{ fill: 'hsl(142 71% 45%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                label={{ value: 'cmH₂O', angle: -90, position: 'insideLeft', style: { fill: 'hsl(142 71% 45%)', fontSize: 9 } }}
              />
              <Tooltip content={<PressureTooltipContent />} isAnimationActive={false} />

              {/* Reference lines for pressure settings */}
              {isCPAP ? (
                <ReferenceLine y={settings.epap} stroke="hsl(142 71% 45% / 0.5)" strokeDasharray="4 2" label={{ value: `Set ${settings.epap}`, fill: 'hsl(142 71% 45%)', fontSize: 9, position: 'right' }} />
              ) : isAPAP ? (
                <>
                  <ReferenceLine y={settings.epap} stroke="hsl(142 71% 45% / 0.4)" strokeDasharray="4 2" label={{ value: `Min ${settings.epap}`, fill: 'hsl(142 71% 45%)', fontSize: 9, position: 'right' }} />
                  <ReferenceLine y={settings.ipap} stroke="hsl(213 94% 56% / 0.4)" strokeDasharray="4 2" label={{ value: `Max ${settings.ipap}`, fill: 'hsl(213 94% 56%)', fontSize: 9, position: 'right' }} />
                </>
              ) : (
                <>
                  <ReferenceLine y={settings.epap} stroke="hsl(142 71% 45% / 0.4)" strokeDasharray="4 2" label={{ value: `EPAP ${settings.epap}`, fill: 'hsl(142 71% 45%)', fontSize: 9, position: 'right' }} />
                  <ReferenceLine y={settings.ipap} stroke="hsl(213 94% 56% / 0.4)" strokeDasharray="4 2" label={{ value: `IPAP ${settings.ipap}`, fill: 'hsl(213 94% 56%)', fontSize: 9, position: 'right' }} />
                </>
              )}

              <Area
                type="monotone"
                dataKey="avg"
                stroke="hsl(142 71% 45%)"
                fill="hsl(142 71% 45% / 0.1)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                name="Pressure"
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
              const center = Math.round(fraction * pressure.length);
              const halfVisible = Math.round(visibleCount / 2);
              const newStart = Math.max(0, Math.min(center - halfVisible, pressure.length - visibleCount));
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
      </CardContent>
    </Card>
  );
});
