'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const STAGE_LABELS: Array<{ match: string; label: string }> = [
  { match: 'Parsing settings', label: 'Reading device settings' },
  { match: 'Parsing EDF files', label: 'Reading SD card data' },
  { match: 'Analyzing night', label: 'Analyzing breath patterns' },
  { match: 'Analyzing nights', label: 'Analyzing breath patterns' },
  { match: 'Finalizing', label: 'Generating insights' },
  { match: 'Detecting BMC', label: 'Detecting device type' },
  { match: 'Parsed', label: 'Reading session data' },
  { match: 'Running analysis', label: 'Analyzing breath patterns' },
];

function getFriendlyLabel(stage: string): string {
  const entry = STAGE_LABELS.find((s) => stage.startsWith(s.match));
  return entry ? entry.label : stage;
}

interface ProgressDisplayProps {
  current: number;
  total: number;
  stage: string;
  isAuthenticated?: boolean;
}

export function ProgressDisplay({ current, total, stage, isAuthenticated }: ProgressDisplayProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const friendlyLabel = getFriendlyLabel(stage);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    setIsOverdue(false);
    const timer = setTimeout(() => {
      setIsOverdue(true);
    }, 90_000);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{friendlyLabel}</span>
      </div>

      {/* Custom progress bar */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${friendlyLabel}: ${pct}% complete`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">
          {current} / {total}
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isOverdue
          ? 'Taking a little longer than usual — hang tight, still working...'
          : 'Usually 30–90 seconds depending on SD card size'}
      </p>

      {pct > 30 && !isAuthenticated && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
          After analysis, you&apos;ll have the option to contribute your anonymised scores to help PAP research.
        </p>
      )}
    </div>
  );
}
