import { describe, it, expect } from 'vitest';
import type { NightResult, NEDResults, Breath, OximetryTraceData } from '@/lib/types';

// Mirror of the stripNightBulkData function from workers/analysis-worker.ts
// (not exported from worker — duplicated here for testing, must stay in sync)
function stripNightBulkData(night: NightResult): NightResult {
  return {
    ...night,
    ned: { ...night.ned, breaths: [] },
    oximetryTrace: null,
  };
}

function makeBreath(i: number): Breath {
  return {
    inspStart: i * 100,
    inspEnd: i * 100 + 50,
    expStart: i * 100 + 50,
    expEnd: i * 100 + 100,
    inspFlow: new Float32Array(50).fill(1.0),
    qPeak: 1.0,
    qMid: 0.8,
    ti: 2.0,
    tPeakTi: 0.4,
    ned: 25,
    fi: 0.7,
    isMShape: false,
    isEarlyPeakFL: false,
  };
}

function makeNEDWithBreaths(count: number): NEDResults {
  return {
    breathCount: count,
    breaths: Array.from({ length: count }, (_, i) => makeBreath(i)),
    nedMean: 22.5,
    nedMedian: 18.0,
    nedP95: 55.0,
    nedClearFLPct: 30,
    nedBorderlinePct: 15,
    fiMean: 0.72,
    fiFL85Pct: 25,
    tpeakMean: 0.35,
    mShapePct: 8,
    reraIndex: 4.2,
    reraCount: 30,
    h1NedMean: 20,
    h2NedMean: 24,
    combinedFLPct: 45,
    estimatedArousalIndex: 12,
  };
}

function makeOximetryTrace(): OximetryTraceData {
  return {
    trace: Array.from({ length: 100 }, (_, i) => ({ t: i * 2, spo2: 95, hr: 62 })),
    durationSeconds: 200,
    odi3Events: [50, 100],
    odi4Events: [],
  };
}

// Minimal NightResult factory
function makeNight(dateStr: string, withBulkData: boolean): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7.5,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      epap: 6, ipap: 12, pressureSupport: 6,
      papMode: 'CPAP', riseTime: null,
      trigger: 'N/A', cycle: 'N/A', easyBreathe: false,
      settingsSource: 'extracted',
    },
    glasgow: {
      overall: 3.5, skew: 0.4, spike: 0.3, flatTop: 0.5, topHeavy: 0.2,
      multiPeak: 0.3, noPause: 0.6, inspirRate: 0.4, multiBreath: 0.3, variableAmp: 0.5,
    },
    wat: { flScore: 45, regularityScore: 0.12, periodicityIndex: 0.05 },
    ned: withBulkData ? makeNEDWithBreaths(500) : makeNEDWithBreaths(0),
    oximetry: null,
    oximetryTrace: withBulkData ? makeOximetryTrace() : null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: null,
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  };
}

describe('stripNightBulkData — worker RESULTS payload size reduction', () => {
  it('removes ned.breaths from stripped night', () => {
    const night = makeNight('2026-01-01', true);
    expect(night.ned.breaths).toHaveLength(500);

    const stripped = stripNightBulkData(night);
    expect(stripped.ned.breaths).toHaveLength(0);
  });

  it('nulls oximetryTrace from stripped night', () => {
    const night = makeNight('2026-01-01', true);
    expect(night.oximetryTrace).not.toBeNull();

    const stripped = stripNightBulkData(night);
    expect(stripped.oximetryTrace).toBeNull();
  });

  it('preserves all scalar NED metrics after stripping', () => {
    const night = makeNight('2026-01-01', true);
    const stripped = stripNightBulkData(night);

    expect(stripped.ned.breathCount).toBe(500);
    expect(stripped.ned.nedMean).toBe(22.5);
    expect(stripped.ned.nedP95).toBe(55.0);
    expect(stripped.ned.reraIndex).toBe(4.2);
  });

  it('preserves identity of nights without bulk data', () => {
    const night = makeNight('2026-01-02', false);
    const stripped = stripNightBulkData(night);

    expect(stripped.ned.breaths).toHaveLength(0);
    expect(stripped.oximetryTrace).toBeNull();
    expect(stripped.ned.breathCount).toBe(0);
  });

  it('stripped night triggers restore conditions (breaths empty, trace null)', () => {
    const night = makeNight('2026-01-01', true);
    const stripped = stripNightBulkData(night);

    // restoreBreathData() filter: breathCount > 0 && (!breaths || breaths.length === 0)
    const needsBreathRestore = stripped.ned.breathCount > 0 && (!stripped.ned.breaths || stripped.ned.breaths.length === 0);
    expect(needsBreathRestore).toBe(true);

    // restoreOximetryTraces() filter: oximetry !== null && oximetryTrace === null
    // (Night has no oximetry in this fixture, so test structural condition only)
    expect(stripped.oximetryTrace).toBeNull();
  });

  it('dataset of 365 stripped nights has no Float32Array bulk data', () => {
    const nights = Array.from({ length: 365 }, (_, i) => {
      const d = new Date('2025-01-01');
      d.setDate(d.getDate() + i);
      return makeNight(d.toISOString().slice(0, 10), true);
    });

    const strippedNights = nights.map(stripNightBulkData);

    // No night should contain Float32Array inspFlow data after stripping
    for (const night of strippedNights) {
      expect(night.ned.breaths ?? []).toHaveLength(0);
      expect(night.oximetryTrace).toBeNull();
    }
  });
});
