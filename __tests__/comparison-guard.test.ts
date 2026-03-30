import { describe, it, expect } from 'vitest';
import {
  buildComparisonContext,
  getValidMetrics,
  findSettingsChangeBoundaries,
  type ComparisonContext,

} from '@/lib/comparison-guard';
import { computeFingerprint } from '@/lib/settings-fingerprint';
import { METRIC_REGISTRY, RT_SENSITIVE_METRICS } from '@/lib/metric-registry';
import type { MachineSettings, NightResult } from '@/lib/types';

// ── Helpers ─────────────────────────────────────────────────

function makeSettings(overrides: Partial<MachineSettings> = {}): MachineSettings {
  return {
    deviceModel: 'AirCurve 10 VAuto',
    epap: 10,
    ipap: 16,
    pressureSupport: 6,
    papMode: 'BiPAP ST',
    riseTime: 300,
    trigger: 'Medium',
    cycle: 'Medium',
    easyBreathe: false,
    settingsSource: 'extracted',
    tiMax: 1.5,
    tiMin: 0.5,
    ...overrides,
  };
}

function makeNight(dateStr: string, settingsOverrides: Partial<MachineSettings> = {}): NightResult {
  const s = makeSettings(settingsOverrides);
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: s,
    glasgow: { overall: 1.5, skew: 0.2, spike: 0.1, flatTop: 0.3, topHeavy: 0.2, multiPeak: 0.1, noPause: 0.1, inspirRate: 0.2, multiBreath: 0.1, variableAmp: 0.2 },
    wat: { flScore: 30, regularityScore: 70, periodicityIndex: 15 },
    ned: { breathCount: 4000, nedMean: 18, nedMedian: 15, nedP95: 35, nedClearFLPct: 3, nedBorderlinePct: 8, fiMean: 0.7, fiFL85Pct: 10, tpeakMean: 0.35, mShapePct: 4, reraIndex: 6, reraCount: 45, h1NedMean: 16, h2NedMean: 20, combinedFLPct: 22, estimatedArousalIndex: 10 },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: null,
    settingsFingerprint: computeFingerprint(s),
    csl: null,
    pldSummary: null,
  };
}

/** Create a night with a null settings fingerprint (unavailable settings). */
function makeNightNoFingerprint(dateStr: string): NightResult {
  return {
    ...makeNight(dateStr, { settingsSource: 'unavailable', epap: 0, ipap: 0, pressureSupport: 0 }),
    settingsFingerprint: null,
  };
}

// ── buildComparisonContext ───────────────────────────────────

describe('buildComparisonContext', () => {
  it('detects Rise Time change across nights', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 300 }),
      makeNight('2025-01-13', { riseTime: 400 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(true);
    expect(ctx.settingsChanged.ps).toBe(false);
    expect(ctx.settingsChanged.cycle).toBe(false);
    expect(ctx.settingsChanged.epap).toBe(false);
  });

  it('detects PS change across nights', () => {
    const nights = [
      makeNight('2025-01-15', { pressureSupport: 6 }),
      makeNight('2025-01-14', { pressureSupport: 8 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.ps).toBe(true);
    expect(ctx.settingsChanged.riseTime).toBe(false);
  });

  it('detects EPAP change across nights', () => {
    const nights = [
      makeNight('2025-01-15', { epap: 10 }),
      makeNight('2025-01-14', { epap: 12 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.epap).toBe(true);
  });

  it('detects cycle change across nights', () => {
    const nights = [
      makeNight('2025-01-15', { cycle: 'Medium' }),
      makeNight('2025-01-14', { cycle: 'High' }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.cycle).toBe(true);
  });

  it('detects multiple simultaneous changes', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300, pressureSupport: 6, epap: 10 }),
      makeNight('2025-01-14', { riseTime: 400, pressureSupport: 8, epap: 12 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(true);
    expect(ctx.settingsChanged.ps).toBe(true);
    expect(ctx.settingsChanged.epap).toBe(true);
  });

  it('reports no changes for identical settings', () => {
    const nights = [
      makeNight('2025-01-15'),
      makeNight('2025-01-14'),
      makeNight('2025-01-13'),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(false);
    expect(ctx.settingsChanged.ps).toBe(false);
    expect(ctx.settingsChanged.cycle).toBe(false);
    expect(ctx.settingsChanged.epap).toBe(false);
  });

  it('handles a single night with no comparisons possible', () => {
    const ctx = buildComparisonContext([makeNight('2025-01-15')]);
    expect(ctx.settingsChanged.riseTime).toBe(false);
    expect(ctx.settingsChanged.ps).toBe(false);
    expect(ctx.nights).toHaveLength(1);
  });

  it('handles empty nights array', () => {
    const ctx = buildComparisonContext([]);
    expect(ctx.settingsChanged.riseTime).toBe(false);
    expect(ctx.nights).toHaveLength(0);
  });

  it('handles null fingerprints gracefully (unavailable settings)', () => {
    const nights = [
      makeNightNoFingerprint('2025-01-15'),
      makeNight('2025-01-14'),
    ];
    const ctx = buildComparisonContext(nights);
    // null fingerprints should not trigger changes
    expect(ctx.settingsChanged.riseTime).toBe(false);
    expect(ctx.settingsChanged.ps).toBe(false);
  });

  it('handles all null fingerprints', () => {
    const nights = [
      makeNightNoFingerprint('2025-01-15'),
      makeNightNoFingerprint('2025-01-14'),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(false);
    expect(ctx.settingsChanged.ps).toBe(false);
  });

  it('detects change only at the boundary where it occurs', () => {
    // Nights: 300, 300, 300, 400 -- change only between index 2 and 3
    const nights = [
      makeNight('2025-01-18', { riseTime: 300 }),
      makeNight('2025-01-17', { riseTime: 300 }),
      makeNight('2025-01-16', { riseTime: 300 }),
      makeNight('2025-01-15', { riseTime: 400 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(true);
  });

  it('preserves nights reference in context', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    expect(ctx.nights).toBe(nights);
    expect(ctx.nights).toHaveLength(2);
  });
});

// ── getValidMetrics ─────────────────────────────────────────

describe('getValidMetrics', () => {
  it('invalidates NED-derived metrics when Rise Time changed', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 400 }),
    ];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    // RT-sensitive metrics should be invalid
    for (const metricId of RT_SENSITIVE_METRICS) {
      expect(result.invalid).toContain(metricId);
    }

    // Oximetry metrics should remain valid
    expect(result.valid).toContain('hrc10');
    expect(result.valid).toContain('odi3');
    expect(result.valid).toContain('tBelow94');
    expect(result.valid).toContain('spo2Mean');
  });

  it('marks NED metrics as cautious (uncertain) when PS changed', () => {
    const nights = [
      makeNight('2025-01-15', { pressureSupport: 6 }),
      makeNight('2025-01-14', { pressureSupport: 8 }),
    ];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    // NED metrics with crossPS 'uncertain' should be cautious
    const nedUncertain = Object.entries(METRIC_REGISTRY)
      .filter(([, m]) => m.crossPS === 'uncertain' && m.tier !== 4 && !RT_SENSITIVE_METRICS.has(m.id))
      .map(([id]) => id);

    for (const id of nedUncertain) {
      expect(result.cautious).toContain(id);
    }

    // Oximetry metrics with crossPS 'valid' should remain valid
    expect(result.valid).toContain('hrc10');
    expect(result.valid).toContain('odi3');
  });

  it('always excludes Tier 4 metrics', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    expect(result.invalid).toContain('ouraStaging');
    expect(result.invalid).toContain('ouraBdi');
    expect(result.valid).not.toContain('ouraStaging');
    expect(result.cautious).not.toContain('ouraStaging');
  });

  it('always marks Tier 3 metrics as cautious (no settings change)', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    expect(result.cautious).toContain('glasgowOverall');
    expect(result.cautious).toContain('watFLScore');
    expect(result.cautious).toContain('watRegularity');
    expect(result.cautious).toContain('tpeakTi');
    expect(result.cautious).toContain('mShapePct');
  });

  it('keeps all Tier 1 and 2 metrics valid when no settings changed', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    // Tier 1 oximetry should all be valid
    expect(result.valid).toContain('hrc10');
    expect(result.valid).toContain('hrc15');
    expect(result.valid).toContain('odi3');
    expect(result.valid).toContain('odi4');
    expect(result.valid).toContain('coupled3_10');

    // Tier 2 NED should all be valid (not cautious or invalid)
    expect(result.valid).toContain('nedMean');
    expect(result.valid).toContain('fiMean');
    expect(result.valid).toContain('reraIndex');
  });

  it('every metric in registry appears in exactly one category', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    const allIds = [...result.valid, ...result.cautious, ...result.invalid];
    const registryIds = Object.keys(METRIC_REGISTRY);

    // Every metric should be categorized
    for (const id of registryIds) {
      expect(allIds).toContain(id);
    }

    // No duplicates across categories
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('RT change takes priority over PS change for RT-sensitive metrics', () => {
    // When both RT and PS changed, RT-sensitive metrics should be invalid (not cautious)
    const nights = [
      makeNight('2025-01-15', { riseTime: 300, pressureSupport: 6 }),
      makeNight('2025-01-14', { riseTime: 400, pressureSupport: 8 }),
    ];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);

    expect(result.invalid).toContain('nedMean');
    expect(result.invalid).toContain('reraIndex');
    expect(result.cautious).not.toContain('nedMean');
  });

  it('handles context with no settings changes at all', () => {
    const ctx: ComparisonContext = {
      nights: [makeNight('2025-01-15')],
      settingsChanged: { riseTime: false, ps: false, cycle: false, epap: false },
    };
    const result = getValidMetrics(ctx);

    // Tier 1/2 should be valid, Tier 3 cautious, Tier 4 invalid
    expect(result.valid.length).toBeGreaterThan(0);
    expect(result.invalid).toContain('ouraStaging');
  });
});

// ── findSettingsChangeBoundaries ─────────────────────────────

describe('findSettingsChangeBoundaries', () => {
  it('finds boundary at Rise Time change point', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 300 }),
      makeNight('2025-01-13', { riseTime: 400 }),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.index).toBe(2);
    expect(boundaries[0]!.label).toContain('RT');
  });

  it('finds boundary at PS change point', () => {
    const nights = [
      makeNight('2025-01-15', { pressureSupport: 6 }),
      makeNight('2025-01-14', { pressureSupport: 8 }),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.index).toBe(1);
    expect(boundaries[0]!.label).toContain('PS');
  });

  it('finds boundary at EPAP change point', () => {
    const nights = [
      makeNight('2025-01-15', { epap: 10 }),
      makeNight('2025-01-14', { epap: 12 }),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.label).toContain('EPAP');
  });

  it('finds multiple boundaries for multiple changes', () => {
    const nights = [
      makeNight('2025-01-18', { riseTime: 300 }),
      makeNight('2025-01-17', { riseTime: 400 }),  // boundary here
      makeNight('2025-01-16', { riseTime: 400 }),
      makeNight('2025-01-15', { riseTime: 500 }),  // boundary here
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]!.index).toBe(1);
    expect(boundaries[1]!.index).toBe(3);
  });

  it('returns empty for identical settings', () => {
    const nights = [
      makeNight('2025-01-15'),
      makeNight('2025-01-14'),
      makeNight('2025-01-13'),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(0);
  });

  it('returns empty for single night', () => {
    const boundaries = findSettingsChangeBoundaries([makeNight('2025-01-15')]);
    expect(boundaries).toHaveLength(0);
  });

  it('returns empty for empty array', () => {
    const boundaries = findSettingsChangeBoundaries([]);
    expect(boundaries).toHaveLength(0);
  });

  it('handles null fingerprints without reporting false boundaries', () => {
    const nights = [
      makeNightNoFingerprint('2025-01-15'),
      makeNight('2025-01-14'),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    // null -> non-null should not be a change boundary (detectSettingsChanges returns false for null)
    expect(boundaries).toHaveLength(0);
  });

  it('label includes all changed settings', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300, pressureSupport: 6 }),
      makeNight('2025-01-14', { riseTime: 400, pressureSupport: 8 }),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]!.label).toContain('RT');
    expect(boundaries[0]!.label).toContain('PS');
  });

  it('label includes transition values', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 400 }),
    ];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries[0]!.label).toContain('300');
    expect(boundaries[0]!.label).toContain('400');
  });
});
