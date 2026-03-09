'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';

interface Props {
  selectedNight: NightResult;
  previousNight: NightResult | null;
  nights?: NightResult[];
}

export function OximetryTab({ selectedNight, previousNight, nights = [] }: Props) {
  const THRESHOLDS = useThresholds();
  const ox = selectedNight.oximetry;
  const pOx = previousNight?.oximetry;

  const [detailMetric, setDetailMetric] = useState<{
    label: string;
    unit?: string;
    accessor: (n: NightResult) => number | undefined;
    threshold?: ThresholdDef;
    description?: string;
  } | null>(null);

  const openMetric = useCallback(
    (label: string, accessor: (n: NightResult) => number | undefined, opts?: { unit?: string; threshold?: ThresholdDef; description?: string }) => {
      if (nights.length > 1) setDetailMetric({ label, accessor, ...opts });
    },
    [nights.length]
  );

  const clickable = nights.length > 1;

  if (!ox) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-muted-foreground">
            No oximetry data for this night.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Upload Viatom / Checkme O2 Max CSV files alongside your SD card data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* SpO2 Metrics */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Oxygen Desaturation
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="ODI-3"
            value={ox.odi3}
            unit="/hr"
            threshold={THRESHOLDS.odi3}
            previousValue={pOx?.odi3}
            tooltip="Oxygen Desaturation Index — times per hour SpO₂ drops by ≥3%. Lower is better."
            onClick={clickable ? () => openMetric('ODI-3', (x) => x.oximetry?.odi3, { unit: '/hr', threshold: THRESHOLDS.odi3 }) : undefined}
          />
          <MetricCard
            label="ODI-4"
            value={ox.odi4}
            unit="/hr"
            threshold={THRESHOLDS.odi4}
            previousValue={pOx?.odi4}
            tooltip="Times per hour SpO₂ drops by ≥4%. A stricter threshold used in clinical settings. Lower is better."
            onClick={clickable ? () => openMetric('ODI-4', (x) => x.oximetry?.odi4, { unit: '/hr', threshold: THRESHOLDS.odi4 }) : undefined}
          />
          <MetricCard
            label="T < 90%"
            value={ox.tBelow90}
            unit="min"
            threshold={THRESHOLDS.tBelow90}
            previousValue={pOx?.tBelow90}
            tooltip="Total minutes your blood oxygen was below 90%. Less time below 90% is better."
            onClick={clickable ? () => openMetric('T < 90%', (x) => x.oximetry?.tBelow90, { unit: 'min', threshold: THRESHOLDS.tBelow90 }) : undefined}
          />
          <MetricCard
            label="T < 94%"
            value={ox.tBelow94}
            unit="min"
            threshold={THRESHOLDS.tBelow94}
            previousValue={pOx?.tBelow94}
            tooltip="Total minutes SpO₂ was below 94%. A less severe threshold but still clinically relevant."
            onClick={clickable ? () => openMetric('T < 94%', (x) => x.oximetry?.tBelow94, { unit: 'min', threshold: THRESHOLDS.tBelow94 }) : undefined}
          />
        </div>
      </div>

      {/* HR Clinical Surges */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          HR Clinical Surges (30s baseline)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="HR Clin ≥8"
            value={ox.hrClin8}
            unit="/hr"
            previousValue={pOx?.hrClin8}
            compact
            tooltip="Heart rate surges ≥8 bpm above 30-second baseline per hour. A sensitive threshold for detecting autonomic arousals."
            onClick={clickable ? () => openMetric('HR Clin ≥8', (x) => x.oximetry?.hrClin8, { unit: '/hr' }) : undefined}
          />
          <MetricCard
            label="HR Clin ≥10"
            value={ox.hrClin10}
            unit="/hr"
            threshold={THRESHOLDS.hrClin10}
            previousValue={pOx?.hrClin10}
            compact
            tooltip="Heart rate surges ≥10 bpm above baseline per hour. The primary clinical threshold for arousal-related HR events."
            onClick={clickable ? () => openMetric('HR Clin ≥10', (x) => x.oximetry?.hrClin10, { unit: '/hr', threshold: THRESHOLDS.hrClin10 }) : undefined}
          />
          <MetricCard
            label="HR Clin ≥12"
            value={ox.hrClin12}
            unit="/hr"
            previousValue={pOx?.hrClin12}
            compact
            tooltip="Heart rate surges ≥12 bpm above baseline per hour. A more specific threshold for significant autonomic events."
            onClick={clickable ? () => openMetric('HR Clin ≥12', (x) => x.oximetry?.hrClin12, { unit: '/hr' }) : undefined}
          />
          <MetricCard
            label="HR Clin ≥15"
            value={ox.hrClin15}
            unit="/hr"
            previousValue={pOx?.hrClin15}
            compact
            tooltip="Heart rate surges ≥15 bpm above baseline per hour. Large surges often linked to respiratory events or arousals."
            onClick={clickable ? () => openMetric('HR Clin ≥15', (x) => x.oximetry?.hrClin15, { unit: '/hr' }) : undefined}
          />
        </div>
      </div>

      {/* HR Rolling Mean */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          HR Rolling Mean Surges (5min baseline)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="HR Mean ≥10"
            value={ox.hrMean10}
            unit="/hr"
            previousValue={pOx?.hrMean10}
            compact
            tooltip="HR surges ≥10 bpm above a 5-minute rolling mean per hour. Longer baseline reduces noise from normal HR variation."
            onClick={clickable ? () => openMetric('HR Mean ≥10', (x) => x.oximetry?.hrMean10, { unit: '/hr' }) : undefined}
          />
          <MetricCard
            label="HR Mean ≥15"
            value={ox.hrMean15}
            unit="/hr"
            previousValue={pOx?.hrMean15}
            compact
            tooltip="HR surges ≥15 bpm above a 5-minute rolling mean per hour. Large surges above a stable baseline suggest significant events."
            onClick={clickable ? () => openMetric('HR Mean ≥15', (x) => x.oximetry?.hrMean15, { unit: '/hr' }) : undefined}
          />
        </div>
      </div>

      {/* Coupled Events */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Coupled ODI + HR Events
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Coupled 3+6"
            value={ox.coupled3_6}
            unit="/hr"
            previousValue={pOx?.coupled3_6}
            compact
            tooltip="Events per hour where a ≥3% SpO₂ drop occurs with a ≥6 bpm HR surge within 60 seconds. Suggests breathing-related arousals."
            onClick={clickable ? () => openMetric('Coupled 3+6', (x) => x.oximetry?.coupled3_6, { unit: '/hr' }) : undefined}
          />
          <MetricCard
            label="Coupled 3+10"
            value={ox.coupled3_10}
            unit="/hr"
            previousValue={pOx?.coupled3_10}
            compact
            tooltip="Events per hour where a ≥3% SpO₂ drop occurs with a ≥10 bpm HR surge. Stricter coupling — more likely true respiratory events."
            onClick={clickable ? () => openMetric('Coupled 3+10', (x) => x.oximetry?.coupled3_10, { unit: '/hr' }) : undefined}
          />
          <MetricCard
            label="HR Ratio"
            value={ox.coupledHRRatio}
            format="pct"
            previousValue={pOx?.coupledHRRatio}
            compact
            tooltip="Percentage of ODI-3 events that also have a coupled HR surge. Higher ratio suggests most desaturations cause autonomic arousals."
            onClick={clickable ? () => openMetric('HR Ratio', (x) => x.oximetry?.coupledHRRatio) : undefined}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="SpO₂ Mean"
              value={ox.spo2Mean}
              unit="%"
              format="pct"
              threshold={THRESHOLDS.spo2Mean}
              previousValue={pOx?.spo2Mean}
              compact
              tooltip="Average blood oxygen saturation throughout the night. Normal is 94–98%. Higher is better."
              onClick={clickable ? () => openMetric('SpO₂ Mean', (x) => x.oximetry?.spo2Mean, { unit: '%', threshold: THRESHOLDS.spo2Mean }) : undefined}
            />
            <MetricCard
              label="SpO₂ Min"
              value={ox.spo2Min}
              unit="%"
              format="int"
              previousValue={pOx?.spo2Min}
              compact
              tooltip="Lowest blood oxygen reading recorded during the night. Values below 88% are clinically significant."
              onClick={clickable ? () => openMetric('SpO₂ Min', (x) => x.oximetry?.spo2Min, { unit: '%' }) : undefined}
            />
            <MetricCard
              label="HR Mean"
              value={ox.hrMean}
              unit="bpm"
              format="int"
              previousValue={pOx?.hrMean}
              compact
              tooltip="Average heart rate during the recording period. Normal resting HR during sleep is typically 40–70 bpm."
              onClick={clickable ? () => openMetric('HR Mean', (x) => x.oximetry?.hrMean, { unit: 'bpm' }) : undefined}
            />
            <MetricCard
              label="HR SD"
              value={ox.hrSD}
              unit="bpm"
              format="pct"
              previousValue={pOx?.hrSD}
              compact
              tooltip="Standard deviation of heart rate — measures HR variability. Higher values may indicate frequent arousals or autonomic instability."
              onClick={clickable ? () => openMetric('HR SD', (x) => x.oximetry?.hrSD, { unit: 'bpm' }) : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* H1/H2 Split */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            First Half vs Second Half
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Metric</th>
                  <th className="pb-2 pr-4 text-right font-medium">H1</th>
                  <th className="pb-2 pr-4 text-right font-medium">H2</th>
                  <th className="pb-2 text-right font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'HR Clin 10', h1: ox.h1.hrClin10, h2: ox.h2.hrClin10, unit: '/hr' },
                  { label: 'ODI-3', h1: ox.h1.odi3, h2: ox.h2.odi3, unit: '/hr' },
                  { label: 'T < 94%', h1: ox.h1.tBelow94, h2: ox.h2.tBelow94, unit: 'min' },
                ].map((m) => {
                  const delta = m.h2 - m.h1;
                  const isWorse = delta > 1;
                  return (
                    <tr key={m.label} className="border-b border-border/30">
                      <td className="py-2 pr-4 text-muted-foreground">{m.label}</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{m.h1.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{m.h2.toFixed(1)}</td>
                      <td className={`py-2 text-right font-mono tabular-nums ${
                        isWorse ? 'text-red-400' : delta < -1 ? 'text-emerald-400' : 'text-muted-foreground'
                      }`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
            H2 worsening in HR surges and desaturation events may indicate REM-related or positional factors.
          </p>
        </CardContent>
      </Card>

      {/* Data Quality */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground sm:gap-4">
        <span>
          Samples: <strong className="text-foreground">{ox.retainedSamples}</strong>
          {' / '}
          {ox.totalSamples}
        </span>
        {ox.doubleTrackingCorrected > 0 && (
          <span>
            Double-tracking corrected:{' '}
            <strong className="text-foreground">{ox.doubleTrackingCorrected}</strong>
          </span>
        )}
      </div>

      {/* Metric Detail Modal */}
      {detailMetric && (
        <MetricDetailModal
          label={detailMetric.label}
          unit={detailMetric.unit}
          nights={nights}
          selectedDate={selectedNight.dateStr}
          accessor={detailMetric.accessor}
          threshold={detailMetric.threshold}
          description={detailMetric.description}
          onClose={() => setDetailMetric(null)}
        />
      )}
    </div>
  );
}
