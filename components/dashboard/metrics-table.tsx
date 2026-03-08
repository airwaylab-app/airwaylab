'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getTrafficLight, getTrafficColor, type ThresholdDef } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';

type SortKey = 'date' | 'glasgow' | 'fl' | 'regularity' | 'periodicity' | 'ned' | 'rera' | 'duration';

interface Props {
  nights: NightResult[];
}

const cols: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: 'date', label: 'Date', shortLabel: 'Date' },
  { key: 'duration', label: 'Duration', shortLabel: 'Dur' },
  { key: 'glasgow', label: 'Glasgow', shortLabel: 'Gla' },
  { key: 'fl', label: 'FL Score', shortLabel: 'FL' },
  { key: 'regularity', label: 'Regularity', shortLabel: 'Reg' },
  { key: 'periodicity', label: 'Periodicity', shortLabel: 'Per' },
  { key: 'ned', label: 'NED Mean', shortLabel: 'NED' },
  { key: 'rera', label: 'RERA/hr', shortLabel: 'RERA' },
];

function fmtDuration(h: number): string {
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

function getMetricValue(n: NightResult, key: SortKey): string {
  switch (key) {
    case 'date': return n.dateStr;
    case 'duration': return fmtDuration(n.durationHours);
    case 'glasgow': return n.glasgow.overall.toFixed(1);
    case 'fl': return n.wat.flScore.toFixed(1) + '%';
    case 'regularity': return n.wat.regularityScore.toFixed(0) + '%';
    case 'periodicity': return n.wat.periodicityIndex.toFixed(1) + '%';
    case 'ned': return n.ned.nedMean.toFixed(1) + '%';
    case 'rera': return n.ned.reraIndex.toFixed(1);
  }
}

function getMetricColor(n: NightResult, key: SortKey, t: Record<string, ThresholdDef>): string {
  switch (key) {
    case 'glasgow': return getTrafficColor(getTrafficLight(n.glasgow.overall, t.glasgowOverall));
    case 'fl': return getTrafficColor(getTrafficLight(n.wat.flScore, t.watFL));
    case 'regularity': return getTrafficColor(getTrafficLight(n.wat.regularityScore, t.watRegularity));
    case 'periodicity': return getTrafficColor(getTrafficLight(n.wat.periodicityIndex, t.watPeriodicity));
    case 'ned': return getTrafficColor(getTrafficLight(n.ned.nedMean, t.nedMean));
    case 'rera': return getTrafficColor(getTrafficLight(n.ned.reraIndex, t.reraIndex));
    default: return '';
  }
}

export function MetricsTable({ nights }: Props) {
  const THRESHOLDS = useThresholds();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'date');
    }
  };

  const getValue = (n: NightResult, key: SortKey): number => {
    switch (key) {
      case 'date': return new Date(n.dateStr).getTime();
      case 'glasgow': return n.glasgow.overall;
      case 'fl': return n.wat.flScore;
      case 'regularity': return n.wat.regularityScore;
      case 'periodicity': return n.wat.periodicityIndex;
      case 'ned': return n.ned.nedMean;
      case 'rera': return n.ned.reraIndex;
      case 'duration': return n.durationHours;
    }
  };

  const sorted = useMemo(() => [...nights].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    return sortAsc ? av - bv : bv - av;
  }), [nights, sortKey, sortAsc]);

  const metricKeys: SortKey[] = ['glasgow', 'fl', 'regularity', 'periodicity', 'ned', 'rera'];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">All Nights</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-left text-muted-foreground">
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer pb-2 pr-4 font-medium select-none transition-colors hover:text-foreground"
                    onClick={() => handleSort(c.key)}
                    aria-sort={sortKey === c.key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                    scope="col"
                    role="columnheader"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {sortKey === c.key && (
                        sortAsc
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((n) => (
                <tr key={n.dateStr} className="border-b border-border/30 transition-colors hover:bg-card/50">
                  <td className="py-2 pr-4 font-mono tabular-nums">{n.dateStr}</td>
                  <td className="py-2 pr-4 font-mono tabular-nums">{fmtDuration(n.durationHours)}</td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'glasgow', THRESHOLDS)}`}>
                    {n.glasgow.overall.toFixed(1)}
                  </td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'fl', THRESHOLDS)}`}>
                    {n.wat.flScore.toFixed(1)}%
                  </td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'regularity', THRESHOLDS)}`}>
                    {n.wat.regularityScore.toFixed(0)}%
                  </td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'periodicity', THRESHOLDS)}`}>
                    {n.wat.periodicityIndex.toFixed(1)}%
                  </td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'ned', THRESHOLDS)}`}>
                    {n.ned.nedMean.toFixed(1)}%
                  </td>
                  <td className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, 'rera', THRESHOLDS)}`}>
                    {n.ned.reraIndex.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="flex flex-col gap-3 sm:hidden">
          {sorted.map((n) => (
            <div
              key={n.dateStr}
              className="rounded-lg border border-border/30 bg-card/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-medium tabular-nums">{n.dateStr}</span>
                <span className="text-[10px] text-muted-foreground">{fmtDuration(n.durationHours)}</span>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                {metricKeys.map((key) => {
                  const col = cols.find((c) => c.key === key)!;
                  return (
                    <div key={key} className="flex items-baseline justify-between">
                      <span className="text-[10px] text-muted-foreground">{col.shortLabel}</span>
                      <span className={`font-mono text-xs tabular-nums ${getMetricColor(n, key, THRESHOLDS)}`}>
                        {getMetricValue(n, key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
