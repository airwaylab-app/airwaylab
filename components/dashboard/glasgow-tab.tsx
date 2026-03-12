'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import { GlasgowRadar } from '@/components/charts/glasgow-radar';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  previousNight: NightResult | null;
  therapyChangeDate: string | null;
}

const COMPONENT_INFO: { key: keyof NightResult['glasgow']; label: string; desc: string }[] = [
  { key: 'skew', label: 'Skew', desc: 'Asymmetry of the inspiratory waveform' },
  { key: 'spike', label: 'Spike', desc: 'Sharp transient peaks in flow' },
  { key: 'flatTop', label: 'Flat Top', desc: 'Plateau indicating flow limitation' },
  { key: 'topHeavy', label: 'Top Heavy', desc: 'Excess flow in early inspiration' },
  { key: 'multiPeak', label: 'Multi-Peak', desc: 'Multiple peaks per inspiration' },
  { key: 'noPause', label: 'No Pause', desc: 'Absent end-inspiratory pause' },
  { key: 'inspirRate', label: 'Insp. Rate', desc: 'Inspiratory flow rate changes' },
  { key: 'multiBreath', label: 'Multi-Breath', desc: 'Cross-breath pattern irregularity' },
  { key: 'variableAmp', label: 'Var. Amp', desc: 'Breath amplitude variability' },
];

export function GlasgowTab({ nights, selectedNight, previousNight, therapyChangeDate: _therapyChangeDate }: Props) {
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
      {/* Overall Score */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Glasgow Overall"
          value={n.glasgow.overall}
          threshold={THRESHOLDS.glasgowOverall}
          previousValue={p?.glasgow.overall}
          tooltip="Sum of 8 breath-shape components (excluding Top Heavy). Typical scores range from 0 to about 3 — lower is better. Based on the original Glasgow Index by DaveSkvn."
          onClick={clickable ? () => openMetric('Glasgow Overall', (x) => x.glasgow.overall, { threshold: THRESHOLDS.glasgowOverall, description: 'Composite breath-shape abnormality score across all nights' }) : undefined}
        />
        <div className="sm:col-span-2">
          <Card className="h-full border-border/50">
            <CardContent className="flex h-full items-center py-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                The Glasgow Index quantifies flow limitation across 9 breath-shape
                components. Each component is scored per breath and averaged across the
                session. The overall index sums 8 components (excluding Top Heavy).
                Lower values indicate more normal breathing patterns.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Radar Chart */}
      <GlasgowRadar glasgow={n.glasgow} />

      {/* Component Breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Component Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {COMPONENT_INFO.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium sm:text-sm">{c.label}</div>
                  <div className="hidden text-xs text-muted-foreground sm:block">{c.desc}</div>
                </div>
                <div className="ml-2 shrink-0 font-mono text-base tabular-nums sm:text-lg">
                  {(n.glasgow[c.key] as number).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Night Glasgow Trend */}
      {nights.length > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Glasgow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1">
              {(() => {
                const reversed = [...nights].reverse();
                const maxVal = Math.max(...reversed.map((night) => night.glasgow.overall), 1);
                const maxH = 80;
                return reversed.map((night) => {
                  const val = night.glasgow.overall;
                  const h = (val / maxVal) * maxH;
                  const isSelected = night.dateStr === n.dateStr;
                  return (
                    <div
                      key={night.dateStr}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                        {val.toFixed(1)}
                      </span>
                      <div
                        className={`w-full rounded-t transition-colors ${
                          isSelected ? 'bg-primary' : 'bg-primary/30'
                        }`}
                        style={{ height: `${Math.max(h, 4)}px` }}
                      />
                      <span className="text-[9px] text-muted-foreground">
                        {night.dateStr.slice(5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

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
