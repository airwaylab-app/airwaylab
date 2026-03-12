'use client';

import { getTrafficLight, getTrafficDotColor, type ThresholdDef } from '@/lib/thresholds';

interface Props {
  label: string;
  valueA: number | undefined;
  valueB: number | undefined;
  format?: 'default' | 'pct' | 'int';
  unit?: string;
  threshold?: ThresholdDef;
  lowerIsBetter?: boolean;
}

function fmtVal(v: number | undefined, format: Props['format']): string {
  if (v === undefined || v === null) return '—';
  switch (format) {
    case 'int':
      return Math.round(v).toString();
    case 'pct':
      return v.toFixed(1);
    default:
      return v.toFixed(2);
  }
}

export function ComparisonRow({
  label,
  valueA,
  valueB,
  format = 'default',
  unit = '',
  threshold,
  lowerIsBetter = true,
}: Props) {
  const a = valueA;
  const b = valueB;
  const aStr = fmtVal(a, format);
  const bStr = fmtVal(b, format);

  const aDot = a !== undefined && threshold
    ? getTrafficDotColor(getTrafficLight(a, threshold))
    : null;
  const bDot = b !== undefined && threshold
    ? getTrafficDotColor(getTrafficLight(b, threshold))
    : null;

  let delta: number | null = null;
  let deltaColor = 'text-muted-foreground';
  if (a !== undefined && b !== undefined) {
    delta = b - a;
    if (Math.abs(delta) > 0.05) {
      const isWorse = lowerIsBetter ? delta > 0 : delta < 0;
      deltaColor = isWorse ? 'text-red-400' : 'text-emerald-400';
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-border/20 py-2 text-xs last:border-0">
      <span className="min-w-[110px] text-muted-foreground truncate" title={label}>
        {label}
      </span>

      {/* Value A */}
      <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
        {aDot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${aDot}`} />}
        <span className="font-mono tabular-nums text-foreground">
          {aStr}{unit}
        </span>
      </div>

      {/* Value B */}
      <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
        {bDot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${bDot}`} />}
        <span className="font-mono tabular-nums text-foreground">
          {bStr}{unit}
        </span>
      </div>

      {/* Delta */}
      <div className="min-w-[60px] text-right">
        {delta !== null ? (
          <span className={`font-mono tabular-nums ${deltaColor}`}>
            {delta > 0 ? '+' : ''}{fmtVal(delta, format)}
          </span>
        ) : (
          <span className="text-muted-foreground/70">—</span>
        )}
      </div>
    </div>
  );
}
