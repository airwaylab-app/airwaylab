'use client';

import { useState, useCallback } from 'react';
import { loadNightNotes, saveNightNotes } from '@/lib/night-notes';
import { contributeSymptoms } from '@/lib/contribute-symptoms';
import type { NightResult } from '@/lib/types';

const RATING_OPTIONS = [
  { value: 1, label: 'Terrible', emoji: '1' },
  { value: 2, label: 'Poor', emoji: '2' },
  { value: 3, label: 'OK', emoji: '3' },
  { value: 4, label: 'Good', emoji: '4' },
  { value: 5, label: 'Great', emoji: '5' },
] as const;

interface SymptomRatingProps {
  night: NightResult;
  value: number | null;
  onChange: (rating: number | null) => void;
  isContributeConsented: boolean;
}

export function SymptomRating({ night, value, onChange, isContributeConsented }: SymptomRatingProps) {
  const [saving, setSaving] = useState(false);

  const handleSelect = useCallback(
    (rating: number) => {
      const newValue = value === rating ? null : rating;
      onChange(newValue);

      // Persist to night notes
      const notes = loadNightNotes(night.dateStr);
      saveNightNotes(night.dateStr, { ...notes, symptomRating: newValue });

      // Contribute if consented and a rating was set (not cleared)
      if (newValue !== null && isContributeConsented) {
        setSaving(true);
        contributeSymptoms(night, newValue).finally(() => setSaving(false));
      }
    },
    [night, value, onChange, isContributeConsented]
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">How did you sleep?</p>
          <p className="text-[10px] text-muted-foreground/80">
            Rate this night to personalise your insights
          </p>
        </div>
        {saving && (
          <span className="text-[10px] text-muted-foreground/80 animate-pulse">Saving...</span>
        )}
      </div>
      <div className="mt-2 flex gap-1.5">
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-center transition-colors ${
              value === opt.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/40 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground'
            }`}
            aria-label={`Rate sleep as ${opt.label}`}
            aria-pressed={value === opt.value}
          >
            <span className="font-mono text-lg font-semibold tabular-nums">{opt.emoji}</span>
            <span className="text-[9px] leading-tight">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
