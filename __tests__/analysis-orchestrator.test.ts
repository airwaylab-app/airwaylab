import { describe, it, expect } from 'vitest';
import type {
  NightResult,
  MachineSettings,
  GlasgowComponents,
  WATResults,
  NEDResults,
  OximetryResults,
  OximetryTraceData,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Private function copies (not exported from analysis-orchestrator.ts)
// These are pure functions with no side effects, duplicated here for testing.
// If the source logic changes, these copies must be updated to match.
// ---------------------------------------------------------------------------

function mergeNights(
  cached: NightResult[],
  fresh: NightResult[]
): NightResult[] {
  const map = new Map<string, NightResult>();

  // Add fresh first
  for (const n of fresh) map.set(n.dateStr, n);

  // Cached overwrites fresh (cached wins), but preserve fresh oximetry
  // if cached is missing it (fills empty data)
  for (const n of cached) {
    const freshVersion = map.get(n.dateStr);
    if (freshVersion && !n.oximetry && freshVersion.oximetry) {
      map.set(n.dateStr, {
        ...n,
        oximetry: freshVersion.oximetry,
        oximetryTrace: freshVersion.oximetryTrace,
      });
    } else {
      map.set(n.dateStr, n);
    }
  }

  const merged = Array.from(map.values());
  // Sort most-recent-first
  merged.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return merged;
}

function detectTherapyChange(nights: NightResult[]): string | null {
  if (nights.length < 2) return null;

  // Nights are sorted most-recent-first
  for (let i = 0; i < nights.length - 1; i++) {
    const curr = nights[i]!.settings;
    const prev = nights[i + 1]!.settings;

    if (
      curr.epap !== prev.epap ||
      curr.ipap !== prev.ipap ||
      curr.papMode !== prev.papMode ||
      curr.pressureSupport !== prev.pressureSupport
    ) {
      return nights[i]!.dateStr;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers to create minimal NightResult objects
// ---------------------------------------------------------------------------

function makeSettings(overrides: Partial<MachineSettings> = {}): MachineSettings {
  return {
    deviceModel: 'AirCurve 10 VAuto',
    epap: 6,
    ipap: 14,
    pressureSupport: 8,
    papMode: 'VAuto',
    riseTime: 2,
    trigger: 'Medium',
    cycle: 'Medium',
    easyBreathe: false,
    settingsSource: 'extracted',
    ...overrides,
  };
}

function makeGlasgow(): GlasgowComponents {
  return {
    overall: 3.5,
    skew: 0.4,
    spike: 0.3,
    flatTop: 0.5,
    topHeavy: 0.2,
    multiPeak: 0.3,
    noPause: 0.6,
    inspirRate: 0.4,
    multiBreath: 0.3,
    variableAmp: 0.5,
  };
}

function makeWAT(): WATResults {
  return { flScore: 45, regularityScore: 0.12, periodicityIndex: 0.05 };
}

function makeNED(): NEDResults {
  return {
    breathCount: 3500,
    nedMean: 22,
    nedMedian: 18,
    nedP95: 55,
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

function makeOximetry(): OximetryResults {
  return {
    odi3: 8.2,
    odi4: 3.1,
    tBelow90: 2.5,
    tBelow94: 12.0,
    hrClin8: 15,
    hrClin10: 10,
    hrClin12: 6,
    hrClin15: 2,
    hrMean10: 8,
    hrMean15: 3,
    coupled3_6: 5,
    coupled3_10: 3,
    coupledHRRatio: 0.6,
    spo2Mean: 94.5,
    spo2Min: 88,
    hrMean: 62,
    hrSD: 5.2,
    h1: { hrClin10: 11, odi3: 9.0, tBelow94: 13 },
    h2: { hrClin10: 9, odi3: 7.5, tBelow94: 11 },
    totalSamples: 28800,
    retainedSamples: 27000,
    doubleTrackingCorrected: 50,
  };
}

function makeOximetryTrace(): OximetryTraceData {
  return {
    trace: [{ t: 0, spo2: 95, hr: 62 }],
    durationSeconds: 28800,
    odi3Events: [100, 500],
    odi4Events: [300],
  };
}

function makeNight(
  dateStr: string,
  overrides: Partial<NightResult> = {}
): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7.5,
    sessionCount: 1,
    settings: makeSettings(),
    glasgow: makeGlasgow(),
    wat: makeWAT(),
    ned: makeNED(),
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mergeNights', () => {
  it('returns fresh results sorted most-recent-first when no cached', () => {
    const fresh = [
      makeNight('2026-03-10'),
      makeNight('2026-03-12'),
      makeNight('2026-03-11'),
    ];
    const result = mergeNights([], fresh);

    expect(result).toHaveLength(3);
    expect(result[0]!.dateStr).toBe('2026-03-12');
    expect(result[1]!.dateStr).toBe('2026-03-11');
    expect(result[2]!.dateStr).toBe('2026-03-10');
  });

  it('returns cached results sorted most-recent-first when no fresh', () => {
    const cached = [
      makeNight('2026-03-08'),
      makeNight('2026-03-10'),
      makeNight('2026-03-09'),
    ];
    const result = mergeNights(cached, []);

    expect(result).toHaveLength(3);
    expect(result[0]!.dateStr).toBe('2026-03-10');
    expect(result[1]!.dateStr).toBe('2026-03-09');
    expect(result[2]!.dateStr).toBe('2026-03-08');
  });

  it('cached overwrites fresh for same date', () => {
    const fresh = [makeNight('2026-03-10', { durationHours: 6.0 })];
    const cached = [makeNight('2026-03-10', { durationHours: 8.0 })];

    const result = mergeNights(cached, fresh);

    expect(result).toHaveLength(1);
    expect(result[0]!.durationHours).toBe(8.0);
  });

  it('preserves fresh oximetry when cached has none', () => {
    const oximetry = makeOximetry();
    const oximetryTrace = makeOximetryTrace();

    const fresh = [
      makeNight('2026-03-10', { oximetry, oximetryTrace, durationHours: 6.0 }),
    ];
    const cached = [
      makeNight('2026-03-10', {
        oximetry: null,
        oximetryTrace: null,
        durationHours: 8.0,
      }),
    ];

    const result = mergeNights(cached, fresh);

    expect(result).toHaveLength(1);
    // Cached base data wins (durationHours)
    expect(result[0]!.durationHours).toBe(8.0);
    // But fresh oximetry is preserved
    expect(result[0]!.oximetry).toBe(oximetry);
    expect(result[0]!.oximetryTrace).toBe(oximetryTrace);
  });

  it('does NOT preserve fresh oximetry when cached already has oximetry', () => {
    const freshOximetry = makeOximetry();
    const cachedOximetry = makeOximetry();
    cachedOximetry.odi3 = 99; // distinctive value

    const fresh = [
      makeNight('2026-03-10', { oximetry: freshOximetry }),
    ];
    const cached = [
      makeNight('2026-03-10', { oximetry: cachedOximetry }),
    ];

    const result = mergeNights(cached, fresh);

    expect(result).toHaveLength(1);
    // Cached oximetry wins entirely
    expect(result[0]!.oximetry!.odi3).toBe(99);
  });

  it('merges mixed dates correctly: some only cached, some only fresh, some overlap', () => {
    const fresh = [
      makeNight('2026-03-10', { durationHours: 6.0 }),
      makeNight('2026-03-11', { durationHours: 7.0 }), // only in fresh
    ];
    const cached = [
      makeNight('2026-03-10', { durationHours: 8.0 }), // overlap -- cached wins
      makeNight('2026-03-09', { durationHours: 9.0 }), // only in cached
    ];

    const result = mergeNights(cached, fresh);

    expect(result).toHaveLength(3);
    // Sorted most-recent-first
    expect(result[0]!.dateStr).toBe('2026-03-11');
    expect(result[0]!.durationHours).toBe(7.0); // fresh-only
    expect(result[1]!.dateStr).toBe('2026-03-10');
    expect(result[1]!.durationHours).toBe(8.0); // cached wins
    expect(result[2]!.dateStr).toBe('2026-03-09');
    expect(result[2]!.durationHours).toBe(9.0); // cached-only
  });

  it('returns empty array when both inputs are empty', () => {
    const result = mergeNights([], []);
    expect(result).toEqual([]);
  });

  it('handles one empty array with results in the other', () => {
    const night = makeNight('2026-03-10');

    const freshOnly = mergeNights([], [night]);
    expect(freshOnly).toHaveLength(1);
    expect(freshOnly[0]!.dateStr).toBe('2026-03-10');

    const cachedOnly = mergeNights([night], []);
    expect(cachedOnly).toHaveLength(1);
    expect(cachedOnly[0]!.dateStr).toBe('2026-03-10');
  });
});

describe('detectTherapyChange', () => {
  it('returns null for fewer than 2 nights', () => {
    expect(detectTherapyChange([])).toBeNull();
    expect(detectTherapyChange([makeNight('2026-03-10')])).toBeNull();
  });

  it('returns null when no settings change between nights', () => {
    const nights = [
      makeNight('2026-03-12'),
      makeNight('2026-03-11'),
      makeNight('2026-03-10'),
    ];
    expect(detectTherapyChange(nights)).toBeNull();
  });

  it('detects EPAP change', () => {
    const nights = [
      makeNight('2026-03-12', { settings: makeSettings({ epap: 7 }) }),
      makeNight('2026-03-11', { settings: makeSettings({ epap: 6 }) }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('detects IPAP change', () => {
    const nights = [
      makeNight('2026-03-12', { settings: makeSettings({ ipap: 16 }) }),
      makeNight('2026-03-11', { settings: makeSettings({ ipap: 14 }) }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('detects papMode change', () => {
    const nights = [
      makeNight('2026-03-12', { settings: makeSettings({ papMode: 'ASV' }) }),
      makeNight('2026-03-11', { settings: makeSettings({ papMode: 'VAuto' }) }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('detects pressureSupport change', () => {
    const nights = [
      makeNight('2026-03-12', {
        settings: makeSettings({ pressureSupport: 10 }),
      }),
      makeNight('2026-03-11', {
        settings: makeSettings({ pressureSupport: 8 }),
      }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('returns the most recent change date when multiple changes exist', () => {
    // Nights are sorted most-recent-first
    const nights = [
      makeNight('2026-03-14', { settings: makeSettings({ epap: 8 }) }),  // change vs 03-13
      makeNight('2026-03-13', { settings: makeSettings({ epap: 7 }) }),  // change vs 03-12
      makeNight('2026-03-12', { settings: makeSettings({ epap: 6 }) }),  // no change vs 03-11
      makeNight('2026-03-11', { settings: makeSettings({ epap: 6 }) }),
    ];

    // Should return the first (most recent) change found
    expect(detectTherapyChange(nights)).toBe('2026-03-14');
  });

  it('returns null for a single night', () => {
    expect(detectTherapyChange([makeNight('2026-03-10')])).toBeNull();
  });

  it('ignores non-compared settings fields (e.g. riseTime, trigger)', () => {
    const nights = [
      makeNight('2026-03-12', {
        settings: makeSettings({ riseTime: 3, trigger: 'High' }),
      }),
      makeNight('2026-03-11', {
        settings: makeSettings({ riseTime: 2, trigger: 'Medium' }),
      }),
    ];
    // riseTime and trigger are not compared by detectTherapyChange
    expect(detectTherapyChange(nights)).toBeNull();
  });
});
