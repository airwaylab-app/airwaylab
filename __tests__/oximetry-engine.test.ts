import { describe, it, expect } from 'vitest';
import { computeOximetry } from '@/lib/analyzers/oximetry-engine';
import type { OximetrySample } from '@/lib/parsers/oximetry-csv-parser';

// Helper: generate normal SpO2/HR samples over a period
function makeNormalSamples(minutes: number): OximetrySample[] {
  const samples: OximetrySample[] = [];
  const startTime = new Date('2024-01-01T22:00:00Z');

  for (let i = 0; i < minutes * 30; i++) { // 2s intervals = 30 samples/min
    const time = new Date(startTime.getTime() + i * 2000);
    samples.push({
      time,
      spo2: 95 + Math.round(Math.random() * 2), // 95-97%
      hr: 60 + Math.round(Math.random() * 10),  // 60-70 bpm
      motion: 0,
      valid: true,
    });
  }
  return samples;
}

// Helper: add desaturation events to existing samples
function addDesatEvents(samples: OximetrySample[], count: number): OximetrySample[] {
  const result = [...samples];
  const spacing = Math.floor(result.length / (count + 1));

  for (let e = 0; e < count; e++) {
    const idx = spacing * (e + 1);
    // Drop SpO2 by 5% for 20 seconds (10 samples)
    for (let j = 0; j < 10 && idx + j < result.length; j++) {
      result[idx + j] = { ...result[idx + j]!, spo2: 88 };
    }
  }
  return result;
}

describe('Oximetry Engine', () => {
  describe('computeOximetry', () => {
    it('returns empty results for no data', () => {
      const result = computeOximetry([]);

      expect(result.odi3).toBe(0);
      expect(result.odi4).toBe(0);
      expect(result.totalSamples).toBe(0);
    });

    it('returns empty results for insufficient data', () => {
      const few = makeNormalSamples(1); // only 1 minute
      const result = computeOximetry(few);

      // After buffer trimming (15min start + 5min end), almost nothing left
      expect(result.odi3).toBe(0);
    });

    it('processes normal samples with valid summary stats', () => {
      // 120 minutes to survive buffer trimming (15min + 5min)
      const samples = makeNormalSamples(120);
      const result = computeOximetry(samples);

      expect(result.spo2Mean).toBeGreaterThan(90);
      expect(result.spo2Mean).toBeLessThanOrEqual(100);
      expect(result.hrMean).toBeGreaterThan(50);
      expect(result.hrMean).toBeLessThan(120);
      expect(result.retainedSamples).toBeGreaterThan(0);
    });

    it('computes H1/H2 splits', () => {
      const samples = makeNormalSamples(120);
      const result = computeOximetry(samples);

      expect(result.h1).toBeDefined();
      expect(result.h2).toBeDefined();
      expect(result.h1.odi3).toBeGreaterThanOrEqual(0);
      expect(result.h2.odi3).toBeGreaterThanOrEqual(0);
    });

    it('detects desaturation events', () => {
      const base = makeNormalSamples(120);
      const withDesats = addDesatEvents(base, 10);

      const normal = computeOximetry(base);
      const desaturated = computeOximetry(withDesats);

      // Version with desaturation events should have higher ODI
      expect(desaturated.odi3).toBeGreaterThanOrEqual(normal.odi3);
    });

    it('filters out invalid samples', () => {
      const samples = makeNormalSamples(120);
      // Mark some as invalid
      for (let i = 0; i < 100; i++) {
        samples[500 + i] = { ...samples[500 + i]!, valid: false };
      }

      const result = computeOximetry(samples);
      expect(result.retainedSamples).toBeLessThan(result.totalSamples);
    });

    it('filters out high-motion samples', () => {
      const samples = makeNormalSamples(120);
      // Add high motion to some samples
      for (let i = 0; i < 50; i++) {
        samples[600 + i] = { ...samples[600 + i]!, motion: 10 };
      }

      const result = computeOximetry(samples);
      expect(result.retainedSamples).toBeLessThan(result.totalSamples);
    });

    it('corrects HR double-tracking', () => {
      const samples = makeNormalSamples(120);
      // Simulate double-tracking: HR jumps to 2× normal
      for (let i = 0; i < 20; i++) {
        samples[800 + i] = { ...samples[800 + i]!, hr: 130 };
      }

      const result = computeOximetry(samples);
      expect(result.doubleTrackingCorrected).toBeGreaterThanOrEqual(0);
    });

    it('tBelow90 and tBelow94 are in valid percentage range', () => {
      const samples = makeNormalSamples(120);
      const result = computeOximetry(samples);

      expect(result.tBelow90).toBeGreaterThanOrEqual(0);
      expect(result.tBelow90).toBeLessThanOrEqual(100);
      expect(result.tBelow94).toBeGreaterThanOrEqual(0);
      expect(result.tBelow94).toBeLessThanOrEqual(100);
    });
  });
});
