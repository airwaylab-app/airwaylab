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
import type { PressurePoint } from '@/lib/waveform-types';
import type { MachineSettings } from '@/lib/types';
import { formatElapsedTimeShort, formatElapsedTime } from '@/lib/waveform-utils';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';
import { downsampleForChart } from '@/lib/chart-downsample';

interface Props {
  pressure: PressurePoint[];
  settings: MachineSettings;
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
}: Props) {
  const viewport = useSyncedViewport();

  const data = useMemo(() =>
    downsampleForChart(pressure.slice(viewport.clampedStart, viewport.clampedEnd)),
    [pressure, viewport.clampedStart, viewport.clampedEnd]
  );

  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  const isCPAP = settings.papMode?.toUpperCase().includes('CPAP') && !settings.papMode?.toUpperCase().includes('APAP');
  const isAPAP = settings.papMode?.toUpperCase().includes('APAP') || settings.papMode?.toUpperCase().includes('AUTO');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">Pressure Delivery</h3>
      </div>
      <div
        ref={viewport.chartRef}
        className="relative h-[140px] w-full cursor-grab select-none touch-none sm:h-[160px]"
        role="application"
        aria-label="Pressure delivery chart. Synchronised with other charts."
        tabIndex={0}
        onKeyDown={viewport.handleKeyDown}
      >
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
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
    </div>
  );
});
