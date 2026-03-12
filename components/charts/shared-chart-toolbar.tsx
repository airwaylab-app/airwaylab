'use client';

import { Button } from '@/components/ui/button';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';
import { ZOOM_PRESETS, PAN_STEP_FRACTION } from '@/hooks/use-chart-viewport';
import { formatElapsedTimeShort } from '@/lib/waveform-utils';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  durationSeconds: number;
  disabled?: boolean;
}

function getActivePreset(visibleDuration: number): string | null {
  // Find the preset whose duration is closest to the current visible duration
  let best: { label: string; diff: number } | null = null;
  for (const p of ZOOM_PRESETS) {
    const diff = Math.abs(p.seconds - visibleDuration);
    // Only match if within 20% of the preset duration
    if (diff / p.seconds <= 0.2 && (!best || diff < best.diff)) {
      best = { label: p.label, diff };
    }
  }
  return best?.label ?? null;
}

export function SharedChartToolbar({ durationSeconds, disabled = false }: Props) {
  const viewport = useSyncedViewport();

  const visibleStart = viewport.clampedStartSec;
  const visibleEnd = viewport.clampedEndSec;
  const visibleDuration = viewport.visibleDurationSec;
  const activePreset = viewport.isFullView ? null : getActivePreset(visibleDuration);

  return (
    <div
      className="flex flex-col gap-2"
      role="toolbar"
      aria-label="Chart navigation. Use arrow keys to pan, +/- to zoom, Escape to reset. Pinch to zoom on touch devices."
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {ZOOM_PRESETS.map((p) => {
            const isActive = activePreset === p.label;
            return (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => viewport.zoomToPreset(p.seconds)}
                disabled={disabled || p.seconds > durationSeconds}
                className={
                  isActive
                    ? 'h-6 rounded-full border-primary/50 bg-primary/15 px-2.5 text-[10px] font-medium text-primary'
                    : 'h-6 rounded-full border-border/60 px-2.5 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground'
                }
              >
                {p.label}
              </Button>
            );
          })}
          <div className="mx-1 h-4 w-px bg-border/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewport.zoomIn()}
            disabled={disabled}
            className="h-6 w-6 p-0"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewport.zoomOut()}
            disabled={disabled}
            className="h-6 w-6 p-0"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={viewport.resetZoom}
            disabled={disabled || viewport.isFullView}
            className="h-6 w-6 p-0"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewport.panBy(-PAN_STEP_FRACTION)}
            disabled={disabled || viewport.clampedStartSec === 0}
            className="h-6 w-6 p-0"
            aria-label="Pan left"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewport.panBy(PAN_STEP_FRACTION)}
            disabled={disabled || viewport.clampedEndSec >= viewport.durationSeconds}
            className="h-6 w-6 p-0"
            aria-label="Pan right"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground">
          <span>
            {formatElapsedTimeShort(visibleStart)}
            {' – '}
            {formatElapsedTimeShort(visibleEnd)}
          </span>
          <span className="ml-2 text-muted-foreground/80">
            {formatElapsedTimeShort(visibleDuration)} of {formatElapsedTimeShort(durationSeconds)}
          </span>
        </div>
      </div>

      {/* Minimap */}
      <div className="px-2">
        <div
          className="relative h-2 w-full cursor-pointer rounded-full bg-border/30 transition-colors hover:bg-border/50"
          onClick={(e) => {
            if (disabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const fraction = (e.clientX - rect.left) / rect.width;
            const centerSec = fraction * viewport.durationSeconds;
            const halfVisible = viewport.visibleDurationSec / 2;
            const newStart = Math.max(0, Math.min(centerSec - halfVisible, viewport.durationSeconds - viewport.visibleDurationSec));
            viewport.setViewStartSec(newStart);
            viewport.setViewEndSec(newStart + viewport.visibleDurationSec);
          }}
          aria-label="Minimap — click to jump to position"
        >
          <div
            className="absolute top-0 h-full rounded-full bg-primary/40 transition-all duration-100"
            style={{
              left: `${viewport.minimapLeft}%`,
              width: `${Math.max(2, viewport.minimapWidth)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
