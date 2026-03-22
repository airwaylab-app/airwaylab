import { describe, it, expect } from 'vitest';
import type { NightResult } from '@/lib/types';

/**
 * Mirrors the stripForShare function from share-button.tsx.
 * Extracted here so we can test the logic independently.
 */
function stripForShare(nights: NightResult[]): NightResult[] {
  return nights.map((n) => ({
    ...n,
    ned: {
      ...n.ned,
      breaths: [],
    },
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
  }));
}

/** Build a minimal NightResult for testing. */
function makeNight(overrides: Partial<NightResult> = {}): NightResult {
  return {
    date: new Date('2026-03-10'),
    dateStr: '2026-03-10',
    durationHours: 7,
    sessionCount: 1,
    settings: { deviceModel: 'AirSense 11', papMode: 'APAP' } as NightResult['settings'],
    glasgow: { overall: 3.2, skew: 0.4, spike: 0.3, flatTop: 0.5, topHeavy: 0.2, multiPeak: 0.3, noPause: 0.5, inspirRate: 0.4, multiBreath: 0.3, variableAmp: 0.3 },
    wat: { flScore: 45, regularityScore: 0.3, periodicityIndex: 0.1 },
    ned: {
      breathCount: 500,
      nedMean: 15,
      nedMedian: 12,
      nedP95: 40,
      nedClearFLPct: 30,
      nedBorderlinePct: 20,
      fiMean: 0.7,
      fiFL85Pct: 25,
      tpeakMean: 0.3,
      mShapePct: 5,
      reraIndex: 2,
      reraCount: 10,
      h1NedMean: 14,
      h2NedMean: 16,
      combinedFLPct: 35,
      estimatedArousalIndex: 8,
    },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    ...overrides,
  };
}

describe('share — strip bulk data', () => {
  it('removes oximetryTrace from each night', () => {
    const nights = [
      makeNight({
        oximetryTrace: {
          trace: Array.from({ length: 5000 }, (_, i) => ({ t: i, spo2: 95, hr: 70 })),
          durationSeconds: 25200,
          odi3Events: [100, 200],
          odi4Events: [300],
        },
      }),
    ];

    const stripped = stripForShare(nights);
    expect(stripped[0]!.oximetryTrace).toBeNull();
  });

  it('removes ned.breaths from each night', () => {
    const nights = [
      makeNight(),
    ];
    // Simulate runtime breaths array (not in TypeScript interface but present at runtime)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nights[0]!.ned as any).breaths = Array.from({ length: 500 }, () => ({
      inspStart: 0,
      inspEnd: 1,
      qPeak: 30,
    }));

    const stripped = stripForShare(nights);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((stripped[0]!.ned as any).breaths).toEqual([]);
  });

  it('preserves all other NED metrics', () => {
    const nights = [makeNight()];
    const stripped = stripForShare(nights);

    expect(stripped[0]!.ned.nedMean).toBe(15);
    expect(stripped[0]!.ned.estimatedArousalIndex).toBe(8);
    expect(stripped[0]!.ned.combinedFLPct).toBe(35);
    expect(stripped[0]!.glasgow.overall).toBe(3.2);
    expect(stripped[0]!.wat.flScore).toBe(45);
  });

  it('handles multiple nights', () => {
    const nights = [
      makeNight({ dateStr: '2026-03-10' }),
      makeNight({ dateStr: '2026-03-11' }),
      makeNight({ dateStr: '2026-03-12' }),
    ];

    const stripped = stripForShare(nights);
    expect(stripped).toHaveLength(3);
    stripped.forEach((n) => {
      expect(n.oximetryTrace).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((n.ned as any).breaths).toEqual([]);
    });
  });

  it('produces significantly smaller JSON than raw data', () => {
    const nights = [
      makeNight({
        oximetryTrace: {
          trace: Array.from({ length: 10000 }, (_, i) => ({ t: i, spo2: 95, hr: 70 })),
          durationSeconds: 25200,
          odi3Events: Array.from({ length: 50 }, (_, i) => i * 500),
          odi4Events: Array.from({ length: 20 }, (_, i) => i * 1200),
        },
      }),
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nights[0]!.ned as any).breaths = Array.from({ length: 500 }, () => ({
      inspStart: 0, inspEnd: 1, qPeak: 30, qMid: 20, ned: 15, fi: 0.7,
    }));

    const rawSize = JSON.stringify(nights).length;
    const strippedSize = JSON.stringify(stripForShare(nights)).length;

    // Stripped should be at least 80% smaller when trace data is present
    expect(strippedSize).toBeLessThan(rawSize * 0.2);
  });
});
