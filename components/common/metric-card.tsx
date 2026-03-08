'use client';

import { memo } from 'react';
import type { ThresholdDef } from '@/lib/thresholds';
import { getTrafficLight, getTrafficDotColor, getTrafficBg } from '@/lib/thresholds';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  format?: string;
  unit?: string;
  threshold?: ThresholdDef;
  previousValue?: number;
  compact?: boolean;
}

function formatValue(value: number, format?: string): string {
  if (value == null || isNaN(value)) return '—';
  if (format === 'int') return Math.round(value).toString();
  if (format === 'pct') return value.toFixed(0) + '%';
  return value.toFixed(1);
}

export const MetricCard = memo(function MetricCard({
  label,
  value,
  format,
  unit,
  threshold,
  previousValue,
  compact,
}: MetricCardProps) {
  const light = threshold ? getTrafficLight(value, threshold) : null;
  const dotColor = light ? getTrafficDotColor(light) : '';
  const bgColor = light ? getTrafficBg(light) : 'bg-card';
  const lightLabel = light === 'good' ? 'Normal' : light === 'warn' ? 'Borderline' : light === 'bad' ? 'Elevated' : null;

  const trend = previousValue !== undefined
    ? value < previousValue - 0.1
      ? 'down'
      : value > previousValue + 0.1
        ? 'up'
        : 'flat'
    : null;

  // For lower-is-better metrics, down is good
  const trendIsPositive = threshold?.lowerIsBetter
    ? trend === 'down'
    : trend === 'up';

  return (
    <div
      className={`rounded-xl border border-border/50 transition-colors ${bgColor} ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
        {light && (
          <span
            className={`inline-block h-2 w-2 rounded-full ${dotColor}`}
            role="img"
            aria-label={lightLabel ?? undefined}
            title={lightLabel ?? undefined}
          />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 sm:mt-1.5 sm:gap-2">
        <span className={`font-mono font-semibold tabular-nums ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
          {formatValue(value, format)}
        </span>
        {unit && (
          <span className="text-[10px] text-muted-foreground sm:text-xs">{unit}</span>
        )}
        {trend && (
          <span
            className={trendIsPositive ? 'text-emerald-500' : trend === 'flat' ? 'text-muted-foreground' : 'text-red-400'}
            role="img"
            aria-label={`Trend: ${trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable'}${trendIsPositive ? ' (improving)' : trend === 'flat' ? '' : ' (worsening)'}`}
          >
            {trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            {trend === 'flat' && <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
          </span>
        )}
      </div>
    </div>
  );
});
