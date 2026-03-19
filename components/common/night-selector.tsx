'use client';

import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NightSelectorProps {
  dates: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()]!;
}

export function NightSelector({ dates, selectedIndex, onChange }: NightSelectorProps) {
  // ← / → arrow key navigation (when no input/textarea is focused)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange(Math.min(selectedIndex + 1, dates.length - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(Math.max(selectedIndex - 1, 0));
      }
    },
    [dates.length, selectedIndex, onChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (dates.length <= 1) return null;

  const current = dates[selectedIndex]!;
  const dayOfWeek = getDayOfWeek(current);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(Math.min(selectedIndex + 1, dates.length - 1))}
        disabled={selectedIndex >= dates.length - 1}
        className="h-8 w-8 p-0"
        aria-label="Previous night"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date display with dropdown for 5+ nights */}
      {dates.length >= 5 ? (
        <div className="relative">
          <select
            value={selectedIndex}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 appearance-none rounded-md border border-border/50 bg-card pl-7 pr-3 font-mono text-sm font-medium tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Select night"
          >
            {dates.map((d, i) => (
              <option key={d} value={i}>
                {getDayOfWeek(d)} {d}
              </option>
            ))}
          </select>
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      ) : (
        <span className="min-w-[9rem] text-center font-mono text-sm font-medium tabular-nums">
          <span className="text-muted-foreground">{dayOfWeek}</span>{' '}
          {current}
        </span>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(Math.max(selectedIndex - 1, 0))}
        disabled={selectedIndex <= 0}
        className="h-8 w-8 p-0"
        aria-label="Next night"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-1 text-xs text-muted-foreground">
        {selectedIndex + 1}/{dates.length}
      </span>
      <span className="ml-1 hidden text-[10px] text-muted-foreground/70 lg:inline" aria-hidden>
        ← → keys
      </span>
    </div>
  );
}
