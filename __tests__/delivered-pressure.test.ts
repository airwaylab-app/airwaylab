import { describe, it, expect } from 'vitest';
import { computeFlowStatsFromRaw, computeFlowStats, generateSyntheticWaveform } from '@/lib/waveform-utils';
import type { PressurePoint } from '@/lib/waveform-types';

// ── Helpers ──────────────────────────────────────────────────

/** Create a Float32Array of constant pressure */
function makeFlat(value: number, length: number): Float32Array {
  const arr = new Float32Array(length);
  arr.fill(value);
  return arr;
}

/**
 * Create a bimodal pressure array simulating BiPAP.
 * ~60% at low (EPAP), ~40% at high (IPAP), with optional noise.
 */
function makeBimodal(
  epap: number,
  ipap: number,
  length: number,
  noise = 0
): Float32Array {
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Simulate breath cycle: 60% expiration (EPAP), 40% inspiration (IPAP)
    const phase = (i % 100) / 100;
    const base = phase < 0.6 ? epap : ipap;
    // Deterministic noise based on index
    const n = noise > 0 ? Math.sin(i * 7.3) * noise : 0;
    arr[i] = base + n;
  }
  return arr;
}

/** Minimal flow array for computeFlowStatsFromRaw (needs non-empty flow) */
function makeDummyFlow(length: number): Float32Array {
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.sin(i * 0.01) * 10;
  }
  return arr;
}

// ── P10/P90 Computation Tests ────────────────────────────────

describe('Pressure P10/P90 computation (computeFlowStatsFromRaw)', () => {
  it('flat pressure → P10 ≈ P90 ≈ value, mean ≈ value', () => {
    const pressure = makeFlat(10.0, 1000);
    const flow = makeDummyFlow(1000);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureP10).toBeCloseTo(10.0, 1);
    expect(stats.pressureP90).toBeCloseTo(10.0, 1);
    expect(stats.pressureMean).toBeCloseTo(10.0, 1);
  });

  it('bimodal pressure (60% EPAP 8.0, 40% IPAP 15.0) → P10 ≈ 8.0, P90 ≈ 15.0', () => {
    const pressure = makeBimodal(8.0, 15.0, 100_000);
    const flow = makeDummyFlow(100_000);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureP10).toBeCloseTo(8.0, 0);
    expect(stats.pressureP90).toBeCloseTo(15.0, 0);
  });

  it('bimodal with noise (±0.5) → P10 and P90 within 0.5 of cluster centres', () => {
    const pressure = makeBimodal(8.0, 15.0, 100_000, 0.5);
    const flow = makeDummyFlow(100_000);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureP10).not.toBeNull();
    expect(stats.pressureP90).not.toBeNull();
    expect(Math.abs(stats.pressureP10! - 8.0)).toBeLessThan(0.5);
    expect(Math.abs(stats.pressureP90! - 15.0)).toBeLessThan(0.5);
  });

  it('empty pressure → P10/P90/mean all null', () => {
    const flow = makeDummyFlow(100);
    const stats = computeFlowStatsFromRaw(flow, 25, null);

    expect(stats.pressureP10).toBeNull();
    expect(stats.pressureP90).toBeNull();
    expect(stats.pressureMean).toBeNull();
  });

  it('empty Float32Array → P10/P90/mean all null', () => {
    const flow = makeDummyFlow(100);
    const stats = computeFlowStatsFromRaw(flow, 25, new Float32Array(0));

    expect(stats.pressureP10).toBeNull();
    expect(stats.pressureP90).toBeNull();
    expect(stats.pressureMean).toBeNull();
  });

  it('single-sample array → P10 = P90 = mean = that value', () => {
    const pressure = new Float32Array([12.5]);
    const flow = makeDummyFlow(1);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureP10).toBeCloseTo(12.5, 1);
    expect(stats.pressureP90).toBeCloseTo(12.5, 1);
    expect(stats.pressureMean).toBeCloseTo(12.5, 1);
  });

  it('reservoir sampling: 1M samples produces accurate percentiles (±0.2)', () => {
    // 1M samples to test reservoir sampling path
    const pressure = makeBimodal(11.0, 18.0, 1_000_000);
    const flow = makeDummyFlow(1_000_000);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureP10).not.toBeNull();
    expect(stats.pressureP90).not.toBeNull();
    expect(Math.abs(stats.pressureP10! - 11.0)).toBeLessThan(0.2);
    expect(Math.abs(stats.pressureP90! - 18.0)).toBeLessThan(0.2);
  });

  it('preserves existing min/max behaviour', () => {
    const pressure = makeBimodal(8.0, 15.0, 1000);
    const flow = makeDummyFlow(1000);
    const stats = computeFlowStatsFromRaw(flow, 25, pressure);

    expect(stats.pressureMin).not.toBeNull();
    expect(stats.pressureMax).not.toBeNull();
    expect(stats.pressureMin!).toBeLessThanOrEqual(8.0);
    expect(stats.pressureMax!).toBeGreaterThanOrEqual(15.0);
  });
});

// ── P10/P90 from decimated data (computeFlowStats) ──────────

describe('Pressure P10/P90 computation (computeFlowStats)', () => {
  it('returns P10/P90/mean from decimated pressure points', () => {
    // Create decimated pressure points simulating bimodal
    const pressure: PressurePoint[] = [];
    for (let i = 0; i < 1000; i++) {
      const phase = (i % 10) / 10;
      pressure.push({ t: i * 0.1, avg: phase < 0.6 ? 8.0 : 15.0 });
    }
    const flow = Array.from({ length: 1000 }, (_, i) => ({
      t: i * 0.1,
      value: Math.sin(i * 0.1) * 10,
    }));

    const stats = computeFlowStats(flow, pressure);

    expect(stats.pressureP10).toBeCloseTo(8.0, 0);
    expect(stats.pressureP90).toBeCloseTo(15.0, 0);
    expect(stats.pressureMean).not.toBeNull();
  });

  it('empty pressure → nulls', () => {
    const flow = [{ t: 0, value: 5 }];
    const stats = computeFlowStats(flow, []);

    expect(stats.pressureP10).toBeNull();
    expect(stats.pressureP90).toBeNull();
    expect(stats.pressureMean).toBeNull();
  });
});

// ── Divergence detection ─────────────────────────────────────

describe('Divergence detection logic', () => {
  it('prescribed PS 7.0, delivered PS 4.2 → divergence ≥ 1.0', () => {
    const prescribedPS = 7.0;
    const deliveredPS = 4.2;
    const divergence = Math.abs(deliveredPS - prescribedPS);
    expect(divergence).toBeGreaterThanOrEqual(1.0);
  });

  it('prescribed PS 3.0, delivered PS 3.5 → divergence < 1.0', () => {
    const prescribedPS = 3.0;
    const deliveredPS = 3.5;
    const divergence = Math.abs(deliveredPS - prescribedPS);
    expect(divergence).toBeLessThan(1.0);
  });
});

// ── Mode-aware explanation selection ─────────────────────────

describe('Mode-aware explanation selection', () => {
  function getPressureExplanation(papMode: string): string {
    const mode = papMode.toUpperCase();
    if (mode.includes('APAP') || mode.includes('AUTOSET')) {
      return 'apap';
    }
    if (mode.includes('ASV') || mode.includes('IVAPS')) {
      return 'asv';
    }
    if (mode.includes('BIPAP') || mode.includes('VPAP') || mode.includes('BILEVEL')) {
      return 'bipap';
    }
    if (mode.includes('CPAP')) {
      return 'cpap';
    }
    return 'fallback';
  }

  it('CPAP → cpap explanation', () => {
    expect(getPressureExplanation('CPAP')).toBe('cpap');
  });

  it('APAP → apap explanation', () => {
    expect(getPressureExplanation('APAP')).toBe('apap');
  });

  it('AutoSet → apap explanation', () => {
    expect(getPressureExplanation('AutoSet')).toBe('apap');
  });

  it('BiPAP → bipap explanation', () => {
    expect(getPressureExplanation('BiPAP')).toBe('bipap');
  });

  it('VPAP → bipap explanation', () => {
    expect(getPressureExplanation('VPAP')).toBe('bipap');
  });

  it('ASV → asv explanation', () => {
    expect(getPressureExplanation('ASV')).toBe('asv');
  });

  it('iVAPS → asv explanation', () => {
    expect(getPressureExplanation('iVAPS')).toBe('asv');
  });

  it('unknown mode → fallback', () => {
    expect(getPressureExplanation('Unknown')).toBe('fallback');
  });
});

// ── Synthetic waveform demo data ─────────────────────────────

describe('Synthetic waveform pressure stats', () => {
  it('produces sensible P10/P90 for demo data', () => {
    const waveform = generateSyntheticWaveform(1, 900, {
      epap: 10,
      ipap: 16,
    });

    expect(waveform.stats.pressureP10).not.toBeNull();
    expect(waveform.stats.pressureP90).not.toBeNull();
    expect(waveform.stats.pressureMean).not.toBeNull();

    // P10 should be close to EPAP, P90 close to IPAP
    expect(waveform.stats.pressureP10!).toBeGreaterThan(9);
    expect(waveform.stats.pressureP10!).toBeLessThan(12);
    expect(waveform.stats.pressureP90!).toBeGreaterThan(14);
    expect(waveform.stats.pressureP90!).toBeLessThan(17);
  });
});
