'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Lock } from 'lucide-react';
import { THRESHOLDS, type ThresholdDef } from '@/lib/thresholds';
import {
  useThresholds,
  useThresholdActions,
} from '@/components/common/thresholds-provider';
import {
  loadDisplayPreferences,
  saveDateFormat,
  saveTimeFormat,
  saveNumberFormat,
  clearDisplayPreferences,
  DEFAULTS,
  type DateFormat,
  type TimeFormat,
  type NumberFormat,
  type DisplayPreferences,
} from '@/lib/display-preferences';
import { events } from '@/lib/analytics';

/* ------------------------------------------------------------------ */
/*  Threshold groups (same as ThresholdSettingsModal)                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Threshold row                                                     */
/* ------------------------------------------------------------------ */

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
    <div className="flex items-center gap-2 py-1.5 sm:gap-3">
      <span
        className="min-w-[100px] truncate text-xs text-muted-foreground sm:min-w-[120px] sm:text-sm"
        title={label}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <input
          type="number"
          step="any"
          value={current.green}
          onChange={handleGreen}
          className="h-7 w-16 rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:h-8 sm:w-20"
          aria-label={`${label} green threshold`}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <input
          type="number"
          step="any"
          value={current.amber}
          onChange={handleAmber}
          className="h-7 w-16 rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:h-8 sm:w-20"
          aria-label={`${label} amber threshold`}
        />
      </div>
      <span className="w-6 shrink-0 text-center text-[10px] text-muted-foreground/70">
        {current.lowerIsBetter ? '\u2193' : '\u2191'}
      </span>
      {isCustom ? (
        <button
          onClick={() => onReset(metricKey)}
          className="text-muted-foreground/70 transition-colors hover:text-foreground"
          title={`Reset to default (${defaultDef.green}/${defaultDef.amber})`}
          aria-label={`Reset ${label} to default`}
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      ) : (
        <span className="w-3" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Option button (radio-style)                                       */
/* ------------------------------------------------------------------ */

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs transition-colors sm:text-sm ${
        selected
          ? 'border-primary/50 bg-primary/10 text-foreground'
          : 'border-border bg-card/30 text-muted-foreground hover:border-border hover:bg-card/50'
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main form                                                         */
/* ------------------------------------------------------------------ */

export function SettingsForm() {
  const [prefs, setPrefs] = useState<DisplayPreferences>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const thresholds = useThresholds();
  const { setOverride, resetOne, resetAll, isCustomised } =
    useThresholdActions();

  useEffect(() => {
    setPrefs(loadDisplayPreferences());
    setMounted(true);
  }, []);

  const handleDateFormat = useCallback((value: DateFormat) => {
    setPrefs((prev) => ({ ...prev, dateFormat: value }));
    saveDateFormat(value);
  }, []);

  const handleTimeFormat = useCallback((value: TimeFormat) => {
    setPrefs((prev) => ({ ...prev, timeFormat: value }));
    saveTimeFormat(value);
  }, []);

  const handleNumberFormat = useCallback((value: NumberFormat) => {
    setPrefs((prev) => ({ ...prev, numberFormat: value }));
    saveNumberFormat(value);
  }, []);

  const hasAnyCustomThreshold = Object.keys(THRESHOLDS).some(isCustomised);
  const hasAnyCustomPref =
    prefs.dateFormat !== DEFAULTS.dateFormat ||
    prefs.timeFormat !== DEFAULTS.timeFormat ||
    prefs.numberFormat !== DEFAULTS.numberFormat;
  const hasAnyCustom = hasAnyCustomThreshold || hasAnyCustomPref;

  const handleResetAll = useCallback(() => {
    clearDisplayPreferences();
    setPrefs(DEFAULTS);
    resetAll();
  }, [resetAll]);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-8">
        <div className="h-48 animate-pulse rounded-xl bg-card/30" />
        <div className="h-64 animate-pulse rounded-xl bg-card/30" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Display Preferences ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Display Preferences
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6">
          <div className="flex flex-col gap-5">
            {/* Date format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Date format
              </label>
              <div className="flex flex-wrap gap-2">
                <OptionButton
                  selected={prefs.dateFormat === 'DD/MM/YYYY'}
                  onClick={() => handleDateFormat('DD/MM/YYYY')}
                >
                  DD/MM/YYYY (e.g. 15/03/2026)
                </OptionButton>
                <OptionButton
                  selected={prefs.dateFormat === 'MM/DD/YYYY'}
                  onClick={() => handleDateFormat('MM/DD/YYYY')}
                >
                  MM/DD/YYYY (e.g. 03/15/2026)
                </OptionButton>
              </div>
            </div>

            {/* Time format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Time format
              </label>
              <div className="flex flex-wrap gap-2">
                <OptionButton
                  selected={prefs.timeFormat === '24h'}
                  onClick={() => handleTimeFormat('24h')}
                >
                  24-hour (e.g. 14:30)
                </OptionButton>
                <OptionButton
                  selected={prefs.timeFormat === '12h'}
                  onClick={() => handleTimeFormat('12h')}
                >
                  12-hour (e.g. 2:30 PM)
                </OptionButton>
              </div>
            </div>

            {/* Number format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Decimal separator
              </label>
              <div className="flex flex-wrap gap-2">
                <OptionButton
                  selected={prefs.numberFormat === 'comma'}
                  onClick={() => handleNumberFormat('comma')}
                >
                  Comma (e.g. 3,14)
                </OptionButton>
                <OptionButton
                  selected={prefs.numberFormat === 'dot'}
                  onClick={() => handleNumberFormat('dot')}
                >
                  Dot (e.g. 3.14)
                </OptionButton>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground/70">
            Defaults are based on international clinical standards.
          </p>
        </div>
      </section>

      {/* ── Alert Thresholds ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Alert Thresholds
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6">
          <p className="mb-4 text-xs text-muted-foreground sm:text-sm">
            Set your own green and amber thresholds for each metric. Values
            beyond amber are shown in red.
          </p>

          {GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 border-b border-border/30 pb-1 text-xs font-medium text-muted-foreground">
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
      </section>

      {/* ── Reset all ── */}
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6">
        <div>
          <p className="text-sm font-medium text-foreground">
            Reset all to defaults
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clears all display preferences and custom thresholds.
          </p>
        </div>
        <button
          onClick={hasAnyCustom ? handleResetAll : undefined}
          disabled={!hasAnyCustom}
          className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
            hasAnyCustom
              ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
              : 'cursor-default border-border/30 text-muted-foreground/50'
          }`}
        >
          Reset all
        </button>
      </div>

      {/* ── Privacy note ── */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <Lock className="h-3 w-3" />
        Your settings stay on this device. AirwayLab never sends preferences to
        a server.
      </p>
    </div>
  );
}
