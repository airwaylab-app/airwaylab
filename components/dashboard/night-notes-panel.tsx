'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, NotebookPen, Sparkles } from 'lucide-react';
import type {
  NightNotes,
  CaffeineLevel,
  AlcoholLevel,
  CongestionLevel,
  SleepPosition,
  StressLevel,
  ExerciseLevel,
} from '@/lib/types';
import { loadNightNotes, saveNightNotes, EMPTY_NOTES } from '@/lib/night-notes';

interface OptionDef<T extends string> {
  value: T;
  label: string;
}

const CAFFEINE_OPTIONS: OptionDef<CaffeineLevel>[] = [
  { value: 'none', label: 'None' },
  { value: 'before-noon', label: 'Before noon' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

const ALCOHOL_OPTIONS: OptionDef<AlcoholLevel>[] = [
  { value: 'none', label: 'None' },
  { value: '1-2', label: '1-2 drinks' },
  { value: '3+', label: '3+ drinks' },
];

const CONGESTION_OPTIONS: OptionDef<CongestionLevel>[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'severe', label: 'Severe' },
];

const POSITION_OPTIONS: OptionDef<SleepPosition>[] = [
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'stomach', label: 'Stomach' },
  { value: 'mixed', label: 'Mixed' },
];

const STRESS_OPTIONS: OptionDef<StressLevel>[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

const EXERCISE_OPTIONS: OptionDef<ExerciseLevel>[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'intense', label: 'Intense' },
];

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: OptionDef<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
              value === opt.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border/40 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface NightNotesPanelProps {
  dateStr: string;
  isPaid?: boolean;
}

export function NightNotesPanel({ dateStr, isPaid = false }: NightNotesPanelProps) {
  const [notes, setNotes] = useState<NightNotes>({ ...EMPTY_NOTES });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const loaded = loadNightNotes(dateStr);
    setNotes(loaded);
    setHasData(
      loaded.caffeine !== null ||
      loaded.alcohol !== null ||
      loaded.congestion !== null ||
      loaded.position !== null ||
      loaded.stress !== null ||
      loaded.exercise !== null ||
      loaded.note.trim() !== '' ||
      loaded.symptomRating !== null
    );
  }, [dateStr]);

  const update = useCallback(
    (patch: Partial<NightNotes>) => {
      setNotes((prev) => {
        const next = { ...prev, ...patch };
        saveNightNotes(dateStr, next);
        setHasData(
          next.caffeine !== null ||
          next.alcohol !== null ||
          next.congestion !== null ||
          next.position !== null ||
          next.stress !== null ||
          next.exercise !== null ||
          next.note.trim() !== '' ||
          next.symptomRating !== null
        );
        return next;
      });
    },
    [dateStr]
  );

  return (
    <details className="group rounded-xl border border-border/50 bg-card/30">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        <NotebookPen className="h-4 w-4" />
        Night Context
        {hasData && (
          <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary/60" />
        )}
        {isPaid && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-normal text-primary/60">
            <Sparkles className="h-2.5 w-2.5" />
            Used by AI
          </span>
        )}
        {!isPaid && (
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50">
            Improves AI suggestions
          </span>
        )}
      </summary>

      <div className="border-t border-border/30 px-4 pb-4 pt-3">
        <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground/60">
          Log factors that may affect your sleep. This data stays in your browser and helps personalise insights.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ToggleGroup
            label="Caffeine"
            options={CAFFEINE_OPTIONS}
            value={notes.caffeine}
            onChange={(v) => update({ caffeine: v })}
          />
          <ToggleGroup
            label="Alcohol"
            options={ALCOHOL_OPTIONS}
            value={notes.alcohol}
            onChange={(v) => update({ alcohol: v })}
          />
          <ToggleGroup
            label="Nasal congestion"
            options={CONGESTION_OPTIONS}
            value={notes.congestion}
            onChange={(v) => update({ congestion: v })}
          />
          <ToggleGroup
            label="Sleep position"
            options={POSITION_OPTIONS}
            value={notes.position}
            onChange={(v) => update({ position: v })}
          />
          <ToggleGroup
            label="Stress / anxiety"
            options={STRESS_OPTIONS}
            value={notes.stress}
            onChange={(v) => update({ stress: v })}
          />
          <ToggleGroup
            label="Exercise (day of)"
            options={EXERCISE_OPTIONS}
            value={notes.exercise}
            onChange={(v) => update({ exercise: v })}
          />
        </div>

        <div className="mt-3">
          <span className="text-[10px] font-medium text-muted-foreground">Note</span>
          <textarea
            value={notes.note}
            onChange={(e) => update({ note: e.target.value.slice(0, 200) })}
            placeholder="Anything else? (mask change, medication, travel...)"
            maxLength={200}
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-border/40 bg-card/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
          />
          <div className="text-right text-[9px] text-muted-foreground/40">
            {notes.note.length}/200
          </div>
        </div>
      </div>
    </details>
  );
}
