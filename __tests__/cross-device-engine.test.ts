import { describe, it, expect } from 'vitest';
import { estimateClockOffset, matchRERAs, decomposeHRc10, computeCrossDevice } from '@/lib/analyzers/cross-device-engine';
import type { RERACandidate } from '@/lib/types';
import type { OximetrySample } from '@/lib/parsers/oximetry-csv-parser';

function makeSample(timeSec: number, hr: number, spo2 = 96): OximetrySample {
  return { time: new Date(2026, 0, 1, 0, 0, 0, timeSec * 1000), spo2, hr, motion: 0, valid: true };
}

function makeRera(startSec: number, durationSec: number): RERACandidate {
  return { startBreathIdx: 0, endBreathIdx: 5, breathCount: 6, nedSlope: 1.0, hasRecovery: true, hasSigh: false, maxNED: 40, startSec, durationSec };
}

function makeOxiWithSpikes(durationSec: number, intervalSec: number, spikeTimesSeconds: number[]): OximetrySample[] {
  const samples: OximetrySample[] = [];
  const spikeSet = new Set(spikeTimesSeconds.map((t) => Math.round(t)));
  for (let t = 0; t < durationSec; t += intervalSec) {
    const isSpike = spikeSet.has(Math.round(t)) || spikeSet.has(Math.round(t) - 1) || spikeSet.has(Math.round(t) + 1);
    samples.push(makeSample(t, isSpike ? 80 : 60));
  }
  return samples;
}

describe('Cross-Device Engine', () => {
  describe('estimateClockOffset', () => {
    it('finds known offset in synthetic data', () => {
      const spikeSet = new Set<number>();
      const reraEndTimes: number[] = [];
      const trueOffset = 50;
      const trueDelay = 25;
      for (let i = 0; i < 15; i++) {
        const reraEnd = 300 + i * 120;
        reraEndTimes.push(reraEnd);
        const spikeTime = reraEnd + trueOffset + trueDelay;
        spikeSet.add(spikeTime);
        spikeSet.add(spikeTime + 1);
        spikeSet.add(spikeTime - 1);
      }
      const result = estimateClockOffset(reraEndTimes, spikeSet);
      // Offset should be in valid range: (trueOffset + trueDelay - 45) to (trueOffset + trueDelay - 5)
      // = (50 + 25 - 45) to (50 + 25 - 5) = [30, 70]
      expect(result.bestOffset).toBeGreaterThanOrEqual(25);
      expect(result.bestOffset).toBeLessThanOrEqual(75);
      expect(result.bestMatches).toBeGreaterThan(10);
      expect(result.confidence).toBe('high');
    });

    it('returns low confidence when match rate < 25%', () => {
      const spikeSet = new Set<number>([999999]);
      const reraEndTimes = Array.from({ length: 12 }, (_, i) => 100 + i * 60);
      const result = estimateClockOffset(reraEndTimes, spikeSet);
      expect(result.confidence).toBe('low');
    });

    it('returns low confidence when < 10 RERAs', () => {
      const result = estimateClockOffset([100, 200, 300], new Set<number>());
      expect(result.confidence).toBe('low');
      expect(result.totalEvents).toBe(3);
    });
  });

  describe('matchRERAs', () => {
    it('matches RERAs to HR spikes with 0s offset', () => {
      const reras = Array.from({ length: 10 }, (_, i) => makeRera(100 + i * 100, 20));
      const spikeTimes = reras.map((r) => r.startSec + r.durationSec + 15);
      const samples = makeOxiWithSpikes(1500, 2, spikeTimes);
      const result = matchRERAs(reras, samples, 0, 2, 1500);
      expect(result.total).toBe(10);
      expect(result.matched).toBeGreaterThan(5);
    });

    it('returns zeros for empty inputs', () => {
      const result = matchRERAs([], [], 0, 2, 1000);
      expect(result.total).toBe(0);
      expect(result.matched).toBe(0);
    });
  });

  describe('decomposeHRc10', () => {
    it('decomposes HRc10 correctly', () => {
      const result = decomposeHRc10(60, 10, 15);
      expect(result.reraCoupledRate).toBe(6);
      expect(result.nonReraRate).toBe(9);
    });

    it('clamps non-RERA rate to 0', () => {
      const result = decomposeHRc10(100, 20, 5);
      expect(result.nonReraRate).toBe(0);
    });

    it('sum approximately equals HRc10', () => {
      const result = decomposeHRc10(50, 8, 12);
      expect(result.reraCoupledRate + result.nonReraRate).toBeCloseTo(12, 0);
    });
  });

  describe('computeCrossDevice', () => {
    it('returns null when < 10 RERAs', () => {
      const reras = Array.from({ length: 5 }, (_, i) => makeRera(i * 60, 10));
      const samples = makeOxiWithSpikes(600, 2, []);
      expect(computeCrossDevice(reras, samples, 2, 600, 5, 10)).toBeNull();
    });

    it('returns null when < 100 oximetry samples', () => {
      const reras = Array.from({ length: 12 }, (_, i) => makeRera(i * 60, 10));
      const samples = makeOxiWithSpikes(60, 2, []);
      expect(computeCrossDevice(reras, samples, 2, 3600, 12, 10)).toBeNull();
    });

    it('produces valid results with sufficient data', () => {
      const reras = Array.from({ length: 15 }, (_, i) => makeRera(300 + i * 120, 20));
      const spikeTimes = reras.map((r) => r.startSec + r.durationSec + 15);
      const samples = makeOxiWithSpikes(3600, 2, spikeTimes);
      const result = computeCrossDevice(reras, samples, 2, 3600, 15, 20);
      expect(result).not.toBeNull();
      expect(result!.couplingPct).toBeGreaterThanOrEqual(0);
      expect(result!.couplingPct).toBeLessThanOrEqual(100);
      expect(result!.totalCount).toBe(15);
    });
  });
});
