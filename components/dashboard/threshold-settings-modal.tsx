'use client';

import { useRef, useCallback } from 'react';
import { Settings, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { THRESHOLDS, type ThresholdDef } from '@/lib/thresholds';
import { useThresholds, useThresholdActions } from '@/components/common/thresholds-provider';
import { events } from '@/lib/analytics';

const GROUPS: { title: string; keys: { key: string; label: string }[] }[] = [
  {
    title: 'Glasgow Index',
    keys: [{ key: 'glasgowOverall', label: 'Glasgow Overall' }],
  },
  {
    title: 'WAT Analysis',
    keys: [
      { key: 'watFL', label: 'FL Score' },
      { key: 'watRegularity', label: 'Regularity' },
      { key: 'watPeriodicity', label: 'Periodicity' },
    ],
  },
  {
    title: 'NED Analysis',
    keys: [
      { key: 'nedMean', label: 'NED Mean' },
      { key: 'nedP95', label: 'NED P95' },
      { key: 'nedClearFL', label: 'Clear FL' },
      { key: 'combinedFL', label: 'Combined FL' },
      { key: 'reraIndex', label: 'RERA Index' },
    ],
  },
  {
    title: 'Oximetry',
    keys: [
      { key: 'odi3', label: 'ODI-3%' },
      { key: 'odi4', label: 'ODI-4%' },
      { key: 'tBelow90', label: 'T < 90%' },
      { key: 'tBelow94', label: 'T < 94%' },
      { key: 'spo2Mean', label: 'SpO\u2082 Mean' },
      { key: 'hrClin10', label: 'HR Clin 10' },
    ],
  },
];

function ThresholdRow({
  metricKey,
  label,
  current,
  defaultDef,
  isCustom,
  onChange,
  onReset,
}: {
  metricKey: string;
  label: string;
  current: ThresholdDef;
  defaultDef: ThresholdDef;
  isCustom: boolean;
  onChange: (key: string, def: ThresholdDef) => void;
  onReset: (key: string) => void;
}) {
  const handleGreen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(metricKey, { ...current, green: val });
      events.thresholdCustomized(metricKey);
    }
  };
  const handleAmber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(metricKey, { ...current, amber: val });
      events.thresholdCustomized(metricKey);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="min-w-[100px] text-xs text-muted-foreground truncate" title={label}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <input
          type="number"
          step="any"
          value={current.green}
          onChange={handleGreen}
          className="h-7 w-16 rounded border border-border bg-background px-2 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={`${label} green threshold`}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
        <input
          type="number"
          step="any"
          value={current.amber}
          onChange={handleAmber}
          className="h-7 w-16 rounded border border-border bg-background px-2 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={`${label} amber threshold`}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/50 w-6 text-center shrink-0">
        {current.lowerIsBetter ? '\u2193' : '\u2191'}
      </span>
      {isCustom && (
        <button
          onClick={() => onReset(metricKey)}
          className="text-muted-foreground/50 hover:text-foreground transition-colors"
          title={`Reset to default (${defaultDef.green}/${defaultDef.amber})`}
          aria-label={`Reset ${label} to default`}
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function ThresholdSettingsModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thresholds = useThresholds();
  const { setOverride, resetOne, resetAll, isCustomised } = useThresholdActions();

  const open = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const hasAnyCustom = Object.keys(THRESHOLDS).some(isCustomised);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={open}
        title="Threshold Settings"
        aria-label="Threshold Settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Threshold Settings</h2>
          <button
            onClick={close}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-[11px] text-muted-foreground/60">
              Customise the green/amber thresholds for traffic light indicators.
              Values beyond amber are shown as red.
            </p>
            <button
              onClick={hasAnyCustom ? resetAll : undefined}
              disabled={!hasAnyCustom}
              className={`shrink-0 text-[11px] whitespace-nowrap transition-colors ${
                hasAnyCustom
                  ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                  : 'text-muted-foreground/30 cursor-default'
              }`}
              title={hasAnyCustom ? 'Reset all thresholds to their default values' : undefined}
              aria-label="Reset to defaults"
            >
              Reset to defaults
            </button>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5 border-b border-border/30 pb-1">
                {group.title}
              </h3>
              {group.keys.map(({ key, label }) => (
                <ThresholdRow
                  key={key}
                  metricKey={key}
                  label={label}
                  current={thresholds[key]}
                  defaultDef={THRESHOLDS[key]}
                  isCustom={isCustomised(key)}
                  onChange={setOverride}
                  onReset={resetOne}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button size="sm" onClick={close}>
            Done
          </Button>
        </div>
      </dialog>
    </>
  );
}
