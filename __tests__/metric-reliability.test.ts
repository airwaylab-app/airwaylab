import { describe, it, expect } from 'vitest';
import { METRIC_REGISTRY, getMetricsByTier, isValidCrossRT, RT_SENSITIVE_METRICS } from '@/lib/metric-registry';
import { computeFingerprint, detectSettingsChanges } from '@/lib/settings-fingerprint';
import { buildComparisonContext, getValidMetrics, findSettingsChangeBoundaries } from '@/lib/comparison-guard';
import type { MachineSettings, NightResult } from '@/lib/types';

// ── Metric Registry ──

describe('METRIC_REGISTRY', () => {
  it('contains expected tier 1 oximetry metrics', () => {
    expect(METRIC_REGISTRY.hrc10).toBeDefined();
    expect(METRIC_REGISTRY.hrc10!.tier).toBe(1);
    expect(METRIC_REGISTRY.odi3!.tier).toBe(1);
    expect(METRIC_REGISTRY.tBelow94!.tier).toBe(1);
  });

  it('contains tier 1-asym machine AHI', () => {
    expect(METRIC_REGISTRY.machineAhi).toBeDefined();
    expect(METRIC_REGISTRY.machineAhi!.tier).toBe('1-asym');
    expect(METRIC_REGISTRY.machineAhi!.direction).toBe('alarm-only');
  });

  it('marks NED metrics as crossRT invalid', () => {
    expect(METRIC_REGISTRY.nedMean!.crossRT).toBe('invalid');
    expect(METRIC_REGISTRY.nedBorderlinePct!.crossRT).toBe('invalid');
    expect(METRIC_REGISTRY.reraIndex!.crossRT).toBe('invalid');
  });

  it('marks oximetry as crossRT valid', () => {
    expect(METRIC_REGISTRY.hrc10!.crossRT).toBe('valid');
    expect(METRIC_REGISTRY.odi3!.crossRT).toBe('valid');
  });

  it('getMetricsByTier returns correct counts', () => {
    const tier1 = getMetricsByTier(1);
    expect(tier1.length).toBeGreaterThanOrEqual(7);
    const tier3 = getMetricsByTier(3);
    expect(tier3.length).toBeGreaterThanOrEqual(5);
  });

  it('isValidCrossRT returns false for NED metrics', () => {
    expect(isValidCrossRT('nedMean')).toBe(false);
    expect(isValidCrossRT('reraIndex')).toBe(false);
  });

  it('isValidCrossRT returns true for oximetry metrics', () => {
    expect(isValidCrossRT('hrc10')).toBe(true);
    expect(isValidCrossRT('odi3')).toBe(true);
  });

  it('RT_SENSITIVE_METRICS contains NED-derived metrics', () => {
    expect(RT_SENSITIVE_METRICS.has('nedMean')).toBe(true);
    expect(RT_SENSITIVE_METRICS.has('nedClearFLPct')).toBe(true);
    expect(RT_SENSITIVE_METRICS.has('hrc10')).toBe(false);
  });
});

// ── Settings Fingerprint ──

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

describe('computeFingerprint', () => {
  it('produces a stable hash from settings', () => {
    const fp = computeFingerprint(makeSettings());
    expect(fp).not.toBeNull();
    expect(fp!.hash).toBe('E10-PS6-CyMedium-RT300-TrMedium-TiMax1.5');
    expect(fp!.epap).toBe(10);
    expect(fp!.ps).toBe(6);
  });

  it('returns null for unavailable settings', () => {
    const fp = computeFingerprint(makeSettings({ settingsSource: 'unavailable', epap: 0, ipap: 0, pressureSupport: 0 }));
    expect(fp).toBeNull();
  });

  it('produces different hashes for different RT', () => {
    const fp1 = computeFingerprint(makeSettings({ riseTime: 300 }));
    const fp2 = computeFingerprint(makeSettings({ riseTime: 400 }));
    expect(fp1!.hash).not.toBe(fp2!.hash);
  });
});

describe('detectSettingsChanges', () => {
  it('detects RT change', () => {
    const a = computeFingerprint(makeSettings({ riseTime: 300 }));
    const b = computeFingerprint(makeSettings({ riseTime: 400 }));
    const result = detectSettingsChanges(a, b);
    expect(result.changed).toBe(true);
    expect(result.riseTime).toBe(true);
    expect(result.ps).toBe(false);
    expect(result.label).toContain('RT');
  });

  it('detects no change for identical settings', () => {
    const a = computeFingerprint(makeSettings());
    const b = computeFingerprint(makeSettings());
    const result = detectSettingsChanges(a, b);
    expect(result.changed).toBe(false);
  });

  it('handles null fingerprints', () => {
    const result = detectSettingsChanges(null, null);
    expect(result.changed).toBe(false);
  });
});

// ── Comparison Guard ──

function makeNight(dateStr: string, settings: Partial<MachineSettings> = {}): NightResult {
  const s = makeSettings(settings);
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

describe('buildComparisonContext', () => {
  it('detects RT change across nights', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 300 }),
      makeNight('2025-01-13', { riseTime: 400 }),
    ];
    const ctx = buildComparisonContext(nights);
    expect(ctx.settingsChanged.riseTime).toBe(true);
    expect(ctx.settingsChanged.epap).toBe(false);
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
  });
});

describe('getValidMetrics', () => {
  it('invalidates NED metrics when RT changed', () => {
    const nights = [
      makeNight('2025-01-15', { riseTime: 300 }),
      makeNight('2025-01-14', { riseTime: 400 }),
    ];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);
    expect(result.invalid).toContain('nedMean');
    expect(result.invalid).toContain('reraIndex');
    expect(result.valid).toContain('hrc10');
    expect(result.valid).toContain('odi3');
  });

  it('keeps all metrics valid when no settings changed', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const ctx = buildComparisonContext(nights);
    const result = getValidMetrics(ctx);
    expect(result.invalid).not.toContain('nedMean');
  });
});

describe('findSettingsChangeBoundaries', () => {
  it('finds boundaries at RT change points', () => {
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

  it('returns empty for identical settings', () => {
    const nights = [makeNight('2025-01-15'), makeNight('2025-01-14')];
    const boundaries = findSettingsChangeBoundaries(nights);
    expect(boundaries).toHaveLength(0);
  });
});
