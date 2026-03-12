'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';
import { METRIC_METHODOLOGIES } from '@/lib/metric-explanations';

interface Props {
  selectedNight: NightResult;
  previousNight: NightResult | null;
  nights?: NightResult[];
}

export function FlowAnalysisTab({ selectedNight, previousNight, nights = [] }: Props) {
  const THRESHOLDS = useThresholds();
  const n = selectedNight;
  const p = previousNight;

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

  return (
    <div className="flex flex-col gap-6">
      {/* WAT Section */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Wobble Analysis Tool (WAT)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="FL Score"
            value={n.wat.flScore}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.watFL}
            previousValue={p?.wat.flScore}
            tooltip="Percentage of breaths showing flow limitation — when your airway partially collapses during inhalation. Lower is better."
            methodology={METRIC_METHODOLOGIES.flScore}
            onClick={clickable ? () => openMetric('FL Score', (x) => x.wat.flScore, { unit: '%', threshold: THRESHOLDS.watFL }) : undefined}
          />
          <MetricCard
            label="Regularity Score"
            value={n.wat.regularityScore}
            unit="%"
            format="int"
            threshold={THRESHOLDS.watRegularity}
            previousValue={p?.wat.regularityScore}
            tooltip="Measures breathing pattern predictability via Sample Entropy. Higher = more repetitive = worse. On PAP therapy, repetitive breathing often indicates the airway is persistently narrowed, causing uniform restricted breaths. Lower scores reflect healthy natural variability."
            methodology={METRIC_METHODOLOGIES.regularity}
            onClick={clickable ? () => openMetric('Regularity', (x) => x.wat.regularityScore, { unit: '%', threshold: THRESHOLDS.watRegularity }) : undefined}
          />
          <MetricCard
            label="Periodicity Index"
            value={n.wat.periodicityIndex}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.watPeriodicity}
            previousValue={p?.wat.periodicityIndex}
            tooltip="Detects cyclic breathing patterns using FFT on minute ventilation. May indicate periodic breathing or Cheyne-Stokes. Lower is better."
            methodology={METRIC_METHODOLOGIES.periodicity}
            onClick={clickable ? () => openMetric('Periodicity', (x) => x.wat.periodicityIndex, { unit: '%', threshold: THRESHOLDS.watPeriodicity }) : undefined}
          />
        </div>
        <Card className="mt-3 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">FL Score</strong> measures the median
              tidal volume ratio — higher values indicate greater flow limitation.{' '}
              <strong className="text-foreground">Regularity</strong> uses Sample Entropy
              to quantify breathing pattern predictability — higher scores mean more
              repetitive breathing, which is <em>worse</em> on PAP therapy (it suggests persistent
              airway narrowing causing uniform restricted breaths). Lower scores reflect healthy
              natural breath-to-breath variability.{' '}
              <strong className="text-foreground">Periodicity</strong> uses FFT on minute
              ventilation to detect cyclic breathing patterns.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* NED Section */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Negative Effort Dependence (NED)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="NED Mean"
            value={n.ned.nedMean}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.nedMean}
            previousValue={p?.ned.nedMean}
            tooltip="Average Negative Effort Dependence — measures wasted breathing effort due to airway obstruction. Lower is better."
            methodology={METRIC_METHODOLOGIES.nedMean}
            onClick={clickable ? () => openMetric('NED Mean', (x) => x.ned.nedMean, { unit: '%', threshold: THRESHOLDS.nedMean }) : undefined}
          />
          <MetricCard
            label="NED P95"
            value={n.ned.nedP95}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.nedP95}
            previousValue={p?.ned.nedP95}
            tooltip="95th percentile NED value — captures the worst 5% of breaths. Shows peak obstruction severity."
            methodology={METRIC_METHODOLOGIES.nedMean}
            onClick={clickable ? () => openMetric('NED P95', (x) => x.ned.nedP95, { unit: '%', threshold: THRESHOLDS.nedP95 }) : undefined}
          />
          <MetricCard
            label="RERA Index"
            value={n.ned.reraIndex}
            unit="/hr"
            threshold={THRESHOLDS.reraIndex}
            previousValue={p?.ned.reraIndex}
            tooltip="Respiratory Effort-Related Arousals per hour. These are brief awakenings caused by breathing effort that don't show up in AHI. Lower is better."
            methodology={METRIC_METHODOLOGIES.reraIndex}
            onClick={clickable ? () => openMetric('RERA Index', (x) => x.ned.reraIndex, { unit: '/hr', threshold: THRESHOLDS.reraIndex }) : undefined}
          />
          <MetricCard
            label="RERA Count"
            value={n.ned.reraCount}
            format="int"
            previousValue={p?.ned.reraCount}
            tooltip="Total number of detected RERA events during the entire session."
            onClick={clickable ? () => openMetric('RERA Count', (x) => x.ned.reraCount) : undefined}
          />
          <MetricCard
            label="Est. Arousal Index"
            value={n.ned.estimatedArousalIndex}
            unit="/hr"
            threshold={THRESHOLDS.eai}
            previousValue={p?.ned.estimatedArousalIndex}
            tooltip="Estimated arousals (brief awakenings) per hour, derived from breathing pattern changes. Lower means less fragmented sleep."
            methodology={METRIC_METHODOLOGIES.eai}
            onClick={clickable ? () => openMetric('Est. Arousal Index', (x) => x.ned.estimatedArousalIndex, { unit: '/hr', threshold: THRESHOLDS.eai }) : undefined}
          />
        </div>
      </div>

      {/* NED Detail Metrics */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">NED Detail Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Clear FL"
              value={n.ned.nedClearFLPct}
              unit="%"
              format="pct"
              threshold={THRESHOLDS.nedClearFL}
              previousValue={p?.ned.nedClearFLPct}
              compact
              tooltip="Percentage of breaths with clear flow limitation (NED above threshold). Lower is better."
              onClick={clickable ? () => openMetric('Clear FL', (x) => x.ned.nedClearFLPct, { unit: '%', threshold: THRESHOLDS.nedClearFL }) : undefined}
            />
            <MetricCard
              label="Borderline FL"
              value={n.ned.nedBorderlinePct}
              unit="%"
              format="pct"
              previousValue={p?.ned.nedBorderlinePct}
              compact
              tooltip="Percentage of breaths with borderline flow limitation — not clearly normal but not fully limited."
              onClick={clickable ? () => openMetric('Borderline FL', (x) => x.ned.nedBorderlinePct, { unit: '%' }) : undefined}
            />
            <MetricCard
              label="Flatness Index"
              value={n.ned.fiMean}
              format="pct"
              previousValue={p?.ned.fiMean}
              compact
              tooltip="Measures how flat (vs rounded) the inspiratory flow peak is. Flatter peaks suggest flow limitation."
              onClick={clickable ? () => openMetric('Flatness Index', (x) => x.ned.fiMean) : undefined}
            />
            <MetricCard
              label="FI > 0.85"
              value={n.ned.fiFL85Pct}
              unit="%"
              format="pct"
              previousValue={p?.ned.fiFL85Pct}
              compact
              tooltip="Percentage of breaths with Flatness Index above 0.85 — a very flat waveform indicating likely flow limitation."
              onClick={clickable ? () => openMetric('FI > 0.85', (x) => x.ned.fiFL85Pct, { unit: '%' }) : undefined}
            />
            <MetricCard
              label="M-Shape"
              value={n.ned.mShapePct}
              unit="%"
              format="pct"
              previousValue={p?.ned.mShapePct}
              compact
              tooltip="Percentage of breaths with an M-shaped flow pattern — a double-peaked waveform classic for flow limitation."
              onClick={clickable ? () => openMetric('M-Shape', (x) => x.ned.mShapePct, { unit: '%' }) : undefined}
            />
            <MetricCard
              label="Tpeak/Ti Mean"
              value={n.ned.tpeakMean}
              format="pct"
              previousValue={p?.ned.tpeakMean}
              compact
              tooltip="Ratio of time to peak flow vs total inspiratory time. Values closer to 0.5 suggest normal ramp; lower values suggest early peaking from obstruction."
              onClick={clickable ? () => openMetric('Tpeak/Ti Mean', (x) => x.ned.tpeakMean) : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* H1/H2 Comparison */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            First Half vs Second Half
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                First Half (H1)
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">NED Mean</span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {n.ned.h1NedMean.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Second Half (H2)
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">NED Mean</span>
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {n.ned.h2NedMean.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                H2 – H1 Delta
              </div>
              {(() => {
                const delta = n.ned.h2NedMean - n.ned.h1NedMean;
                const isWorse = delta > 2;
                const isBetter = delta < -2;
                return (
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                    isWorse ? 'bg-red-500/10' : isBetter ? 'bg-emerald-500/10' : 'bg-card/50'
                  }`}>
                    <span className="text-xs text-muted-foreground">
                      {isWorse ? 'Worsening' : isBetter ? 'Improving' : 'Stable'}
                    </span>
                    <span className={`font-mono text-lg font-semibold tabular-nums ${
                      isWorse ? 'text-red-400' : isBetter ? 'text-emerald-400' : 'text-muted-foreground'
                    }`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
            REM-predominant flow limitation typically worsens in H2 as REM density increases.
            A significant H2 rise (&gt;3%) may indicate positional or REM-related obstruction.
          </p>
        </CardContent>
      </Card>

      {/* Breath Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground">
          <span>
            Total breaths: <strong className="text-foreground">{n.ned.breathCount}</strong>
          </span>
        </div>
        <MetricCard
          label="Combined FL"
          value={n.ned.combinedFLPct}
          unit="%"
          format="int"
          threshold={THRESHOLDS.combinedFL}
          previousValue={p?.ned.combinedFLPct}
          compact
          tooltip="Percentage of breaths classified as flow-limited by either NED (≥34%) or Flatness Index (≥0.85). Combines both detection methods to catch obstruction that either metric alone might miss. Lower is better."
          methodology={METRIC_METHODOLOGIES.combinedFL}
          onClick={clickable ? () => openMetric('Combined FL', (x) => x.ned.combinedFLPct, { unit: '%', threshold: THRESHOLDS.combinedFL, description: 'Percentage of breaths classified as flow-limited by either NED (≥34%) or Flatness Index (≥0.85). Combines both detection methods to catch obstruction that either metric alone might miss.' }) : undefined}
        />
      </div>

      {/* Metric Detail Modal */}
      {detailMetric && (
        <MetricDetailModal
          label={detailMetric.label}
          unit={detailMetric.unit}
          nights={nights}
          selectedDate={n.dateStr}
          accessor={detailMetric.accessor}
          threshold={detailMetric.threshold}
          description={detailMetric.description}
          onClose={() => setDetailMetric(null)}
        />
      )}
    </div>
  );
}
