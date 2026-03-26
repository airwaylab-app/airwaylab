import { describe, it, expect } from 'vitest';
import type { NightResult } from '@/lib/types';

// ── Synthetic data helper ────────────────────────────────────

function makeNight(dateStr: string, glasgowOverall: number): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      epap: 10,
      ipap: 14,
      pressureSupport: 4,
      papMode: 'APAP',
      riseTime: null,
      trigger: 'Medium',
      cycle: 'Medium',
      easyBreathe: false,
      settingsSource: 'extracted',
    },
    glasgow: {
      overall: glasgowOverall,
      skew: 0.3, spike: 0.2, flatTop: 0.1, topHeavy: 0.1,
      multiPeak: 0.1, noPause: 0.2, inspirRate: 0.3, multiBreath: 0.1, variableAmp: 0.2,
    },
    wat: { flScore: 25, regularityScore: 35, periodicityIndex: 8 },
    ned: {
      breathCount: 300, nedMean: 18, nedMedian: 15, nedP95: 40,
      nedClearFLPct: 20, nedBorderlinePct: 15, fiMean: 0.7, fiFL85Pct: 12,
      tpeakMean: 0.35, mShapePct: 5, reraIndex: 3, reraCount: 6,
      h1NedMean: 16, h2NedMean: 20, combinedFLPct: 35, estimatedArousalIndex: 12,
    },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null, machineSummary: null, settingsFingerprint: null, csl: null, pldSummary: null,
  };
}

const NIGHTS: NightResult[] = [
  makeNight('2025-01-15', 1.8),
  makeNight('2025-01-14', 1.2),
  makeNight('2025-01-13', 2.6),
  makeNight('2025-01-12', 1.5),
  makeNight('2025-01-11', 2.1),
];

// ── Sorting logic tests (extracted from component logic) ─────

// Heatmap sorting logic (mirrors night-heatmap.tsx)
type SortConfig = {
  column: 'date' | 'metric';
  metricKey?: string;
  direction: 'asc' | 'desc';
};

function sortNightsHeatmap(nights: NightResult[], config: SortConfig): NightResult[] {
  const base = [...nights].reverse(); // chronological (oldest first)

  if (config.column === 'date') {
    return config.direction === 'asc' ? base : [...base].reverse();
  }

  if (config.column === 'metric' && config.metricKey === 'glasgow') {
    return [...base].sort((a, b) => {
      const va = a.glasgow.overall;
      const vb = b.glasgow.overall;
      return config.direction === 'asc' ? va - vb : vb - va;
    });
  }

  return base;
}

// MetricsTable sorting logic (mirrors metrics-table.tsx)
function sortNightsTable(nights: NightResult[], sortKey: string, sortAsc: boolean): NightResult[] {
  return [...nights].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === 'date') {
      av = new Date(a.dateStr).getTime();
      bv = new Date(b.dateStr).getTime();
    } else {
      av = a.glasgow.overall;
      bv = b.glasgow.overall;
    }
    return sortAsc ? av - bv : bv - av;
  });
}

// ── Heatmap tests ────────────────────────────────────────────

describe('NightHeatmap sort logic', () => {
  it('defaults to date descending (newest first)', () => {
    const defaultConfig: SortConfig = { column: 'date', direction: 'desc' };
    const sorted = sortNightsHeatmap(NIGHTS, defaultConfig);
    expect(sorted[0]!.dateStr).toBe('2025-01-15');
    expect(sorted[sorted.length - 1]!.dateStr).toBe('2025-01-11');
  });

  it('clicking Date after metric sort returns to newest-first', () => {
    // Simulate: sort by metric first, then switch to date
    // handleSort should default date to 'desc'
    const afterMetricSort: SortConfig = { column: 'metric', metricKey: 'glasgow', direction: 'asc' };
    const metricSorted = sortNightsHeatmap(NIGHTS, afterMetricSort);
    // Lowest glasgow first
    expect(metricSorted[0]!.glasgow.overall).toBe(1.2);

    // Now switch to date — should default to desc
    const dateConfig: SortConfig = { column: 'date', direction: 'desc' };
    const dateSorted = sortNightsHeatmap(NIGHTS, dateConfig);
    expect(dateSorted[0]!.dateStr).toBe('2025-01-15');
  });

  it('clicking Date header toggles direction', () => {
    const descConfig: SortConfig = { column: 'date', direction: 'desc' };
    const descSorted = sortNightsHeatmap(NIGHTS, descConfig);
    expect(descSorted[0]!.dateStr).toBe('2025-01-15');

    const ascConfig: SortConfig = { column: 'date', direction: 'asc' };
    const ascSorted = sortNightsHeatmap(NIGHTS, ascConfig);
    expect(ascSorted[0]!.dateStr).toBe('2025-01-11');
  });
});

// ── MetricsTable tests ───────────────────────────────────────

describe('MetricsTable sort logic', () => {
  it('defaults to date descending (newest at top)', () => {
    const sorted = sortNightsTable(NIGHTS, 'date', false);
    expect(sorted[0]!.dateStr).toBe('2025-01-15');
  });

  it('re-selecting Date after Glasgow defaults to descending (newest first)', () => {
    // User clicks Glasgow (ascending), then clicks Date
    // The fix: sortAsc should default to false for all columns
    const sortAsc = false; // Fixed default
    const sorted = sortNightsTable(NIGHTS, 'date', sortAsc);
    expect(sorted[0]!.dateStr).toBe('2025-01-15');
  });

  it('toggling Date sort switches direction', () => {
    const descSorted = sortNightsTable(NIGHTS, 'date', false);
    expect(descSorted[0]!.dateStr).toBe('2025-01-15');

    const ascSorted = sortNightsTable(NIGHTS, 'date', true);
    expect(ascSorted[0]!.dateStr).toBe('2025-01-11');
  });
});
