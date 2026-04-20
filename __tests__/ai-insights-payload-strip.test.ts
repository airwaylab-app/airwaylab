/**
 * Tests for AI insights payload stripping logic (AIR-691).
 *
 * Verifies that:
 * - stripTrendNightForAIPayload returns only the three scalar fields used for
 *   trend context, discarding oximetry/settings/per-breath data that caused 413 errors.
 * - Trend-stripped payloads stay well under the 512KB server limit even with 7 nights
 *   of full oximetry data.
 */
import { describe, it, expect } from 'vitest';
import { stripTrendNightForAIPayload } from '@/lib/ai-insights-client';
import type { NightResult } from '@/lib/types';

function makeNightResult(overrides?: Partial<NightResult>): NightResult {
  return {
    date: new Date('2026-03-12'),
    dateStr: '2026-03-12',
    durationHours: 7.5,
    sessionCount: 1,
    settings: {
      cpapMode: 'APAP',
      minPressure: 6,
      maxPressure: 14,
      epr: 3,
      rampTime: 0,
      settingsSource: 'str_edf',
    } as unknown as NightResult['settings'],
    glasgow: {
      overall: 3.2,
      skew: 0.4,
      spike: 0.2,
      flatTop: 0.6,
      topHeavy: 0.3,
      multiPeak: 0.1,
      noPause: 0.8,
      inspirRate: 0.5,
      multiBreath: 0.2,
      variableAmp: 0.1,
    },
    wat: {
      flScore: 42,
      regularityScore: 1.1,
      periodicityIndex: 0.08,
    },
    ned: {
      breathCount: 420,
      nedMean: 28.5,
      nedMedian: 27.0,
      nedP95: 62.0,
      nedClearFLPct: 40,
      nedBorderlinePct: 25,
      fiMean: 0.82,
      fiFL85Pct: 30,
      tpeakMean: 0.38,
      mShapePct: 12,
      reraIndex: 3.1,
      reraCount: 4,
      h1NedMean: 25.0,
      h2NedMean: 32.0,
      combinedFLPct: 35,
      estimatedArousalIndex: 8.5,
    },
    oximetry: {
      // Simulate a realistic oximetry result with many fields
      odi3: 4.2,
      odi4: 1.8,
      t94Pct: 2.1,
      spO2Mean: 96.2,
      spO2Min: 88,
      spO2Median: 97,
      hrMean: 62,
      hrMin: 48,
      hrMax: 88,
      hrSurgeClinical10Count: 3,
      hrSurgeClinical12Count: 1,
      hrSurgeClinical15Count: 0,
      coupled3Count: 2,
      eventCount: 18,
      h1Odi3: 3.1,
      h2Odi3: 5.3,
    } as unknown as NightResult['oximetry'],
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: { ahi: 2.1, ai: 0.5, hi: 1.0, cai: 0.6 } as unknown as NightResult['machineSummary'],
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
    ...overrides,
  };
}

describe('stripTrendNightForAIPayload', () => {
  it('returns only dateStr, glasgow.overall, ned.nedMean, wat.flScore', () => {
    const night = makeNightResult();
    const stripped = stripTrendNightForAIPayload(night);

    expect(stripped).toEqual({
      dateStr: '2026-03-12',
      glasgow: { overall: 3.2 },
      ned: { nedMean: 28.5 },
      wat: { flScore: 42 },
    });
  });

  it('omits settings, oximetry, machineSummary, and all other fields', () => {
    const night = makeNightResult();
    const stripped = stripTrendNightForAIPayload(night);

    expect(stripped).not.toHaveProperty('settings');
    expect(stripped).not.toHaveProperty('oximetry');
    expect(stripped).not.toHaveProperty('machineSummary');
    expect(stripped).not.toHaveProperty('sessionCount');
    expect(stripped).not.toHaveProperty('durationHours');
    expect(stripped).not.toHaveProperty('oximetryTrace');
  });

  it('preserves correct scalar values', () => {
    const night = makeNightResult({
      dateStr: '2026-01-05',
      glasgow: { overall: 5.7 } as NightResult['glasgow'],
      ned: { nedMean: 55.1 } as NightResult['ned'],
      wat: { flScore: 78 } as NightResult['wat'],
    });
    const stripped = stripTrendNightForAIPayload(night);

    expect(stripped.dateStr).toBe('2026-01-05');
    expect((stripped.glasgow as Record<string, unknown>).overall).toBe(5.7);
    expect((stripped.ned as Record<string, unknown>).nedMean).toBe(55.1);
    expect((stripped.wat as Record<string, unknown>).flScore).toBe(78);
  });

  it('produces a tiny JSON footprint vs full-stripped night', () => {
    const night = makeNightResult();
    const trendStripped = stripTrendNightForAIPayload(night);
    const trendJson = JSON.stringify(trendStripped);

    // Trend-stripped should be very small (< 200 bytes for scalar-only)
    expect(trendJson.length).toBeLessThan(200);
  });

  it('7 trend nights stay well under the 512KB server payload limit', () => {
    // Simulate a realistic scenario: user with 7 nights of full oximetry data
    // Each night has ~16 oximetry metrics + full glasgow/wat/ned structs
    const nights = Array.from({ length: 7 }, (_, i) =>
      makeNightResult({ dateStr: `2026-03-${String(i + 1).padStart(2, '0')}` })
    );

    const stripped = nights.map(stripTrendNightForAIPayload);
    const totalJson = JSON.stringify(stripped);

    // 7 trend nights should be well under 10KB (vs potentially hundreds of KB unstripped)
    expect(totalJson.length).toBeLessThan(10_000);
  });

  it('glasgow object only includes overall — not the other 9 components', () => {
    const night = makeNightResult();
    const stripped = stripTrendNightForAIPayload(night);
    const glasgowKeys = Object.keys(stripped.glasgow as Record<string, unknown>);

    expect(glasgowKeys).toEqual(['overall']);
  });
});
