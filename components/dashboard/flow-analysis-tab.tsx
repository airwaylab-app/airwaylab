'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';

interface Props {
  selectedNight: NightResult;
  previousNight: NightResult | null;
}

export function FlowAnalysisTab({ selectedNight, previousNight }: Props) {
  const THRESHOLDS = useThresholds();
  const n = selectedNight;
  const p = previousNight;

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
          />
          <MetricCard
            label="Regularity Score"
            value={n.wat.regularityScore}
            unit="%"
            format="int"
            threshold={THRESHOLDS.watRegularity}
            previousValue={p?.wat.regularityScore}
          />
          <MetricCard
            label="Periodicity Index"
            value={n.wat.periodicityIndex}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.watPeriodicity}
            previousValue={p?.wat.periodicityIndex}
          />
        </div>
        <Card className="mt-3 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">FL Score</strong> measures the median
              tidal volume ratio — higher values indicate greater flow limitation.{' '}
              <strong className="text-foreground">Regularity</strong> uses Sample Entropy
              to quantify breathing pattern consistency — higher scores indicate more
              repetitive patterns, which during CPAP therapy may signal persistent flow limitation.{' '}
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
          />
          <MetricCard
            label="NED P95"
            value={n.ned.nedP95}
            unit="%"
            format="pct"
            threshold={THRESHOLDS.nedP95}
            previousValue={p?.ned.nedP95}
          />
          <MetricCard
            label="RERA Index"
            value={n.ned.reraIndex}
            unit="/hr"
            threshold={THRESHOLDS.reraIndex}
            previousValue={p?.ned.reraIndex}
          />
          <MetricCard
            label="RERA Count"
            value={n.ned.reraCount}
            format="int"
            previousValue={p?.ned.reraCount}
          />
          <MetricCard
            label="Est. Arousal Index"
            value={n.ned.estimatedArousalIndex}
            unit="/hr"
            threshold={THRESHOLDS.eai}
            previousValue={p?.ned.estimatedArousalIndex}
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
            />
            <MetricCard
              label="Borderline FL"
              value={n.ned.nedBorderlinePct}
              unit="%"
              format="pct"
              previousValue={p?.ned.nedBorderlinePct}
              compact
            />
            <MetricCard
              label="Flatness Index"
              value={n.ned.fiMean}
              format="pct"
              previousValue={p?.ned.fiMean}
              compact
            />
            <MetricCard
              label="FI > 0.85"
              value={n.ned.fiFL85Pct}
              unit="%"
              format="pct"
              previousValue={p?.ned.fiFL85Pct}
              compact
            />
            <MetricCard
              label="M-Shape"
              value={n.ned.mShapePct}
              unit="%"
              format="pct"
              previousValue={p?.ned.mShapePct}
              compact
            />
            <MetricCard
              label="Tpeak/Ti Mean"
              value={n.ned.tpeakMean}
              format="pct"
              previousValue={p?.ned.tpeakMean}
              compact
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
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground sm:gap-4">
        <span>
          Total breaths: <strong className="text-foreground">{n.ned.breathCount}</strong>
        </span>
        <span>
          Combined FL:{' '}
          <strong className="text-foreground">{n.ned.combinedFLPct.toFixed(0)}%</strong>
        </span>
      </div>
    </div>
  );
}
