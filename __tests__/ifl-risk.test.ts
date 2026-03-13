import { describe, it, expect } from 'vitest';
import { computeIFLRisk, getIFLContextNote } from '@/lib/ifl-risk';
import { THRESHOLDS, getTrafficLight } from '@/lib/thresholds';
import type { NightResult } from '@/lib/types';

// Helper to build a minimal NightResult for IFL Risk testing
function makeNight(overrides: {
  flScore?: number;
  nedMean?: number;
  fiMean?: number;
  glasgowOverall?: number;
  estimatedArousalIndex?: number;
}): NightResult {
  return {
    date: new Date('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7.0,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirCurve 10 VAuto',
      epap: 10,
      ipap: 16,
      pressureSupport: 6,
      papMode: 'BiPAP S',
      riseTime: 2,
      trigger: 'Medium',
      cycle: 'Medium',
      easyBreathe: false,
    },
    glasgow: {
      overall: overrides.glasgowOverall ?? 0,
      skew: 0,
      spike: 0,
      flatTop: 0,
      topHeavy: 0,
      multiPeak: 0,
      noPause: 0,
      inspirRate: 0,
      multiBreath: 0,
      variableAmp: 0,
    },
    wat: {
      flScore: overrides.flScore ?? 0,
      regularityScore: 50,
      periodicityIndex: 15,
    },
    ned: {
      breathCount: 1000,
      nedMean: overrides.nedMean ?? 0,
      nedMedian: 10,
      nedP95: 30,
      nedClearFLPct: 2,
      nedBorderlinePct: 5,
      fiMean: overrides.fiMean ?? 1.0,
      fiFL85Pct: 10,
      tpeakMean: 0.35,
      mShapePct: 5,
      reraIndex: 5,
      reraCount: 35,
      h1NedMean: 12,
      h2NedMean: 15,
      combinedFLPct: 20,
      estimatedArousalIndex: overrides.estimatedArousalIndex ?? 8,
    },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
  };
}

describe('computeIFLRisk', () => {
  it('returns 0 when all inputs are zero/normal', () => {
    const night = makeNight({ flScore: 0, nedMean: 0, fiMean: 1.0, glasgowOverall: 0 });
    expect(computeIFLRisk(night)).toBe(0);
  });

  it('returns 100 when all inputs are maximum', () => {
    const night = makeNight({ flScore: 100, nedMean: 100, fiMean: 0.0, glasgowOverall: 9 });
    expect(computeIFLRisk(night)).toBe(100);
  });

  it('returns correct weighted sum for known input values', () => {
    // FL Score 50 × 0.35 = 17.5
    // NED Mean 40 × 0.30 = 12.0
    // FI (1 - 0.6) × 100 = 40 × 0.20 = 8.0
    // Glasgow (3 / 9) × 100 = 33.33 × 0.15 = 5.0
    // Total = 42.5
    const night = makeNight({ flScore: 50, nedMean: 40, fiMean: 0.6, glasgowOverall: 3 });
    const result = computeIFLRisk(night);
    expect(result).toBeCloseTo(42.5, 1);
  });

  it('scores green for mild FL data', () => {
    const night = makeNight({ flScore: 25, nedMean: 15, fiMean: 0.85, glasgowOverall: 1.0 });
    const risk = computeIFLRisk(night);
    const light = getTrafficLight(risk, THRESHOLDS.iflRisk);
    expect(light).toBe('good');
    expect(risk).toBeLessThanOrEqual(20);
  });

  it('scores amber for moderate FL data', () => {
    const night = makeNight({ flScore: 45, nedMean: 28, fiMean: 0.7, glasgowOverall: 2.5 });
    const risk = computeIFLRisk(night);
    const light = getTrafficLight(risk, THRESHOLDS.iflRisk);
    expect(light).toBe('warn');
    expect(risk).toBeGreaterThan(20);
    expect(risk).toBeLessThanOrEqual(45);
  });

  it('scores red for severe FL data', () => {
    const night = makeNight({ flScore: 70, nedMean: 55, fiMean: 0.4, glasgowOverall: 4.0 });
    const risk = computeIFLRisk(night);
    const light = getTrafficLight(risk, THRESHOLDS.iflRisk);
    expect(light).toBe('bad');
    expect(risk).toBeGreaterThan(45);
  });

  it('treats NaN inputs as 0 without crashing', () => {
    const night = makeNight({ flScore: NaN, nedMean: 20, fiMean: NaN, glasgowOverall: 1.0 });
    const risk = computeIFLRisk(night);
    expect(Number.isFinite(risk)).toBe(true);
    expect(risk).toBeGreaterThanOrEqual(0);
  });
});

describe('getIFLContextNote', () => {
  it('returns FL-driving note when IFL Risk > 30 and EAI ≤ 5', () => {
    const note = getIFLContextNote(35, 4);
    expect(note).not.toBeNull();
    expect(note).toContain('flow limitation');
    expect(note).toContain('independently of arousals');
  });

  it('returns non-FL note when IFL Risk ≤ 15 and EAI > 10', () => {
    const note = getIFLContextNote(12, 15);
    expect(note).not.toBeNull();
    expect(note).toContain('non-FL causes');
  });

  it('returns null when IFL Risk and EAI are congruent', () => {
    // Both moderate
    const note = getIFLContextNote(30, 8);
    expect(note).toBeNull();
  });
});

describe('THRESHOLDS.iflRisk', () => {
  it('is defined with correct values', () => {
    expect(THRESHOLDS.iflRisk).toBeDefined();
    expect(THRESHOLDS.iflRisk.green).toBe(20);
    expect(THRESHOLDS.iflRisk.amber).toBe(45);
    expect(THRESHOLDS.iflRisk.lowerIsBetter).toBe(true);
  });
});
