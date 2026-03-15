'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComparisonRow } from './comparison-row';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  nightA: NightResult;
  nightAIndex: number;
}

function fmtPressure(n: NightResult): string {
  const s = n.settings;
  if (s.settingsSource === 'unavailable') return 'N/A';
  if (s.epap > 0 && s.ipap > 0) return `${s.epap}/${s.ipap} cmH₂O (PS ${s.pressureSupport})`;
  if (s.epap > 0) return `${s.epap} cmH₂O`;
  return '—';
}

function SettingsSummary({ nightA, nightB }: { nightA: NightResult; nightB: NightResult }) {
  const sA = nightA.settings;
  const sB = nightB.settings;
  const settingsChanged = sA.epap !== sB.epap || sA.ipap !== sB.ipap || sA.papMode !== sB.papMode;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { night: nightA, label: 'A' },
        { night: nightB, label: 'B' },
      ].map(({ night, label }) => (
        <div key={label} className="rounded-lg border border-border/40 bg-card/50 px-3 py-2.5 text-xs">
          <span className="font-medium text-foreground">{night.dateStr}</span>
          <div className="mt-1.5 space-y-0.5 text-muted-foreground">
            <div>{night.settings.deviceModel || 'Unknown device'} · {night.settings.papMode}</div>
            <div>Pressure: {fmtPressure(night)}</div>
            <div>Duration: {Math.floor(night.durationHours)}h {Math.round((night.durationHours % 1) * 60)}m</div>
          </div>
        </div>
      ))}
      {settingsChanged && (
        <div className="sm:col-span-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-400">
          Settings differ between these nights — delta values may reflect pressure changes.
        </div>
      )}
    </div>
  );
}

export function ComparisonTab({ nights, nightA, nightAIndex }: Props) {
  const THRESHOLDS = useThresholds();
  const [compareIndex, setCompareIndex] = useState(() =>
    nightAIndex + 1 < nights.length ? nightAIndex + 1 : nightAIndex > 0 ? 0 : -1
  );

  const nightB = compareIndex >= 0 ? nights[compareIndex] : null;

  // Precompute quick-select indices (excluding nightA)
  const quickSelects = useMemo(() => {
    const others = nights
      .map((n, i) => ({ n, i }))
      .filter(({ i }) => i !== nightAIndex);
    if (others.length === 0) return [];

    const sorted = [...others].sort((a, b) => a.n.dateStr.localeCompare(b.n.dateStr));

    // Previous night (chronologically before nightA, closest)
    const before = sorted.filter((x) => x.n.dateStr < nightA.dateStr);
    const prev = before.length > 0 ? before[before.length - 1] : null;

    // Best Glasgow (lowest overall)
    const best = others.reduce((min, cur) =>
      cur.n.glasgow.overall < min.n.glasgow.overall ? cur : min
    );

    // Worst Glasgow (highest overall)
    const worst = others.reduce((max, cur) =>
      cur.n.glasgow.overall > max.n.glasgow.overall ? cur : max
    );

    const presets: { label: string; index: number }[] = [];
    if (prev) presets.push({ label: 'Previous', index: prev.i });
    presets.push({ label: 'Best', index: best.i });
    if (worst.i !== best.i) presets.push({ label: 'Worst', index: worst.i });

    return presets;
  }, [nights, nightAIndex, nightA.dateStr]);

  if (nights.length < 2) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-muted-foreground">
            Upload at least two nights to use the comparison view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Night B Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Comparing</span>
        <span className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium">
          {nightA.dateStr}
        </span>
        <span className="text-xs text-muted-foreground">with</span>
        <select
          value={compareIndex}
          onChange={(e) => setCompareIndex(Number(e.target.value))}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {nights.map((n, i) => (
            i !== nightAIndex && (
              <option key={n.dateStr} value={i}>
                {n.dateStr}
              </option>
            )
          ))}
        </select>
        {quickSelects.length > 0 && (
          <div className="flex gap-1.5">
            {quickSelects.map((p) => (
              <button
                key={p.label}
                onClick={() => setCompareIndex(p.index)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  compareIndex === p.index
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {nightB && (
        <>
          {/* Settings Summary */}
          <SettingsSummary nightA={nightA} nightB={nightB} />

          {/* Column Headers */}
          <div className="flex items-center gap-2 border-b border-border/50 pb-2 text-[10px] font-medium text-muted-foreground">
            <span className="min-w-[110px]">Metric</span>
            <span className="min-w-[70px] text-right">{nightA.dateStr.slice(5)}</span>
            <span className="min-w-[70px] text-right">{nightB.dateStr.slice(5)}</span>
            <span className="min-w-[60px] text-right">Delta</span>
          </div>

          {/* Glasgow */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Glasgow Index</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <ComparisonRow label="Overall" valueA={nightA.glasgow.overall} valueB={nightB.glasgow.overall} threshold={THRESHOLDS.glasgowOverall} />
              <ComparisonRow label="Skew" valueA={nightA.glasgow.skew} valueB={nightB.glasgow.skew} />
              <ComparisonRow label="Spike" valueA={nightA.glasgow.spike} valueB={nightB.glasgow.spike} />
              <ComparisonRow label="Flat Top" valueA={nightA.glasgow.flatTop} valueB={nightB.glasgow.flatTop} />
              <ComparisonRow label="Top Heavy" valueA={nightA.glasgow.topHeavy} valueB={nightB.glasgow.topHeavy} />
              <ComparisonRow label="Multi-Peak" valueA={nightA.glasgow.multiPeak} valueB={nightB.glasgow.multiPeak} />
              <ComparisonRow label="No Pause" valueA={nightA.glasgow.noPause} valueB={nightB.glasgow.noPause} />
              <ComparisonRow label="Insp. Rate" valueA={nightA.glasgow.inspirRate} valueB={nightB.glasgow.inspirRate} />
              <ComparisonRow label="Multi-Breath" valueA={nightA.glasgow.multiBreath} valueB={nightB.glasgow.multiBreath} />
              <ComparisonRow label="Var. Amp" valueA={nightA.glasgow.variableAmp} valueB={nightB.glasgow.variableAmp} />
            </CardContent>
          </Card>

          {/* WAT */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">WAT Analysis</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <ComparisonRow label="FL Score" valueA={nightA.wat.flScore} valueB={nightB.wat.flScore} unit="%" format="pct" threshold={THRESHOLDS.watFL} />
              <ComparisonRow label="Regularity" valueA={nightA.wat.regularityScore} valueB={nightB.wat.regularityScore} unit="%" format="int" threshold={THRESHOLDS.watRegularity} lowerIsBetter={false} />
              <ComparisonRow label="Periodicity" valueA={nightA.wat.periodicityIndex} valueB={nightB.wat.periodicityIndex} unit="%" format="pct" threshold={THRESHOLDS.watPeriodicity} />
            </CardContent>
          </Card>

          {/* NED */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">NED Analysis</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <ComparisonRow label="NED Mean" valueA={nightA.ned.nedMean} valueB={nightB.ned.nedMean} unit="%" format="pct" threshold={THRESHOLDS.nedMean} />
              <ComparisonRow label="NED P95" valueA={nightA.ned.nedP95} valueB={nightB.ned.nedP95} unit="%" format="pct" threshold={THRESHOLDS.nedP95} />
              <ComparisonRow label="RERA Index" valueA={nightA.ned.reraIndex} valueB={nightB.ned.reraIndex} unit="/hr" format="pct" threshold={THRESHOLDS.reraIndex} />
              <ComparisonRow label="RERA Count" valueA={nightA.ned.reraCount} valueB={nightB.ned.reraCount} format="int" />
              <ComparisonRow label="Combined FL" valueA={nightA.ned.combinedFLPct} valueB={nightB.ned.combinedFLPct} unit="%" format="int" threshold={THRESHOLDS.combinedFL} />
              <ComparisonRow label="Clear FL" valueA={nightA.ned.nedClearFLPct} valueB={nightB.ned.nedClearFLPct} unit="%" format="pct" threshold={THRESHOLDS.nedClearFL} />
              <ComparisonRow label="H1 NED" valueA={nightA.ned.h1NedMean} valueB={nightB.ned.h1NedMean} unit="%" format="pct" />
              <ComparisonRow label="H2 NED" valueA={nightA.ned.h2NedMean} valueB={nightB.ned.h2NedMean} unit="%" format="pct" />
            </CardContent>
          </Card>

          {/* Oximetry (conditional) */}
          {(nightA.oximetry || nightB.oximetry) && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Oximetry</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ComparisonRow label="ODI-3" valueA={nightA.oximetry?.odi3} valueB={nightB.oximetry?.odi3} unit="/hr" format="pct" threshold={THRESHOLDS.odi3} />
                <ComparisonRow label="ODI-4" valueA={nightA.oximetry?.odi4} valueB={nightB.oximetry?.odi4} unit="/hr" format="pct" threshold={THRESHOLDS.odi4} />
                <ComparisonRow label="T < 90%" valueA={nightA.oximetry?.tBelow90} valueB={nightB.oximetry?.tBelow90} unit="min" format="pct" threshold={THRESHOLDS.tBelow90} />
                <ComparisonRow label="T < 94%" valueA={nightA.oximetry?.tBelow94} valueB={nightB.oximetry?.tBelow94} unit="min" format="pct" threshold={THRESHOLDS.tBelow94} />
                <ComparisonRow label="SpO₂ Mean" valueA={nightA.oximetry?.spo2Mean} valueB={nightB.oximetry?.spo2Mean} unit="%" format="pct" threshold={THRESHOLDS.spo2Mean} lowerIsBetter={false} />
                <ComparisonRow label="SpO₂ Min" valueA={nightA.oximetry?.spo2Min} valueB={nightB.oximetry?.spo2Min} unit="%" format="int" lowerIsBetter={false} />
                <ComparisonRow label="HR Mean" valueA={nightA.oximetry?.hrMean} valueB={nightB.oximetry?.hrMean} unit="bpm" format="int" />
                <ComparisonRow label="HR Clin 10" valueA={nightA.oximetry?.hrClin10} valueB={nightB.oximetry?.hrClin10} unit="/hr" format="pct" threshold={THRESHOLDS.hrClin10} />
                <ComparisonRow label="Coupled 3/10" valueA={nightA.oximetry?.coupled3_10} valueB={nightB.oximetry?.coupled3_10} unit="/hr" format="pct" />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
