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
} from 'recharts';
import type { RespiratoryRatePoint } from '@/lib/waveform-types';
import { formatElapsedTimeShort, formatWallClockTime, sliceByTime } from '@/lib/waveform-utils';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';
import { CHART_COLORS, GRID_STROKE, AXIS_TICK_FILL, AXIS_LINE_STROKE, withAlpha } from '@/lib/chart-theme';
import { downsampleForChart } from '@/lib/chart-downsample';

interface Props {
  respiratoryRate: RespiratoryRatePoint[];
  recordingStartTime?: Date | null;
}

function RRTooltipContent({ active, payload, label, recordingStartTime }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  recordingStartTime?: Date | null;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{formatWallClockTime(recordingStartTime, label)}</p>
      <p className="text-muted-foreground">
        <span style={{ color: CHART_COLORS[5] }}>Respiratory Rate:</span>{' '}
        <span className="font-mono">{payload[0]!.value.toFixed(1)}</span> br/min
      </p>
    </div>
  );
}

export const RespiratoryRateChart = memo(function RespiratoryRateChart({ respiratoryRate, recordingStartTime }: Props) {
  const viewport = useSyncedViewport();
  const tickFormatter = useCallback((value: number) => formatElapsedTimeShort(value), []);

  const data = useMemo(() =>
    downsampleForChart(sliceByTime(respiratoryRate, viewport.clampedStartSec, viewport.clampedEndSec)),
    [respiratoryRate, viewport.clampedStartSec, viewport.clampedEndSec]
  );

  if (respiratoryRate.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
        Requires flow data — upload your SD card.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-medium text-muted-foreground">Respiratory Rate</h3>
      </div>
      <div
        ref={viewport.chartRef}
        className="relative h-[140px] w-full cursor-grab select-none touch-none sm:h-[160px]"
        role="application"
        aria-label="Respiratory rate chart. Synchronised with other charts."
        tabIndex={0}
        onKeyDown={viewport.handleKeyDown}
      >
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
          airwaylab.app
        </span>
        {viewport.dragSelectState && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-20 border-x border-blue-400/60 bg-blue-500/15"
            style={{
              left: `${viewport.dragSelectState.leftFraction * 100}%`,
              width: `${viewport.dragSelectState.widthFraction * 100}%`,
            }}
          />
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              tick={{ fill: CHART_COLORS[5], fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{ value: 'br/min', angle: -90, position: 'insideLeft', style: { fill: CHART_COLORS[5], fontSize: 9 } }}
            />
            <Tooltip content={<RRTooltipContent recordingStartTime={recordingStartTime} />} isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="avg"
              stroke={CHART_COLORS[5]}
              fill={withAlpha(CHART_COLORS[5], 0.1)}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="Respiratory Rate"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
