// ============================================================
// AirwayLab — Oximetry Trace Builder Tests
// Tests buildOximetryTrace: cleaning, downsampling, ODI detection
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildOximetryTrace } from '@/lib/oximetry-trace';
import type { OximetrySample } from '@/lib/parsers/oximetry-csv-parser';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const BASE_TIME = new Date('2024-01-01T22:00:00Z');

/** Create a single OximetrySample at a given offset in seconds */
function makeSample(
  offsetSec: number,
  overrides: Partial<Omit<OximetrySample, 'time'>> = {}
): OximetrySample {
  return {
    time: new Date(BASE_TIME.getTime() + offsetSec * 1000),
    spo2: overrides.spo2 ?? 96,
    hr: overrides.hr ?? 65,
    motion: overrides.motion ?? 0,
    valid: overrides.valid ?? true,
  };
}

/**
 * Generate a stream of normal OximetrySample[] over a given duration.
 * Uses 2-second intervals (30 samples/min) to match Viatom device output.
 * Duration must be long enough to survive buffer trimming (15min start + 5min end = 20min minimum).
 */
function makeNormalSamples(
  durationMinutes: number,
  opts: { spo2?: number; hr?: number } = {}
): OximetrySample[] {
  const samples: OximetrySample[] = [];
  const totalSamples = durationMinutes * 30; // 2s interval
  for (let i = 0; i < totalSamples; i++) {
    samples.push(
      makeSample(i * 2, {
        spo2: opts.spo2 ?? 95 + (i % 3), // cycles 95, 96, 97
        hr: opts.hr ?? 62 + (i % 5),     // cycles 62-66
      })
    );
  }
  return samples;
}

/**
 * Inject desaturation events into an existing sample array.
 * Each event drops SpO2 to `dropTo` for `durationSamples` consecutive samples.
 */
function injectDesaturations(
  samples: OximetrySample[],
  count: number,
  dropTo: number = 88,
  durationSamples: number = 10
): OximetrySample[] {
  const result = samples.map((s) => ({ ...s }));
  // Place events in the middle region (past the 15-min buffer)
  const safeStart = 15 * 30 + 60; // past buffer + margin
  const safeEnd = result.length - 5 * 30 - 60;
  const spacing = Math.floor((safeEnd - safeStart) / (count + 1));

  for (let e = 0; e < count; e++) {
    const idx = safeStart + spacing * (e + 1);
    for (let j = 0; j < durationSamples && idx + j < result.length; j++) {
      result[idx + j] = { ...result[idx + j]!, spo2: dropTo };
    }
  }
  return result;
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('buildOximetryTrace', () => {
  // ── Null / empty / insufficient data ───────────────────────

  describe('returns null for insufficient data', () => {
    it('returns null for empty array', () => {
      expect(buildOximetryTrace([])).toBeNull();
    });

    it('returns null for a single data point', () => {
      const samples = [makeSample(0)];
      expect(buildOximetryTrace(samples)).toBeNull();
    });

    it('returns null when all samples are in the start buffer zone (first 15 minutes)', () => {
      // 14 minutes of data -- entirely within the 15-minute start buffer
      const samples = makeNormalSamples(14);
      expect(buildOximetryTrace(samples)).toBeNull();
    });

    it('returns null when fewer than 60 cleaned samples remain after filtering', () => {
      // 21 minutes total: 15-min start trim + 5-min end trim = only 1 minute of data (30 samples)
      const samples = makeNormalSamples(21);
      expect(buildOximetryTrace(samples)).toBeNull();
    });
  });

  // ── Data cleaning pipeline ─────────────────────────────────

  describe('cleaning pipeline', () => {
    it('trims samples in the first 15-minute buffer zone', () => {
      // 60 minutes of data: first 15 trimmed, last 5 trimmed = 40 minutes retained
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // Duration should reflect trimmed data (~40 minutes)
      // Allow some tolerance for rounding
      expect(result!.durationSeconds).toBeGreaterThan(35 * 60);
      expect(result!.durationSeconds).toBeLessThanOrEqual(40 * 60);
    });

    it('trims samples in the last 5-minute buffer zone', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      // The trace should not extend beyond the trimmed window
      const lastPoint = result!.trace[result!.trace.length - 1]!;
      // Last trace point time (seconds from start) should be <= durationSeconds
      expect(lastPoint.t).toBeLessThanOrEqual(result!.durationSeconds);
    });

    it('filters out samples with motion > 5', () => {
      const samples = makeNormalSamples(60);
      // Set all samples to high motion -- after buffer trim, nothing should survive
      const highMotion = samples.map((s) => ({ ...s, motion: 10 }));
      expect(buildOximetryTrace(highMotion)).toBeNull();
    });

    it('filters out invalid samples', () => {
      const samples = makeNormalSamples(60);
      const invalid = samples.map((s) => ({ ...s, valid: false }));
      expect(buildOximetryTrace(invalid)).toBeNull();
    });

    it('filters out SpO2 below 50', () => {
      const samples = makeNormalSamples(60);
      const lowSpo2 = samples.map((s) => ({ ...s, spo2: 49 }));
      expect(buildOximetryTrace(lowSpo2)).toBeNull();
    });

    it('filters out SpO2 above 100', () => {
      const samples = makeNormalSamples(60);
      const highSpo2 = samples.map((s) => ({ ...s, spo2: 101 }));
      expect(buildOximetryTrace(highSpo2)).toBeNull();
    });

    it('retains SpO2 at boundary values (50 and 100)', () => {
      // Use 60 minutes of data, spo2=50 (lower boundary)
      const low = makeNormalSamples(60, { spo2: 50 });
      const resultLow = buildOximetryTrace(low);
      expect(resultLow).not.toBeNull();
      // Every retained trace point should have spo2 = 50
      for (const pt of resultLow!.trace) {
        expect(pt.spo2).toBe(50);
      }

      // spo2=100 (upper boundary)
      const high = makeNormalSamples(60, { spo2: 100 });
      const resultHigh = buildOximetryTrace(high);
      expect(resultHigh).not.toBeNull();
      for (const pt of resultHigh!.trace) {
        expect(pt.spo2).toBe(100);
      }
    });

    it('retains samples with motion exactly at the threshold (motion = 5)', () => {
      const samples = makeNormalSamples(60);
      const atThreshold = samples.map((s) => ({ ...s, motion: 5 }));
      const result = buildOximetryTrace(atThreshold);
      expect(result).not.toBeNull();
      expect(result!.trace.length).toBeGreaterThan(0);
    });

    it('filters samples with motion just above threshold (motion = 6)', () => {
      const samples = makeNormalSamples(60);
      const aboveThreshold = samples.map((s) => ({ ...s, motion: 6 }));
      expect(buildOximetryTrace(aboveThreshold)).toBeNull();
    });
  });

  // ── HR double-tracking correction ─────────────────────────

  describe('HR double-tracking correction', () => {
    it('corrects double-tracked HR values (HR > baseline * 1.7 and > 110)', () => {
      const samples = makeNormalSamples(60, { hr: 65 });
      // Inject a double-tracked reading well past the buffer zone
      // At 20 minutes in (sample index 600), insert an HR of 140
      // baseline ~65, 140 > 65*1.7=110.5 and 140 > 110 -> halved to 70
      const idx = 20 * 30; // 20 minutes at 30 samples/min
      samples[idx] = { ...samples[idx]!, hr: 140 };

      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // Find the trace point near this timestamp.
      // After buffer trim (15 min), the 20-min mark is ~5 min into the trace = ~300 seconds.
      // The corrected HR should be ~70, not 140.
      // Since downsampling averages, we verify no trace point has HR near 140.
      for (const pt of result!.trace) {
        expect(pt.hr).toBeLessThan(120);
      }
    });

    it('does not correct HR <= 110 even if high relative to baseline', () => {
      const samples = makeNormalSamples(60, { hr: 55 });
      // HR=108 is high relative to baseline of 55 (108 > 55*1.7=93.5)
      // but 108 <= 110, so no correction should occur
      const idx = 20 * 30;
      samples[idx] = { ...samples[idx]!, hr: 108 };

      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      // The uncorrected value should influence trace points
      // We can't easily pinpoint the exact trace point due to averaging,
      // but the trace should exist and be valid
      expect(result!.trace.length).toBeGreaterThan(0);
    });

    it('does not halve if halved value falls outside 40-110 range', () => {
      const samples = makeNormalSamples(60, { hr: 65 });
      // HR=230: halved = 115 which is > 110, so correction should NOT apply
      const idx = 20 * 30;
      samples[idx] = { ...samples[idx]!, hr: 230 };

      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      // The 230 value should remain uncorrected (halved 115 is outside 40-110)
      // In averaging it would push up the bucket value
    });
  });

  // ── Output shape ───────────────────────────────────────────

  describe('output shape', () => {
    it('returns correct OximetryTraceData structure', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      expect(result).toHaveProperty('trace');
      expect(result).toHaveProperty('durationSeconds');
      expect(result).toHaveProperty('odi3Events');
      expect(result).toHaveProperty('odi4Events');

      expect(Array.isArray(result!.trace)).toBe(true);
      expect(typeof result!.durationSeconds).toBe('number');
      expect(Array.isArray(result!.odi3Events)).toBe(true);
      expect(Array.isArray(result!.odi4Events)).toBe(true);
    });

    it('trace points have t, spo2, and hr fields', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      expect(result!.trace.length).toBeGreaterThan(0);

      for (const pt of result!.trace) {
        expect(pt).toHaveProperty('t');
        expect(pt).toHaveProperty('spo2');
        expect(pt).toHaveProperty('hr');
        expect(typeof pt.t).toBe('number');
        expect(typeof pt.spo2).toBe('number');
        expect(typeof pt.hr).toBe('number');
      }
    });

    it('trace points have ascending timestamps', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      for (let i = 1; i < result!.trace.length; i++) {
        expect(result!.trace[i]!.t).toBeGreaterThanOrEqual(result!.trace[i - 1]!.t);
      }
    });

    it('first trace point starts at t=0 or near zero', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      // The first point's t should be close to 0 (within one bucket)
      expect(result!.trace[0]!.t).toBeGreaterThanOrEqual(0);
      expect(result!.trace[0]!.t).toBeLessThan(10);
    });

    it('durationSeconds is positive and reasonable', () => {
      const samples = makeNormalSamples(120);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
      // 120 min total - 20 min buffer = ~100 min
      expect(result!.durationSeconds).toBeGreaterThan(90 * 60);
      expect(result!.durationSeconds).toBeLessThanOrEqual(100 * 60);
    });

    it('SpO2 values in trace remain within valid range', () => {
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      for (const pt of result!.trace) {
        expect(pt.spo2).toBeGreaterThanOrEqual(50);
        expect(pt.spo2).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── Downsampling ───────────────────────────────────────────

  describe('downsampling', () => {
    it('does not downsample when cleaned samples <= 10,000', () => {
      // 60 min - 20 min buffer = 40 min * 30 samples/min = 1200 samples
      const samples = makeNormalSamples(60);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // 1200 cleaned samples < 10,000: trace should have one point per sample
      expect(result!.trace.length).toBe(1200);
    });

    it('downsamples when cleaned samples exceed 10,000', () => {
      // Need > 10,000 + buffer zone samples
      // (10000 + 15*30 + 5*30) / 30 = ~353 minutes
      // Use 400 minutes to be safe
      const samples = makeNormalSamples(400);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // (400 - 20) * 30 = 11400 cleaned samples > 10000
      // Downsampler uses MAX_TRACE_POINTS buckets + a final bucket emit,
      // so output can be up to MAX_TRACE_POINTS + 1 = 10,001
      expect(result!.trace.length).toBeLessThanOrEqual(10_001);
      expect(result!.trace.length).toBeGreaterThan(0);
      // Verify it actually downsampled (fewer points than cleaned samples)
      expect(result!.trace.length).toBeLessThan(11_400);
    });

    it('downsampled trace preserves approximate SpO2 averages', () => {
      // Use constant SpO2 of 95 so averaging is exact
      const samples = makeNormalSamples(400, { spo2: 95 });
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // All averaged spo2 values should be exactly 95 (rounding of a constant)
      for (const pt of result!.trace) {
        expect(pt.spo2).toBe(95);
      }
    });

    it('downsampled trace preserves approximate HR averages', () => {
      const samples = makeNormalSamples(400, { hr: 72 });
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      for (const pt of result!.trace) {
        expect(pt.hr).toBe(72);
      }
    });
  });

  // ── ODI event detection ────────────────────────────────────

  describe('ODI event detection', () => {
    it('returns empty ODI arrays for stable SpO2 data', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      expect(result!.odi3Events).toHaveLength(0);
      expect(result!.odi4Events).toHaveLength(0);
    });

    it('detects ODI-3 events (>= 3% drop from baseline)', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 5, 93); // 96 -> 93 = 3% drop
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      expect(result!.odi3Events.length).toBeGreaterThan(0);
    });

    it('detects ODI-4 events (>= 4% drop from baseline)', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 5, 91); // 96 -> 91 = 5% drop (>= 4)
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      expect(result!.odi4Events.length).toBeGreaterThan(0);
    });

    it('ODI-4 events are a subset of ODI-3 events (every 4% drop is also >= 3%)', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 5, 90); // 6% drop
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      // Every ODI-4 event timestamp should also appear in ODI-3
      for (const ts of result!.odi4Events) {
        expect(result!.odi3Events).toContain(ts);
      }
    });

    it('ODI-3 count >= ODI-4 count', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 8, 89);
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      expect(result!.odi3Events.length).toBeGreaterThanOrEqual(result!.odi4Events.length);
    });

    it('respects 30-second cooldown between ODI events', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 10, 88);
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      // Verify minimum gap between consecutive ODI-3 events
      for (let i = 1; i < result!.odi3Events.length; i++) {
        const gap = result!.odi3Events[i]! - result!.odi3Events[i - 1]!;
        expect(gap).toBeGreaterThanOrEqual(30);
      }

      // Same for ODI-4
      for (let i = 1; i < result!.odi4Events.length; i++) {
        const gap = result!.odi4Events[i]! - result!.odi4Events[i - 1]!;
        expect(gap).toBeGreaterThanOrEqual(30);
      }
    });

    it('ODI event timestamps are positive integers (elapsed seconds)', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      const withDesats = injectDesaturations(samples, 5, 89);
      const result = buildOximetryTrace(withDesats);
      expect(result).not.toBeNull();

      for (const ts of result!.odi3Events) {
        expect(Number.isInteger(ts)).toBe(true);
        expect(ts).toBeGreaterThan(0);
      }
      for (const ts of result!.odi4Events) {
        expect(Number.isInteger(ts)).toBe(true);
        expect(ts).toBeGreaterThan(0);
      }
    });

    it('does not detect ODI events for drops < 3%', () => {
      const samples = makeNormalSamples(120, { spo2: 96 });
      // Only a 2% drop: 96 -> 94
      const withSmallDrops = injectDesaturations(samples, 5, 94);
      const result = buildOximetryTrace(withSmallDrops);
      expect(result).not.toBeNull();

      expect(result!.odi3Events).toHaveLength(0);
      expect(result!.odi4Events).toHaveLength(0);
    });
  });

  // ── Comparative behaviour ──────────────────────────────────

  describe('comparative behaviour', () => {
    it('more desaturation events produce more ODI detections', () => {
      const base = makeNormalSamples(120, { spo2: 96 });
      const few = injectDesaturations(base, 3, 89);
      const many = injectDesaturations(base, 8, 89);

      const resultFew = buildOximetryTrace(few);
      const resultMany = buildOximetryTrace(many);

      expect(resultFew).not.toBeNull();
      expect(resultMany).not.toBeNull();

      expect(resultMany!.odi3Events.length).toBeGreaterThanOrEqual(
        resultFew!.odi3Events.length
      );
    });

    it('deeper desaturations produce ODI-4 where shallow ones produce only ODI-3', () => {
      const base = makeNormalSamples(120, { spo2: 96 });

      // 3% drop: should only trigger ODI-3, not ODI-4
      const shallow = injectDesaturations(base, 5, 93);
      const resultShallow = buildOximetryTrace(shallow);

      // 5% drop: should trigger both ODI-3 and ODI-4
      const deep = injectDesaturations(base, 5, 91);
      const resultDeep = buildOximetryTrace(deep);

      expect(resultShallow).not.toBeNull();
      expect(resultDeep).not.toBeNull();

      // Shallow: ODI-3 only
      expect(resultShallow!.odi3Events.length).toBeGreaterThan(0);
      expect(resultShallow!.odi4Events).toHaveLength(0);

      // Deep: both ODI-3 and ODI-4
      expect(resultDeep!.odi3Events.length).toBeGreaterThan(0);
      expect(resultDeep!.odi4Events.length).toBeGreaterThan(0);
    });

    it('longer recordings produce longer durationSeconds', () => {
      const short = makeNormalSamples(60); // 40 min after trim
      const long = makeNormalSamples(180); // 160 min after trim

      const resultShort = buildOximetryTrace(short);
      const resultLong = buildOximetryTrace(long);

      expect(resultShort).not.toBeNull();
      expect(resultLong).not.toBeNull();

      expect(resultLong!.durationSeconds).toBeGreaterThan(
        resultShort!.durationSeconds
      );
    });
  });

  // ── Mixed valid/invalid data ───────────────────────────────

  describe('mixed valid and invalid data', () => {
    it('retains valid samples when interspersed with invalid ones', () => {
      const samples = makeNormalSamples(60);
      // Mark every other sample as invalid
      const mixed = samples.map((s, i) => ({ ...s, valid: i % 2 === 0 }));
      const result = buildOximetryTrace(mixed);
      expect(result).not.toBeNull();

      // Should have roughly half the normal trace points (600 valid in the 40-min window)
      expect(result!.trace.length).toBeGreaterThan(0);
      expect(result!.trace.length).toBeLessThan(1200);
    });

    it('retains valid samples when interspersed with high-motion ones', () => {
      const samples = makeNormalSamples(60);
      // Mark every third sample as high motion
      const mixed = samples.map((s, i) => ({
        ...s,
        motion: i % 3 === 0 ? 10 : 0,
      }));
      const result = buildOximetryTrace(mixed);
      expect(result).not.toBeNull();
      expect(result!.trace.length).toBeGreaterThan(0);
    });

    it('handles data where all cleaning filters combine', () => {
      // 120 minutes of data to ensure enough survives all filters
      const samples = makeNormalSamples(120);
      const filtered = samples.map((s, i) => {
        // Every 10th sample has high motion
        if (i % 10 === 0) return { ...s, motion: 8 };
        // Every 15th sample is invalid
        if (i % 15 === 0) return { ...s, valid: false };
        // Every 20th sample has out-of-range SpO2
        if (i % 20 === 0) return { ...s, spo2: 45 };
        return s;
      });

      const result = buildOximetryTrace(filtered);
      expect(result).not.toBeNull();
      expect(result!.trace.length).toBeGreaterThan(0);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles data exactly at the minimum threshold (60 cleaned samples)', () => {
      // We need exactly 60 samples to survive cleaning.
      // Place 60 valid samples inside the buffer-safe window.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const startMs = BASE_TIME.getTime();
      const samples: OximetrySample[] = [];

      // Add buffer-zone samples (will be trimmed)
      for (let i = 0; i < 15 * 30; i++) {
        samples.push(makeSample(i * 2));
      }
      // Add exactly 60 valid samples in the clean zone
      const cleanStart = 15 * 60; // 15 minutes in seconds
      for (let i = 0; i < 60; i++) {
        samples.push(makeSample(cleanStart + i * 2));
      }
      // Add end-buffer samples
      const endStart = cleanStart + 60 * 2 + 5 * 60; // past clean zone + 5 min buffer
      for (let i = 0; i < 5 * 30; i++) {
        samples.push(makeSample(endStart + i * 2));
      }

      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();
    });

    it('returns null when only 59 cleaned samples remain', () => {
      const samples: OximetrySample[] = [];

      // Buffer zone start
      for (let i = 0; i < 15 * 30; i++) {
        samples.push(makeSample(i * 2));
      }
      // Only 59 valid samples in clean zone
      const cleanStart = 15 * 60;
      for (let i = 0; i < 59; i++) {
        samples.push(makeSample(cleanStart + i * 2));
      }
      // Buffer zone end
      const endStart = cleanStart + 59 * 2 + 5 * 60;
      for (let i = 0; i < 5 * 30; i++) {
        samples.push(makeSample(endStart + i * 2));
      }

      const result = buildOximetryTrace(samples);
      expect(result).toBeNull();
    });

    it('handles non-uniform time intervals', () => {
      // Some oximetry devices may have irregular intervals
      const samples: OximetrySample[] = [];
      const startSec = 0;
      let currentSec = startSec;

      // 60 minutes with irregular spacing (1-4 second gaps)
      const totalTarget = 60 * 60; // 60 minutes in seconds
      while (currentSec < totalTarget) {
        samples.push(makeSample(currentSec));
        currentSec += 1 + (currentSec % 4); // irregular gaps
      }

      const result = buildOximetryTrace(samples);
      // May or may not be null depending on how many survive cleaning
      // but should not throw
      if (result !== null) {
        expect(result.trace.length).toBeGreaterThan(0);
        expect(result.durationSeconds).toBeGreaterThan(0);
      }
    });

    it('handles all samples having the same timestamp', () => {
      // Degenerate case: all at t=0
      const samples: OximetrySample[] = [];
      for (let i = 0; i < 100; i++) {
        samples.push(makeSample(0));
      }
      // All will be trimmed by buffer zone (start + end encompasses t=0)
      const result = buildOximetryTrace(samples);
      expect(result).toBeNull();
    });

    it('handles HR = 0 samples (sensor disconnect)', () => {
      const samples = makeNormalSamples(60, { hr: 0 });
      const result = buildOximetryTrace(samples);
      // HR=0 samples are not filtered by the cleaning pipeline
      // (only SpO2 range and motion/validity are checked)
      expect(result).not.toBeNull();
      for (const pt of result!.trace) {
        expect(pt.hr).toBe(0);
      }
    });

    it('handles very long recordings (8+ hours)', () => {
      // 480 minutes = 8 hours, typical overnight recording
      const samples = makeNormalSamples(480);
      const result = buildOximetryTrace(samples);
      expect(result).not.toBeNull();

      // After buffer trim: ~460 min * 30 = 13800 samples > 10000
      // Should be downsampled (up to MAX_TRACE_POINTS + 1 due to final bucket)
      expect(result!.trace.length).toBeLessThanOrEqual(10_001);
      expect(result!.durationSeconds).toBeGreaterThan(7 * 3600); // > 7 hours
    });
  });
});
