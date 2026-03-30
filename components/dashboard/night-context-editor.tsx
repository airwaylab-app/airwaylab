'use client';

import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { saveNightNotes } from '@/lib/night-notes';
import type { NightResult, NightNotes, CaffeineLevel, AlcoholLevel, CongestionLevel, SleepPosition, StressLevel, ExerciseLevel } from '@/lib/types';

// ============================================================
// Field definitions — label, key, and pill options for each enum
// ============================================================

interface FieldDef<T extends string> {
  key: keyof NightNotes;
  label: string;
  options: readonly { value: T; label: string }[];
}

const FIELDS: readonly FieldDef<string>[] = [
  {
    key: 'caffeine',
    label: 'Caffeine',
    options: [
      { value: 'none', label: 'None' },
      { value: 'before-noon', label: 'Before noon' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
    ] as const satisfies readonly { value: CaffeineLevel; label: string }[],
  },
  {
    key: 'alcohol',
    label: 'Alcohol',
    options: [
      { value: 'none', label: 'None' },
      { value: '1-2', label: '1-2 drinks' },
      { value: '3+', label: '3+' },
    ] as const satisfies readonly { value: AlcoholLevel; label: string }[],
  },
  {
    key: 'congestion',
    label: 'Congestion',
    options: [
      { value: 'none', label: 'None' },
      { value: 'mild', label: 'Mild' },
      { value: 'severe', label: 'Severe' },
    ] as const satisfies readonly { value: CongestionLevel; label: string }[],
  },
  {
    key: 'position',
    label: 'Position',
    options: [
      { value: 'back', label: 'Back' },
      { value: 'side', label: 'Side' },
      { value: 'stomach', label: 'Stomach' },
      { value: 'mixed', label: 'Mixed' },
    ] as const satisfies readonly { value: SleepPosition; label: string }[],
  },
  {
    key: 'stress',
    label: 'Stress',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'high', label: 'High' },
    ] as const satisfies readonly { value: StressLevel; label: string }[],
  },
  {
    key: 'exercise',
    label: 'Exercise',
    options: [
      { value: 'none', label: 'None' },
      { value: 'light', label: 'Light' },
      { value: 'intense', label: 'Intense' },
    ] as const satisfies readonly { value: ExerciseLevel; label: string }[],
  },
] as const;

// ============================================================
// Component
// ============================================================

interface NightContextEditorProps {
  night: NightResult;
  notes: NightNotes;
  onNotesChange: (notes: NightNotes) => void;
}

export function NightContextEditor({ night, notes, onNotesChange }: NightContextEditorProps) {
  const [expanded, setExpanded] = useState(false);

  // Count how many context fields are set (for collapsed summary)
  const filledCount = FIELDS.reduce(
    (count, f) => count + (notes[f.key] !== null && notes[f.key] !== '' ? 1 : 0),
    0
  );

  const handleSelect = useCallback(
    (fieldKey: keyof NightNotes, value: string) => {
      const current = notes[fieldKey];
      // Toggle: clicking the already-selected pill clears it
      const newValue = current === value ? null : value;
      const updated = { ...notes, [fieldKey]: newValue };
      onNotesChange(updated);
      saveNightNotes(night.dateStr, updated);
    },
    [night.dateStr, notes, onNotesChange]
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card/30">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            Night context
            {filledCount > 0 && (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/80">
                {filledCount}/{FIELDS.length} set
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Caffeine, position, stress, and more
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/60 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded body — 6 field rows */}
      {expanded && (
        <div className="border-t border-border/30 px-4 pb-3 pt-2">
          <div className="flex flex-col gap-2.5">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {field.label}
                </span>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((opt) => {
                    const isSelected = notes[field.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(field.key, opt.value)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border/40 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                        aria-label={`${field.label}: ${opt.label}`}
                        aria-pressed={isSelected}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[9px] text-muted-foreground/50">
            Context helps identify patterns across your nights
          </p>
        </div>
      )}
    </div>
  );
}
