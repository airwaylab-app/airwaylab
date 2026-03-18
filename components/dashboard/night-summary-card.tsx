'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTrafficLight, getTrafficColor, type TrafficLight } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import { fmtHrs } from '@/lib/format-utils';

interface Props {
  night: NightResult;
}

export const NightSummaryCard = memo(function NightSummaryCard({ night }: Props) {
  const THRESHOLDS = useThresholds();
  const { glasgow, wat, ned, settings, durationHours, sessionCount } = night;

  const tlLabel = (tl: TrafficLight) =>
    tl === 'good' ? 'normal' : tl === 'warn' ? 'borderline' : 'elevated';

  const metrics = useMemo(() => [
    {
      label: 'Glasgow Index',
      value: glasgow.overall.toFixed(2),
      tl: getTrafficLight(glasgow.overall, THRESHOLDS.glasgowOverall),
      color: getTrafficColor(getTrafficLight(glasgow.overall, THRESHOLDS.glasgowOverall)),
    },
    {
      label: 'FL Score',
      value: wat.flScore.toFixed(1) + '%',
      tl: getTrafficLight(wat.flScore, THRESHOLDS.watFL),
      color: getTrafficColor(getTrafficLight(wat.flScore, THRESHOLDS.watFL)),
    },
    {
      label: 'Regularity',
      value: wat.regularityScore.toFixed(0) + '%',
      tl: getTrafficLight(wat.regularityScore, THRESHOLDS.watRegularity),
      color: getTrafficColor(getTrafficLight(wat.regularityScore, THRESHOLDS.watRegularity)),
    },
    {
      label: 'Periodicity',
      value: wat.periodicityIndex.toFixed(1) + '%',
      tl: getTrafficLight(wat.periodicityIndex, THRESHOLDS.watPeriodicity),
      color: getTrafficColor(getTrafficLight(wat.periodicityIndex, THRESHOLDS.watPeriodicity)),
    },
    {
      label: 'NED Mean',
      value: ned.nedMean.toFixed(1) + '%',
      tl: getTrafficLight(ned.nedMean, THRESHOLDS.nedMean),
      color: getTrafficColor(getTrafficLight(ned.nedMean, THRESHOLDS.nedMean)),
    },
    {
      label: 'RERA Index',
      value: ned.reraIndex.toFixed(1) + '/hr',
      tl: getTrafficLight(ned.reraIndex, THRESHOLDS.reraIndex),
      color: getTrafficColor(getTrafficLight(ned.reraIndex, THRESHOLDS.reraIndex)),
    },
    {
      label: 'Combined FL',
      value: ned.combinedFLPct.toFixed(0) + '%',
      tl: null as TrafficLight | null,
      color: '',
    },
  ], [glasgow, wat, ned, THRESHOLDS]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{night.dateStr}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">{fmtHrs(durationHours)}</Badge>
            <Badge variant="secondary">
              {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">{settings.papMode}</Badge>
            {settings.epap > 0 && (
              <Badge variant="outline">
                {settings.epap}/{settings.ipap} cmH₂O
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span
                className={`text-lg font-semibold ${m.color}`}
                aria-label={`${m.label}: ${m.value}${m.tl ? `, ${tlLabel(m.tl)}` : ''}`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
