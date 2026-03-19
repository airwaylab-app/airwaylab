'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getTrafficLight, getTrafficColor, type ThresholdDef } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';

type SortKey = 'date' | 'ti' | 'dwell' | 'premature' | 'late' | 'vtCv';

const cols: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: 'date', label: 'Date', shortLabel: 'Date' },
  { key: 'ti', label: 'Ti (ms)', shortLabel: 'Ti' },
  { key: 'dwell', label: 'Dwell %', shortLabel: 'Dw%' },
  { key: 'premature', label: 'Premature %', shortLabel: 'Pm%' },
  { key: 'late', label: 'Late %', shortLabel: 'Lt%' },
  { key: 'vtCv', label: 'Vt CV %', shortLabel: 'CV%' },
];

function getMetricValue(n: NightResult, key: SortKey): string {
  if (key === 'date') return n.dateStr;
  if (!n.settingsMetrics) return '—';
  const sm = n.settingsMetrics;
  switch (key) {
    case 'ti': return sm.tiMedianMs.toFixed(0);
    case 'dwell': return sm.ipapDwellMedianPct.toFixed(0) + '%';
    case 'premature': return sm.prematureCyclePct.toFixed(0) + '%';
    case 'late': return sm.lateCyclePct.toFixed(0) + '%';
    case 'vtCv': return sm.tidalVolumeCv.toFixed(0) + '%';
  }
}

function getMetricColor(n: NightResult, key: SortKey, t: Record<string, ThresholdDef>): string {
  if (key === 'date' || !n.settingsMetrics) return '';
  const sm = n.settingsMetrics;
  switch (key) {
    case 'ti': return getTrafficColor(getTrafficLight(sm.tiMedianMs, t.settingsTi!));
    case 'dwell': return getTrafficColor(getTrafficLight(sm.ipapDwellMedianPct, t.settingsIpapDwell!));
    case 'premature': return getTrafficColor(getTrafficLight(sm.prematureCyclePct, t.settingsPrematureCycle!));
    case 'late': return getTrafficColor(getTrafficLight(sm.lateCyclePct, t.settingsLateCycle!));
    case 'vtCv': return getTrafficColor(getTrafficLight(sm.tidalVolumeCv, t.settingsVtCv!));
  }
}

function getSortValue(n: NightResult, key: SortKey): number {
  if (key === 'date') return new Date(n.dateStr).getTime();
  if (!n.settingsMetrics) return -Infinity;
  const sm = n.settingsMetrics;
  switch (key) {
    case 'ti': return sm.tiMedianMs;
    case 'dwell': return sm.ipapDwellMedianPct;
    case 'premature': return sm.prematureCyclePct;
    case 'late': return sm.lateCyclePct;
    case 'vtCv': return sm.tidalVolumeCv;
  }
}

interface Props {
  nights: NightResult[];
}

export function SettingsMetricsTable({ nights }: Props) {
  const THRESHOLDS = useThresholds();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => [...nights].sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    return sortAsc ? av - bv : bv - av;
  }), [nights, sortKey, sortAsc]);

  const nightsWithSettings = nights.filter((n) => n.settingsMetrics);
  if (nightsWithSettings.length < 2) return null;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const metricKeys: SortKey[] = ['ti', 'dwell', 'premature', 'late', 'vtCv'];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Settings Metrics</CardTitle>
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
                  {metricKeys.map((key) => (
                    <td
                      key={key}
                      className={`py-2 pr-4 font-mono tabular-nums ${getMetricColor(n, key, THRESHOLDS)}`}
                    >
                      {getMetricValue(n, key)}
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
              <div className="mb-2 font-mono text-xs font-medium tabular-nums">{n.dateStr}</div>
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
