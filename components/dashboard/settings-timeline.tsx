'use client';

import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import type { NightResult, MachineSettings } from '@/lib/types';

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

type SortKey = 'date' | 'mode' | 'epap' | 'ipap' | 'ps' | 'riseTime' | 'trigger' | 'cycle' | 'easyBreathe';

const cols: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'mode', label: 'Mode' },
  { key: 'epap', label: 'EPAP' },
  { key: 'ipap', label: 'IPAP' },
  { key: 'ps', label: 'PS' },
  { key: 'riseTime', label: 'Rise Time' },
  { key: 'trigger', label: 'Trigger' },
  { key: 'cycle', label: 'Cycle' },
  { key: 'easyBreathe', label: 'EasyBreathe' },
];

function getSortValue(n: NightResult, key: SortKey): number | string {
  const s = n.settings;
  switch (key) {
    case 'date': return new Date(n.dateStr).getTime();
    case 'mode': return s.papMode;
    case 'epap': return s.epap;
    case 'ipap': return s.ipap;
    case 'ps': return s.pressureSupport;
    case 'riseTime': return s.riseTime ?? -1;
    case 'trigger': return s.trigger;
    case 'cycle': return s.cycle;
    case 'easyBreathe': return s.easyBreathe ? 1 : 0;
  }
}

function settingsChanged(a: MachineSettings, b: MachineSettings): string[] {
  const changes: string[] = [];
  if (a.papMode !== b.papMode) changes.push('Mode');
  if (a.epap !== b.epap) changes.push('EPAP');
  if (a.ipap !== b.ipap) changes.push('IPAP');
  if (a.pressureSupport !== b.pressureSupport) changes.push('PS');
  if (a.riseTime !== b.riseTime) changes.push('Rise Time');
  if (a.trigger !== b.trigger) changes.push('Trigger');
  if (a.cycle !== b.cycle) changes.push('Cycle');
  if (a.easyBreathe !== b.easyBreathe) changes.push('EasyBreathe');
  return changes;
}

export const SettingsTimeline = memo(function SettingsTimeline({ nights, therapyChangeDate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false); // newest first by default

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'date');
    }
  };

  const sorted = useMemo(() => {
    return [...nights].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [nights, sortKey, sortAsc]);

  // Memoize settings change detection — uses chronological order (reversed nights)
  const changeMap = useMemo(() => {
    const chrono = [...nights].reverse();
    const map = new Map<string, string[]>();
    for (let i = 1; i < chrono.length; i++) {
      const changes = settingsChanged(chrono[i - 1].settings, chrono[i].settings);
      if (changes.length > 0) {
        map.set(chrono[i].dateStr, changes);
      }
    }
    return map;
  }, [nights]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Machine Settings Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-xs" aria-label="Machine settings per night">
            <thead>
              <tr className="border-b border-border/50 text-left text-muted-foreground">
                {cols.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`pb-2 ${col.key === 'easyBreathe' ? '' : 'pr-4'} font-medium cursor-pointer select-none transition-colors hover:text-foreground`}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
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
              {sorted.map((n) => {
                const s = n.settings;
                const isChange = n.dateStr === therapyChangeDate;
                const changes = changeMap.get(n.dateStr) || [];
                const hasChanges = changes.length > 0;

                return (
                  <tr
                    key={n.dateStr}
                    className={`border-b border-border/30 ${
                      hasChanges || isChange
                        ? 'border-l-2 border-l-amber-500 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-mono tabular-nums">
                      <span className="flex items-center gap-1.5">
                        {n.dateStr}
                        {(hasChanges || isChange) && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />
                        )}
                        {(hasChanges || isChange) && (
                          <span className="sr-only">Settings changed</span>
                        )}
                      </span>
                    </td>
                    <td className={`py-2 pr-4 ${changes.includes('Mode') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.papMode}
                    </td>
                    <td className={`py-2 pr-4 font-mono tabular-nums ${changes.includes('EPAP') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.epap || '—'}
                    </td>
                    <td className={`py-2 pr-4 font-mono tabular-nums ${changes.includes('IPAP') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.ipap || '—'}
                    </td>
                    <td className={`py-2 pr-4 font-mono tabular-nums ${changes.includes('PS') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.pressureSupport || '—'}
                    </td>
                    <td className={`py-2 pr-4 font-mono tabular-nums ${changes.includes('Rise Time') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.riseTime !== null ? s.riseTime : '—'}
                    </td>
                    <td className={`py-2 pr-4 ${changes.includes('Trigger') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.trigger}
                    </td>
                    <td className={`py-2 pr-4 ${changes.includes('Cycle') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.cycle}
                    </td>
                    <td className={`py-2 ${changes.includes('EasyBreathe') ? 'font-semibold text-amber-400' : ''}`}>
                      {s.easyBreathe ? 'On' : 'Off'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="flex flex-col gap-3 sm:hidden">
          {sorted.map((n) => {
            const s = n.settings;
            const isChange = n.dateStr === therapyChangeDate;
            const changes = changeMap.get(n.dateStr) || [];
            const hasChanges = changes.length > 0;

            return (
              <div
                key={n.dateStr}
                className={`rounded-lg border p-3 ${
                  hasChanges || isChange
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/30 bg-card/30'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-medium tabular-nums">
                    {n.dateStr}
                    {(hasChanges || isChange) && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />
                    )}
                    {(hasChanges || isChange) && (
                      <span className="sr-only">Settings changed</span>
                    )}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">{s.papMode}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">EPAP/IPAP</span>
                    <span className={`font-mono tabular-nums ${changes.includes('EPAP') || changes.includes('IPAP') ? 'text-amber-400' : ''}`}>
                      {s.epap || '—'}/{s.ipap || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">PS</span>
                    <span className={`font-mono tabular-nums ${changes.includes('PS') ? 'text-amber-400' : ''}`}>
                      {s.pressureSupport || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Rise Time</span>
                    <span className={`font-mono tabular-nums ${changes.includes('Rise Time') ? 'text-amber-400' : ''}`}>
                      {s.riseTime !== null ? s.riseTime : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Trigger</span>
                    <span className={changes.includes('Trigger') ? 'text-amber-400' : ''}>{s.trigger}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Cycle</span>
                    <span className={changes.includes('Cycle') ? 'text-amber-400' : ''}>{s.cycle}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">EasyBreathe</span>
                    <span className={changes.includes('EasyBreathe') ? 'text-amber-400' : ''}>
                      {s.easyBreathe ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
                {hasChanges && (
                  <div className="mt-2 border-t border-amber-500/20 pt-1.5">
                    <span className="text-[10px] text-amber-400">
                      Changed: {changes.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
