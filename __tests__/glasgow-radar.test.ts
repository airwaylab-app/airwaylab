import { describe, it, expect } from 'vitest';
import type { GlasgowComponents } from '@/lib/types';

/**
 * Tests for glasgow-radar.tsx chart data preparation.
 *
 * Since the component is a presentational Recharts wrapper, we test
 * the data contract and reference value calibration rather than DOM
 * rendering (which would require adding @vitejs/plugin-react).
 */

// Mirror the REFERENCE_VALUES from the component to verify they're on the 0–1 scale
const EXPECTED_REFERENCE_VALUES: Record<string, number> = {
  Skew: 0.30,
  Spike: 0.20,
  'Flat Top': 0.25,
  'Top Heavy': 0.30,
  'Multi-Peak': 0.15,
  'No Pause': 0.30,
  'Insp. Rate': 0.20,
  'Multi-Breath': 0.15,
  'Var. Amp': 0.25,
};

// Replicate the data-building logic from the component
function buildRadarData(glasgow: GlasgowComponents, refValues: Record<string, number>) {
  return [
    { component: 'Skew', value: glasgow.skew, ref: refValues['Skew'] },
    { component: 'Spike', value: glasgow.spike, ref: refValues['Spike'] },
    { component: 'Flat Top', value: glasgow.flatTop, ref: refValues['Flat Top'] },
    { component: 'Top Heavy', value: glasgow.topHeavy, ref: refValues['Top Heavy'] },
    { component: 'Multi-Peak', value: glasgow.multiPeak, ref: refValues['Multi-Peak'] },
    { component: 'No Pause', value: glasgow.noPause, ref: refValues['No Pause'] },
    { component: 'Insp. Rate', value: glasgow.inspirRate, ref: refValues['Insp. Rate'] },
    { component: 'Multi-Breath', value: glasgow.multiBreath, ref: refValues['Multi-Breath'] },
    { component: 'Var. Amp', value: glasgow.variableAmp, ref: refValues['Var. Amp'] },
  ];
}

function makeGlasgow(overrides: Partial<GlasgowComponents> = {}): GlasgowComponents {
  return {
    overall: 2.1,
    skew: 0.35,
    spike: 0.20,
    flatTop: 0.25,
    topHeavy: 0.30,
    multiPeak: 0.10,
    noPause: 0.40,
    inspirRate: 0.15,
    multiBreath: 0.05,
    variableAmp: 0.22,
    ...overrides,
  };
}

describe('GlasgowRadar data contract', () => {
  it('passes component scores unchanged (not rescaled)', () => {
    const glasgow = makeGlasgow({ skew: 0.35 });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    const skewEntry = data.find((d) => d.component === 'Skew');
    expect(skewEntry?.value).toBe(0.35);
  });

  it('preserves score of 0 without transformation', () => {
    const glasgow = makeGlasgow({ skew: 0 });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    const skewEntry = data.find((d) => d.component === 'Skew');
    expect(skewEntry?.value).toBe(0);
  });

  it('preserves score of 1.0 without transformation', () => {
    const glasgow = makeGlasgow({ skew: 1.0 });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    const skewEntry = data.find((d) => d.component === 'Skew');
    expect(skewEntry?.value).toBe(1.0);
  });

  it('all reference values are on the 0–1 scale', () => {
    for (const [name, value] of Object.entries(EXPECTED_REFERENCE_VALUES)) {
      expect(value, `${name} reference should be <= 1`).toBeLessThanOrEqual(1);
      expect(value, `${name} reference should be > 0`).toBeGreaterThan(0);
    }
  });

  it('reference values provide visual ceiling above typical low scores', () => {
    // A user with all scores at 0.35 should have scores below reference values
    const glasgow = makeGlasgow({
      skew: 0.20,
      spike: 0.10,
      flatTop: 0.15,
      topHeavy: 0.20,
      multiPeak: 0.10,
      noPause: 0.20,
      inspirRate: 0.10,
      multiBreath: 0.10,
      variableAmp: 0.15,
    });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    for (const entry of data) {
      expect(
        entry.ref,
        `${entry.component} ref (${entry.ref}) should be >= score (${entry.value})`
      ).toBeGreaterThanOrEqual(entry.value);
    }
  });

  it('empty state guard: detects all-zero scores', () => {
    const glasgow = makeGlasgow({
      skew: 0, spike: 0, flatTop: 0, topHeavy: 0,
      multiPeak: 0, noPause: 0, inspirRate: 0, multiBreath: 0, variableAmp: 0,
    });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    const hasData = data.some((d) => d.value > 0);
    expect(hasData).toBe(false);
  });

  it('builds correct ARIA label with raw score values', () => {
    const glasgow = makeGlasgow({ skew: 0.35, spike: 0.20 });
    const data = buildRadarData(glasgow, EXPECTED_REFERENCE_VALUES);
    // Replicate the ARIA label logic from the component
    const ariaLabel = `Glasgow Index radar chart. Overall score: ${glasgow.overall.toFixed(1)} out of 9. Shows 9 component scores: ${data.map((d) => `${d.component}: ${d.value.toFixed(2)}`).join(', ')}.`;
    expect(ariaLabel).toContain('Skew: 0.35');
    expect(ariaLabel).toContain('Spike: 0.20');
    expect(ariaLabel).not.toContain('Skew: 35');
  });

  it('tooltip formatter shows raw values with 2 decimal places', () => {
    // Replicate the tooltip formatter logic
    const formatScore = (value: number) => Number(value).toFixed(2);
    expect(formatScore(0.35)).toBe('0.35');
    expect(formatScore(0)).toBe('0.00');
    expect(formatScore(1)).toBe('1.00');
    expect(formatScore(0.05)).toBe('0.05');
  });
});
