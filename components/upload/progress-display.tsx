'use client';

import { Loader2 } from 'lucide-react';

interface ProgressDisplayProps {
  current: number;
  total: number;
  stage: string;
}

export function ProgressDisplay({ current, total, stage }: ProgressDisplayProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{stage}</span>
      </div>

      {/* Custom progress bar */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${stage}: ${pct}% complete`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {current} / {total} steps
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>

      {pct > 30 && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground/50">
          After analysis, you&apos;ll have the option to contribute your anonymised scores to help CPAP research.
        </p>
      )}
    </div>
  );
}
