'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { X } from 'lucide-react';
import type { NightResult } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';

interface MetricDetailModalProps {
  label: string;
  unit?: string;
  nights: NightResult[];
  selectedDate: string;
  accessor: (n: NightResult) => number | undefined;
  threshold?: ThresholdDef;
  description?: string;
  onClose: () => void;
}

export function MetricDetailModal({
  label,
  unit,
  nights,
  selectedDate,
  accessor,
  threshold,
  description,
  onClose,
}: MetricDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Build chart data (chronological order)
  const data = [...nights]
    .reverse()
    .map((n) => {
      const val = accessor(n);
      return {
        date: n.dateStr.slice(5),
        fullDate: n.dateStr,
        value: val !== undefined ? +val.toFixed(1) : null,
        isSelected: n.dateStr === selectedDate,
      };
    })
    .filter((d) => d.value !== null);

  if (data.length === 0) return null;

  const values = data.map((d) => d.value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Determine thresholds for reference lines
  const thresholdLines: { value: number; label: string; color: string }[] = [];
  if (threshold) {
    thresholdLines.push({
      value: threshold.green,
      label: 'Normal',
      color: 'hsl(142 71% 45%)',
    });
    thresholdLines.push({
      value: threshold.amber,
      label: 'Borderline',
      color: 'hsl(38 92% 50%)',
    });
  }

  const unitLabel = unit ? ` (${unit})` : '';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-up"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${label} trend chart`}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {label}{unitLabel}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chart */}
        <div className="px-5 py-4">
          {data.length > 1 ? (
            <div className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(217 33% 15% / 0.3)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(217 33% 15%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(217 33% 8%)',
                      border: '1px solid hsl(217 33% 15%)',
                      borderRadius: '0.5rem',
                      fontSize: 12,
                      color: 'hsl(210 40% 93%)',
                    }}
                    labelFormatter={(l) => {
                      const item = data.find((d) => d.date === l);
                      return item?.fullDate ?? l;
                    }}
                    formatter={(value) => [
                      `${value}${unit ? ' ' + unit : ''}`,
                      label,
                    ]}
                  />
                  {thresholdLines.map((t) => (
                    <ReferenceLine
                      key={t.label}
                      y={t.value}
                      stroke={t.color}
                      strokeDasharray="6 3"
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      label={{
                        value: t.label,
                        fill: t.color,
                        fontSize: 9,
                        position: 'right',
                      }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={label}
                    stroke="hsl(213 94% 56%)"
                    strokeWidth={2}
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, payload } = props as {
                        cx: number;
                        cy: number;
                        payload: { isSelected: boolean };
                      };
                      const isActive = payload?.isSelected;
                      return (
                        <circle
                          key={`${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={isActive ? 5 : 3}
                          fill={isActive ? 'hsl(38 92% 50%)' : 'hsl(213 94% 56%)'}
                          stroke={isActive ? 'hsl(38 92% 50%)' : 'none'}
                          strokeWidth={isActive ? 2 : 0}
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Only one night of data — upload more nights to see trends.
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
          <span>
            Min: <strong className="font-mono text-foreground">{min.toFixed(1)}</strong>
          </span>
          <span>
            Avg: <strong className="font-mono text-foreground">{avg.toFixed(1)}</strong>
          </span>
          <span>
            Max: <strong className="font-mono text-foreground">{max.toFixed(1)}</strong>
          </span>
          <span className="ml-auto">
            {data.length} night{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
