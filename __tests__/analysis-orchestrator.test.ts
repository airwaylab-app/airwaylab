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
    crossDevice: null, machineSummary: null, settingsFingerprint: null, csl: null, pldSummary: null,
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

  it('handles large number of nights correctly', () => {
    const cached: NightResult[] = [];
    const fresh: NightResult[] = [];
    // Generate 30 cached nights and 30 fresh nights with 15 overlapping
    for (let i = 1; i <= 30; i++) {
      const day = String(i).padStart(2, '0');
      cached.push(makeNight(`2026-01-${day}`, { durationHours: 8.0 }));
    }
    for (let i = 16; i <= 45; i++) {
      const month = i <= 31 ? '01' : '02';
      const day = i <= 31 ? String(i).padStart(2, '0') : String(i - 31).padStart(2, '0');
      fresh.push(makeNight(`2026-${month}-${day}`, { durationHours: 6.0 }));
    }

    const result = mergeNights(cached, fresh);
    // 30 cached + 15 fresh-only = 45 total
    expect(result).toHaveLength(45);
    // Most recent first
    expect(result[0]!.dateStr).toBe('2026-02-14');
    // Cached wins on overlap (Jan 16-30)
    const jan20 = result.find((n) => n.dateStr === '2026-01-20');
    expect(jan20!.durationHours).toBe(8.0);
    // Fresh-only keeps fresh values
    const feb05 = result.find((n) => n.dateStr === '2026-02-05');
    expect(feb05!.durationHours).toBe(6.0);
  });

  it('does not bleed fresh oximetryTrace when cached already has oximetry', () => {
    const cachedOx = makeOximetry();
    cachedOx.spo2Mean = 96;
    const freshOx = makeOximetry();
    freshOx.spo2Mean = 91;
    const freshTrace = makeOximetryTrace();

    const cached = [makeNight('2026-03-10', { oximetry: cachedOx, oximetryTrace: null })];
    const fresh = [makeNight('2026-03-10', { oximetry: freshOx, oximetryTrace: freshTrace })];

    const result = mergeNights(cached, fresh);
    expect(result).toHaveLength(1);
    // Cached has oximetry, so cached wins entirely -- no fresh trace bleed
    expect(result[0]!.oximetry!.spo2Mean).toBe(96);
    expect(result[0]!.oximetryTrace).toBeNull();
  });

  it('preserves fresh oximetryTrace along with oximetry when cached has neither', () => {
    const freshOx = makeOximetry();
    const freshTrace = makeOximetryTrace();

    const cached = [makeNight('2026-03-10', { oximetry: null, oximetryTrace: null })];
    const fresh = [makeNight('2026-03-10', { oximetry: freshOx, oximetryTrace: freshTrace })];

    const result = mergeNights(cached, fresh);
    expect(result).toHaveLength(1);
    expect(result[0]!.oximetry).toBe(freshOx);
    expect(result[0]!.oximetryTrace).toBe(freshTrace);
  });

  it('handles duplicate dates in the same input array', () => {
    const fresh = [
      makeNight('2026-03-10', { durationHours: 6.0 }),
      makeNight('2026-03-10', { durationHours: 7.0 }),
    ];
    const result = mergeNights([], fresh);
    // Last fresh entry for same date wins (Map.set overwrites)
    expect(result).toHaveLength(1);
    expect(result[0]!.durationHours).toBe(7.0);
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

  it('returns correct date with exactly 2 nights and a change', () => {
    const nights = [
      makeNight('2026-03-12', { settings: makeSettings({ epap: 8 }) }),
      makeNight('2026-03-11', { settings: makeSettings({ epap: 6 }) }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('returns correct date with exactly 2 nights and no change', () => {
    const nights = [
      makeNight('2026-03-12', { settings: makeSettings({ epap: 6 }) }),
      makeNight('2026-03-11', { settings: makeSettings({ epap: 6 }) }),
    ];
    expect(detectTherapyChange(nights)).toBeNull();
  });

  it('detects change only at the last pair of nights', () => {
    const nights = [
      makeNight('2026-03-15', { settings: makeSettings({ epap: 6 }) }),
      makeNight('2026-03-14', { settings: makeSettings({ epap: 6 }) }),
      makeNight('2026-03-13', { settings: makeSettings({ epap: 6 }) }),
      makeNight('2026-03-12', { settings: makeSettings({ epap: 6 }) }),
      makeNight('2026-03-11', { settings: makeSettings({ epap: 4 }) }),
    ];
    // Only change is between 03-12 (epap=6) and 03-11 (epap=4)
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('detects simultaneous changes in multiple fields', () => {
    const nights = [
      makeNight('2026-03-12', {
        settings: makeSettings({ epap: 8, ipap: 16, papMode: 'ASV' }),
      }),
      makeNight('2026-03-11', {
        settings: makeSettings({ epap: 6, ipap: 14, papMode: 'VAuto' }),
      }),
    ];
    expect(detectTherapyChange(nights)).toBe('2026-03-12');
  });

  it('ignores easyBreathe and cycle changes', () => {
    const nights = [
      makeNight('2026-03-12', {
        settings: makeSettings({ easyBreathe: true, cycle: 'High' }),
      }),
      makeNight('2026-03-11', {
        settings: makeSettings({ easyBreathe: false, cycle: 'Medium' }),
      }),
    ];
    expect(detectTherapyChange(nights)).toBeNull();
  });

  it('ignores deviceModel change alone', () => {
    const nights = [
      makeNight('2026-03-12', {
        settings: makeSettings({ deviceModel: 'AirSense 11' }),
      }),
      makeNight('2026-03-11', {
        settings: makeSettings({ deviceModel: 'AirCurve 10 VAuto' }),
      }),
    ];
    expect(detectTherapyChange(nights)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectFilesToProcess — regression for AIR-963
//
// The orchestrator selects which files to send to the worker based on:
//   1. Manifest diff: which nights are unchanged (same file fingerprints)
//   2. Cache: which of those unchanged nights have persisted results
//
// BUG: When the manifest existed but the cache was cleared (e.g. after an
// engine version bump clears STORAGE_KEY while MANIFEST_KEY survives), the
// original code set filesToProcess = diff.changedFiles, silently dropping
// the "unchanged-but-uncached" nights. On merge those dates had no cache
// entry either, so only the few newly-changed nights appeared in the UI.
//
// FIX: "unchanged in manifest + absent from cache" → must be re-processed.
// ---------------------------------------------------------------------------

// Mirror the filesToProcess selection logic from analysis-orchestrator.ts
// (manifest branch only — the fallback branch is simpler and unaffected).
function selectFilesToProcess(opts: {
  sdFiles: { path: string }[];
  manifestUnchanged: string[];  // dates the manifest says are unchanged
  manifestChangedNights: Set<string>;  // dates the manifest says are changed
  cachedDateSet: Set<string>;  // dates available in localStorage cache
  extractDate: (path: string) => string | null;
}): { path: string }[] {
  const { sdFiles, manifestUnchanged, manifestChangedNights, cachedDateSet, extractDate } = opts;

  const unchangedDates = manifestUnchanged.filter((d) => cachedDateSet.has(d));
  const uncachedUnchanged = new Set(manifestUnchanged.filter((d) => !cachedDateSet.has(d)));

  // All unchanged AND cached — nothing needs processing
  if (unchangedDates.length > 0 && manifestChangedNights.size === 0 && uncachedUnchanged.size === 0) {
    return [];
  }

  if (manifestChangedNights.size > 0 || uncachedUnchanged.size > 0) {
    const datesNeedingProcessing = new Set([...manifestChangedNights, ...uncachedUnchanged]);
    return sdFiles.filter(({ path }) => {
      const date = extractDate(path);
      return date === null || datesNeedingProcessing.has(date);
    });
  }

  return sdFiles;
}

// Simple date extractor for DATALOG/YYYYMMDD/ paths used in tests.
function extractDate(path: string): string | null {
  const m = /(\d{8})\//.exec(path);
  if (!m) return null;
  const raw = m[1]!;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function makeFiles(dates: string[]): { path: string }[] {
  return dates.map((d) => ({ path: `DATALOG/${d.replace(/-/g, '')}/STD.edf` }));
}

describe('selectFilesToProcess — manifest + cache interaction (AIR-963 regression)', () => {
  it('returns empty when all nights are unchanged AND cached (instant restore path)', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03'];
    const files = makeFiles(dates);
    const result = selectFilesToProcess({
      sdFiles: files,
      manifestUnchanged: dates,
      manifestChangedNights: new Set(),
      cachedDateSet: new Set(dates),
      extractDate,
    });
    expect(result).toHaveLength(0);
  });

  it('returns only changed files when unchanged nights are fully cached', () => {
    const historicDates = ['2026-01-01', '2026-01-02', '2026-01-03'];
    const newDates = ['2026-01-04', '2026-01-05'];
    const allFiles = makeFiles([...historicDates, ...newDates]);
    const result = selectFilesToProcess({
      sdFiles: allFiles,
      manifestUnchanged: historicDates,
      manifestChangedNights: new Set(newDates),
      cachedDateSet: new Set(historicDates),
      extractDate,
    });
    const resultPaths = result.map((f) => f.path);
    expect(result).toHaveLength(newDates.length);
    for (const d of newDates) {
      expect(resultPaths.some((p) => p.includes(d.replace(/-/g, '')))).toBe(true);
    }
    for (const d of historicDates) {
      expect(resultPaths.some((p) => p.includes(d.replace(/-/g, '')))).toBe(false);
    }
  });

  it('re-processes unchanged nights when cache is empty (AIR-963 root cause)', () => {
    // Scenario: 30 historical nights are unchanged per manifest, 3 are new.
    // Cache is empty (e.g. engine version bump cleared STORAGE_KEY but
    // MANIFEST_KEY survived). Before the fix, only the 3 new nights were
    // returned, hiding all historical data. After the fix, all 33 dates
    // must be included.
    const historicDates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      return d.toISOString().slice(0, 10);
    });
    const newDates = ['2026-01-31', '2026-02-01', '2026-02-02'];
    const allFiles = makeFiles([...historicDates, ...newDates]);
    const result = selectFilesToProcess({
      sdFiles: allFiles,
      manifestUnchanged: historicDates,
      manifestChangedNights: new Set(newDates),
      cachedDateSet: new Set(), // empty — cache was cleared
      extractDate,
    });
    // All 33 nights must be processed since there is nothing in cache
    expect(result).toHaveLength(historicDates.length + newDates.length);
  });

  it('re-processes ALL nights when cache is empty and no new nights (full cache miss)', () => {
    // Edge case: all nights match manifest fingerprints (no SD card changes),
    // but cache is completely empty. All nights should be re-processed.
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03'];
    const files = makeFiles(dates);
    const result = selectFilesToProcess({
      sdFiles: files,
      manifestUnchanged: dates,
      manifestChangedNights: new Set(),
      cachedDateSet: new Set(), // empty cache
      extractDate,
    });
    expect(result).toHaveLength(dates.length);
  });

  it('always includes non-date files (STR.edf etc.) when any night is processed', () => {
    const historicDates = ['2026-01-01', '2026-01-02'];
    const newDates = ['2026-01-03'];
    const dateFiles = makeFiles([...historicDates, ...newDates]);
    const nonDateFiles = [{ path: 'STR.edf' }, { path: 'Identification.tgt' }];
    const allFiles = [...dateFiles, ...nonDateFiles];
    const result = selectFilesToProcess({
      sdFiles: allFiles,
      manifestUnchanged: historicDates,
      manifestChangedNights: new Set(newDates),
      cachedDateSet: new Set(historicDates),
      extractDate,
    });
    // Non-date files should be included (date returns null → always included)
    const nonDateResults = result.filter(({ path }) => extractDate(path) === null);
    expect(nonDateResults).toHaveLength(nonDateFiles.length);
  });
});
