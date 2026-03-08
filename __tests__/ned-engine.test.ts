import { describe, it, expect } from 'vitest';
import { computeNED } from '@/lib/analyzers/ned-engine';

// Helper: generate normal sine breathing
function makeSineWave(seconds: number, samplingRate = 25): Float32Array {
  const total = seconds * samplingRate;
  const data = new Float32Array(total);
  const breathPeriod = 4 * samplingRate;
  for (let i = 0; i < total; i++) {
    data[i] = 20 * Math.sin((2 * Math.PI * i) / breathPeriod);
  }
  return data;
}

// Helper: generate flow-limited breathing (peak early, flat mid)
function makeFlowLimitedWave(seconds: number, samplingRate = 25): Float32Array {
  const total = seconds * samplingRate;
  const data = new Float32Array(total);
  const breathPeriod = 4 * samplingRate;
  for (let i = 0; i < total; i++) {
    const phase = (i % breathPeriod) / breathPeriod;
    if (phase < 0.5) {
      // Early peak then decline (NED pattern)
      const t = phase / 0.5;
      if (t < 0.15) {
        data[i] = 25 * (t / 0.15);
      } else {
        data[i] = 25 * (1 - 0.5 * ((t - 0.15) / 0.85));
      }
    } else {
      data[i] = -15 * Math.sin(Math.PI * (phase - 0.5) * 2);
    }
  }
  return data;
}

describe('NED Engine', () => {
  describe('computeNED', () => {
    it('returns empty results for insufficient data', () => {
      const short = new Float32Array(100);
      const result = computeNED(short, 25);

      expect(result.breathCount).toBe(0);
      expect(result.nedMean).toBe(0);
      expect(result.reraCount).toBe(0);
    });

    it('detects breaths in normal sine data', () => {
      const data = makeSineWave(60); // 1 minute
      const result = computeNED(data, 25);

      // 4s per breath → ~15 breaths per minute
      expect(result.breathCount).toBeGreaterThan(5);
      expect(result.breathCount).toBeLessThan(30);
    });

    it('NED values are in valid range (0-100%)', () => {
      const data = makeSineWave(120);
      const result = computeNED(data, 25);

      expect(result.nedMean).toBeGreaterThanOrEqual(0);
      expect(result.nedMean).toBeLessThanOrEqual(100);
      expect(result.nedMedian).toBeGreaterThanOrEqual(0);
      expect(result.nedP95).toBeGreaterThanOrEqual(0);
    });

    it('FI is in valid range (0-1)', () => {
      const data = makeSineWave(120);
      const result = computeNED(data, 25);

      expect(result.fiMean).toBeGreaterThanOrEqual(0);
      expect(result.fiMean).toBeLessThanOrEqual(1);
    });

    it('percentages are in valid range (0-100)', () => {
      const data = makeSineWave(120);
      const result = computeNED(data, 25);

      expect(result.nedClearFLPct).toBeGreaterThanOrEqual(0);
      expect(result.nedClearFLPct).toBeLessThanOrEqual(100);
      expect(result.nedBorderlinePct).toBeGreaterThanOrEqual(0);
      expect(result.nedBorderlinePct).toBeLessThanOrEqual(100);
      expect(result.fiFL85Pct).toBeGreaterThanOrEqual(0);
      expect(result.fiFL85Pct).toBeLessThanOrEqual(100);
      expect(result.mShapePct).toBeGreaterThanOrEqual(0);
      expect(result.mShapePct).toBeLessThanOrEqual(100);
      expect(result.combinedFLPct).toBeGreaterThanOrEqual(0);
      expect(result.combinedFLPct).toBeLessThanOrEqual(100);
    });

    it('detects higher NED in flow-limited vs normal breathing', () => {
      const normal = computeNED(makeSineWave(120), 25);
      const limited = computeNED(makeFlowLimitedWave(120), 25);

      expect(limited.nedMean).toBeGreaterThan(normal.nedMean);
    });

    it('H1/H2 split produces valid values', () => {
      const data = makeSineWave(120);
      const result = computeNED(data, 25);

      expect(result.h1NedMean).toBeGreaterThanOrEqual(0);
      expect(result.h2NedMean).toBeGreaterThanOrEqual(0);
    });

    it('RERA index is non-negative', () => {
      const data = makeSineWave(120);
      const result = computeNED(data, 25);

      expect(result.reraIndex).toBeGreaterThanOrEqual(0);
      expect(result.reraCount).toBeGreaterThanOrEqual(0);
    });
  });
});
