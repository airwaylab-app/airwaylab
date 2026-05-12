'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 20;
import { getTrafficLight, getTrafficColor, type ThresholdDef } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import { fmtHrs } from '@/lib/format-utils';
import { findSettingsChangeBoundaries } from '@/lib/comparison-guard';

type SortKey = 'date' | 'glasgow' | 'fl' | 'regularity' | 'periodicity' | 'ned' | 'rera' | 'boi' | 'duration' | 'ahi' | 'leak95' | 'spontPct';

interface Props {
  nights: NightResult[];
}

const cols: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: 'date', label: 'Date', shortLabel: 'Date' },
  { key: 'duration', label: 'Duration', shortLabel: 'Dur' },
  { key: 'ahi', label: 'AHI', shortLabel: 'AHI' },
  { key: 'leak95', label: 'Leak P95', shortLabel: 'Lk95' },
  { key: 'glasgow', label: 'Glasgow', shortLabel: 'Gla' },
  { key: 'fl', label: 'FL Score', shortLabel: 'FL' },
  { key: 'regularity', label: 'Regularity', shortLabel: 'Reg' },
  { key: 'periodicity', label: 'Periodicity', shortLabel: 'Per' },
  { key: 'ned', label: 'NED Mean', shortLabel: 'NED' },
  { key: 'rera', label: 'RERA/hr', shortLabel: 'RERA' },
  { key: 'boi', label: 'BOI/hr', shortLabel: 'BOI' },
  { key: 'spontPct', label: 'Spontaneous%', shortLabel: 'Sp%' },
];

function getMetricValue(n: NightResult, key: SortKey): string {
  switch (key) {
    case 'date': return n.dateStr;
    case 'duration': return fmtHrs(n.durationHours);
    case 'glasgow': return n.glasgow.overall.toFixed(2);
    case 'fl': return n.wat.flScore.toFixed(1) + '%';
    case 'regularity': return n.wat.regularityScore.toFixed(0) + '%';
    case 'periodicity': return n.wat.periodicityIndex.toFixed(1) + '%';
    case 'ned': return n.ned.nedMean.toFixed(1) + '%';
    case 'rera': return n.ned.reraIndex.toFixed(1);
    case 'boi': return (n.ned.briefObstructionIndex ?? 0).toFixed(1);
    case 'ahi': return n.machineSummary?.ahi != null ? n.machineSummary.ahi.toFixed(1) : '-';
    case 'leak95': return n.machineSummary?.leak95 != null ? n.machineSummary.leak95.toFixed(0) : '-';
    case 'spontPct': return n.spontaneousPct != null ? n.spontaneousPct.toFixed(1) + '%' : '—';
  }
}

function getMetricColor(n: NightResult, key: SortKey, t: Record<string, ThresholdDef>): string {
  switch (key) {
    case 'glasgow': return getTrafficColor(getTrafficLight(n.glasgow.overall, t.glasgowOverall!));
    case 'fl': return getTrafficColor(getTrafficLight(n.wat.flScore, t.watFL!));
    case 'regularity': return getTrafficColor(getTrafficLight(n.wat.regularityScore, t.watRegularity!));
    case 'periodicity': return getTrafficColor(getTrafficLight(n.wat.periodicityIndex, t.watPeriodicity!));
    case 'ned': return getTrafficColor(getTrafficLight(n.ned.nedMean, t.nedMean!));
    case 'rera': return getTrafficColor(getTrafficLight(n.ned.reraIndex, t.reraIndex!));
    case 'boi': return t.briefObstructionIndex ? getTrafficColor(getTrafficLight(n.ned.briefObstructionIndex ?? 0, t.briefObstructionIndex)) : '';
    case 'ahi': return n.machineSummary?.ahi != null && t.machineAhi ? getTrafficColor(getTrafficLight(n.machineSummary.ahi, t.machineAhi)) : '';
    case 'leak95': return n.machineSummary?.leak95 != null && t.leak95 ? getTrafficColor(getTrafficLight(n.machineSummary.leak95, t.leak95)) : '';
    case 'spontPct': return n.spontaneousPct != null && t.spontCycPct
      ? getTrafficColor(getTrafficLight(n.spontaneousPct, t.spontCycPct))
      : '';
    default: return '';
  }
}

export function MetricsTable({ nights }: Props) {
  const THRESHOLDS = useThresholds();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
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
      case 'boi': return n.ned.briefObstructionIndex ?? 0;
      case 'duration': return n.durationHours;
      case 'ahi': return n.machineSummary?.ahi ?? -1;
      case 'leak95': return n.machineSummary?.leak95 ?? -1;
      case 'spontPct': return n.spontaneousPct ?? -1;
    }
  };

  const sorted = useMemo(() => [...nights].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    return sortAsc ? av - bv : bv - av;
  }), [nights, sortKey, sortAsc]);

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visibleCount;
  const metricKeys: SortKey[] = ['ahi', 'leak95', 'glasgow', 'fl', 'regularity', 'periodicity', 'ned', 'rera', 'boi', 'spontPct'];

  // Detect settings change boundaries for visual markers
  const boundaries = useMemo(() => {
    const dateSet = new Set(
      findSettingsChangeBoundaries(nights).map((b) => nights[b.index]?.dateStr)
    );
    return dateSet;
  }, [nights]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">All Nights</CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing {Math.min(visibleCount, sorted.length)} of {sorted.length}
          </span>
        </div>
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
              {visible.map((n) => (
                <tr
                  key={n.dateStr}
                  className={`border-b transition-colors hover:bg-card/50 ${
                    boundaries.has(n.dateStr) ? 'border-t-2 border-t-amber-500/40 border-b-border/30' : 'border-b-border/30'
                  }`}
                >
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, c.key, THRESHOLDS)}`}
                    >
                      {getMetricValue(n, c.key)}
                    </td>
                  ))}
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
                <span className="text-[10px] text-muted-foreground">{fmtHrs(n.durationHours)}</span>
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

        {remaining > 0 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more ({Math.min(remaining, PAGE_SIZE)} nights)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount(sorted.length)}
            >
              Load all ({remaining} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
