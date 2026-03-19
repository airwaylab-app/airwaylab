import { describe, it, expect } from 'vitest';
import { computeEstimatedRDI } from '@/lib/derived-metrics';
import { THRESHOLDS, getTrafficLight } from '@/lib/thresholds';
import type { NEDResults } from '@/lib/types';

function makeNED(overrides: Partial<NEDResults> = {}): NEDResults {
  return {
    breathCount: 5000,
    nedMean: 18,
    nedMedian: 15,
    nedP95: 40,
    nedClearFLPct: 3,
    nedBorderlinePct: 8,
    fiMean: 0.72,
    fiFL85Pct: 12,
    tpeakMean: 0.38,
    mShapePct: 5,
    reraIndex: 4.2,
    reraCount: 30,
    h1NedMean: 16,
    h2NedMean: 20,
    combinedFLPct: 25,
    estimatedArousalIndex: 6,
    ...overrides,
  };
}

describe('computeEstimatedRDI', () => {
  it('sums reraIndex + hypopneaIndex correctly', () => {
    const ned = makeNED({ reraIndex: 4.2, hypopneaIndex: 3.1 });
    const rdi = computeEstimatedRDI(ned);
    expect(rdi).toBeCloseTo(7.3, 1);
  });

  it('returns reraIndex alone when hypopneaIndex is undefined', () => {
    const ned = makeNED({ reraIndex: 6.5 });
    // hypopneaIndex not set → undefined
    const rdi = computeEstimatedRDI(ned);
    expect(rdi).toBeCloseTo(6.5, 1);
  });

  it('returns 0 when both components are 0', () => {
    const ned = makeNED({ reraIndex: 0, hypopneaIndex: 0 });
    expect(computeEstimatedRDI(ned)).toBe(0);
  });

  it('does NOT include briefObstructionIndex in the sum', () => {
    const ned = makeNED({
      reraIndex: 3.0,
      hypopneaIndex: 2.0,
      briefObstructionIndex: 5.0,
    });
    // Should be 3.0 + 2.0 = 5.0, NOT 10.0
    expect(computeEstimatedRDI(ned)).toBeCloseTo(5.0, 1);
  });

  it('handles hypopneaIndex of 0 (not undefined) correctly', () => {
    const ned = makeNED({ reraIndex: 8.0, hypopneaIndex: 0 });
    expect(computeEstimatedRDI(ned)).toBeCloseTo(8.0, 1);
  });
});

describe('estimatedRdi threshold', () => {
  it('exists in THRESHOLDS', () => {
    expect(THRESHOLDS.estimatedRdi).toBeDefined();
  });

  it('returns green for value below 5', () => {
    expect(getTrafficLight(3.0, THRESHOLDS.estimatedRdi!)).toBe('good');
  });

  it('returns amber for value between 5 and 15', () => {
    expect(getTrafficLight(8.0, THRESHOLDS.estimatedRdi!)).toBe('warn');
  });

  it('returns red for value above 15', () => {
    expect(getTrafficLight(18.0, THRESHOLDS.estimatedRdi!)).toBe('bad');
  });

  it('returns green at exactly 5 (boundary — threshold uses <=)', () => {
    expect(getTrafficLight(5.0, THRESHOLDS.estimatedRdi!)).toBe('good');
  });

  it('returns amber just above 5', () => {
    expect(getTrafficLight(5.1, THRESHOLDS.estimatedRdi!)).toBe('warn');
  });
});
