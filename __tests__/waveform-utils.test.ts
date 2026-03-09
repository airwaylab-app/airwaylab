import { describe, it, expect } from 'vitest';
import {
  downsampleFlow,
  downsamplePressure,
  computeFlowStats,
  generateSyntheticWaveform,
  formatElapsedTime,
  formatElapsedTimeShort,
} from '@/lib/waveform-utils';
import type { WaveformPoint, PressurePoint } from '@/lib/waveform-types';

// ── downsampleFlow ──────────────────────────────────────────

describe('downsampleFlow', () => {
  it('returns empty array for empty input', () => {
    const result = downsampleFlow(new Float32Array(0), 25, 2);
    expect(result).toEqual([]);
  });

  it('returns empty array for zero sample rate', () => {
    const result = downsampleFlow(new Float32Array([1, 2, 3]), 0, 2);
    expect(result).toEqual([]);
  });

  it('returns empty array for negative sample rate', () => {
    const result = downsampleFlow(new Float32Array([1, 2, 3]), -1, 2);
    expect(result).toEqual([]);
  });

  it('buckets data correctly at 25 Hz with 2-second buckets', () => {
    // 25 Hz * 2 seconds = 50 samples per bucket
    const sampleRate = 25;
    const bucketSeconds = 2;
    const samplesPerBucket = sampleRate * bucketSeconds; // 50
    const numBuckets = 3;
    const data = new Float32Array(numBuckets * samplesPerBucket);

    // Fill bucket 0 with values 0-49 → min=0, max=49, avg=24.5
    for (let i = 0; i < samplesPerBucket; i++) data[i] = i;
    // Fill bucket 1 with constant 10
    for (let i = samplesPerBucket; i < 2 * samplesPerBucket; i++) data[i] = 10;
    // Fill bucket 2 with -5 and 5 alternating
    for (let i = 2 * samplesPerBucket; i < 3 * samplesPerBucket; i++) data[i] = i % 2 === 0 ? -5 : 5;

    const result = downsampleFlow(data, sampleRate, bucketSeconds);

    expect(result).toHaveLength(3);

    // Bucket 0
    expect(result[0].t).toBe(0);
    expect(result[0].min).toBe(0);
    expect(result[0].max).toBe(49);
    expect(result[0].avg).toBeCloseTo(24.5, 0);

    // Bucket 1: constant 10
    expect(result[1].t).toBe(2);
    expect(result[1].min).toBe(10);
    expect(result[1].max).toBe(10);
    expect(result[1].avg).toBe(10);

    // Bucket 2: alternating -5/5
    expect(result[2].t).toBe(4);
    expect(result[2].min).toBe(-5);
    expect(result[2].max).toBe(5);
    expect(result[2].avg).toBeCloseTo(0, 0);
  });

  it('handles partial last bucket', () => {
    // 10 samples at 5 Hz, 2-second buckets = 10 samples/bucket → should be 1 bucket
    const data = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const result = downsampleFlow(data, 5, 2);
    expect(result).toHaveLength(1);
    expect(result[0].min).toBe(1);
    expect(result[0].max).toBe(10);

    // 11 samples → 2 buckets (10 + 1)
    const data2 = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]);
    const result2 = downsampleFlow(data2, 5, 2);
    expect(result2).toHaveLength(2);
    expect(result2[1].min).toBe(100);
    expect(result2[1].max).toBe(100);
  });

  it('preserves extreme values (peaks and valleys)', () => {
    const sampleRate = 10;
    const bucketSeconds = 1;
    // One bucket of 10 samples with one spike
    const data = new Float32Array([0, 0, 0, 0, 100, 0, 0, 0, 0, -50]);
    const result = downsampleFlow(data, sampleRate, bucketSeconds);

    expect(result).toHaveLength(1);
    expect(result[0].max).toBe(100);
    expect(result[0].min).toBe(-50);
  });

  it('handles single sample', () => {
    const data = new Float32Array([42]);
    const result = downsampleFlow(data, 25, 2);
    expect(result).toHaveLength(1);
    expect(result[0].min).toBe(42);
    expect(result[0].max).toBe(42);
    expect(result[0].avg).toBe(42);
  });
});

// ── downsamplePressure ──────────────────────────────────────

describe('downsamplePressure', () => {
  it('returns empty array for empty input', () => {
    expect(downsamplePressure(new Float32Array(0), 25, 2)).toEqual([]);
  });

  it('computes bucket averages', () => {
    // 10 samples at 5 Hz, 2-second buckets = 10 samples per bucket
    const data = new Float32Array([10, 12, 14, 10, 12, 14, 10, 12, 14, 10]);
    const result = downsamplePressure(data, 5, 2);
    expect(result).toHaveLength(1);
    expect(result[0].avg).toBeCloseTo(11.8, 1);
  });
});

// ── computeFlowStats ────────────────────────────────────────

describe('computeFlowStats', () => {
  it('returns zeros for empty flow', () => {
    const stats = computeFlowStats([], []);
    expect(stats.breathCount).toBe(0);
    expect(stats.flowMin).toBe(0);
    expect(stats.flowMax).toBe(0);
    expect(stats.pressureMin).toBeNull();
    expect(stats.pressureMax).toBeNull();
  });

  it('computes flow range and breath count from zero crossings', () => {
    // Simulated breathing: positive (insp) → negative (exp) → positive → negative
    const flow: WaveformPoint[] = [
      { t: 0, min: 5, max: 30, avg: 20 },    // inspiration
      { t: 2, min: 10, max: 35, avg: 25 },   // inspiration
      { t: 4, min: -25, max: -5, avg: -15 },  // expiration (1 crossing)
      { t: 6, min: -20, max: -3, avg: -10 },  // expiration
      { t: 8, min: 5, max: 30, avg: 20 },     // inspiration (2 crossings)
      { t: 10, min: -25, max: -5, avg: -15 }, // expiration (3 crossings)
      { t: 12, min: 10, max: 28, avg: 18 },   // inspiration (4 crossings)
    ];
    const stats = computeFlowStats(flow, []);

    expect(stats.flowMin).toBe(-25);
    expect(stats.flowMax).toBe(35);
    // 4 zero crossings → ~2 breaths
    expect(stats.breathCount).toBe(2);
    expect(stats.pressureMin).toBeNull();
    expect(stats.pressureMax).toBeNull();
  });

  it('computes pressure range when available', () => {
    const flow: WaveformPoint[] = [{ t: 0, min: -10, max: 30, avg: 10 }];
    const pressure: PressurePoint[] = [
      { t: 0, avg: 10 },
      { t: 2, avg: 16 },
      { t: 4, avg: 8 },
    ];
    const stats = computeFlowStats(flow, pressure);
    expect(stats.pressureMin).toBe(8);
    expect(stats.pressureMax).toBe(16);
  });
});

// ── generateSyntheticWaveform ───────────────────────────────

describe('generateSyntheticWaveform', () => {
  it('generates waveform with correct duration', () => {
    const waveform = generateSyntheticWaveform(7.5, 4000);
    const expectedBuckets = Math.ceil(7.5 * 3600 / 2);
    expect(waveform.flow.length).toBe(expectedBuckets);
    expect(waveform.durationSeconds).toBe(7.5 * 3600);
  });

  it('generates matching pressure data', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    expect(waveform.pressure.length).toBe(waveform.flow.length);
  });

  it('generates RERA events matching reraCount', () => {
    const waveform = generateSyntheticWaveform(8, 4000, { reraCount: 15 });
    const reraEvents = waveform.events.filter((e) => e.type === 'rera');
    expect(reraEvents.length).toBe(15);
  });

  it('generates events sorted by start time', () => {
    const waveform = generateSyntheticWaveform(8, 4000, { reraCount: 20, flPct: 30 });
    for (let i = 1; i < waveform.events.length; i++) {
      expect(waveform.events[i].startSec).toBeGreaterThanOrEqual(waveform.events[i - 1].startSec);
    }
  });

  it('sets breath count from input', () => {
    const waveform = generateSyntheticWaveform(7, 3500);
    expect(waveform.stats.breathCount).toBe(3500);
  });

  it('generates flow values in realistic range', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    for (const p of waveform.flow) {
      expect(p.max).toBeLessThan(60);  // Max realistic flow
      expect(p.min).toBeGreaterThan(-50);  // Min realistic flow
    }
  });

  it('respects pressure settings', () => {
    const waveform = generateSyntheticWaveform(1, 500, { epap: 12, ipap: 20 });
    const pressureValues = waveform.pressure.map((p) => p.avg);
    const min = Math.min(...pressureValues);
    const max = Math.max(...pressureValues);
    // Pressure should be roughly in the EPAP-IPAP range
    expect(min).toBeGreaterThanOrEqual(10); // Some margin below EPAP
    expect(max).toBeLessThanOrEqual(22); // Some margin above IPAP
  });

  it('handles edge case of zero breath count', () => {
    // Should not crash
    const waveform = generateSyntheticWaveform(1, 0, { reraCount: 0 });
    expect(waveform.flow.length).toBeGreaterThan(0);
  });

  it('handles very short duration', () => {
    const waveform = generateSyntheticWaveform(0.01, 10);
    expect(waveform.flow.length).toBeGreaterThan(0);
    expect(waveform.durationSeconds).toBeCloseTo(36, 0);
  });
});

// ── formatElapsedTime ───────────────────────────────────────

describe('formatElapsedTime', () => {
  it('formats 0 seconds', () => {
    expect(formatElapsedTime(0)).toBe('0:00:00');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatElapsedTime(3661)).toBe('1:01:01');
  });

  it('formats large durations', () => {
    expect(formatElapsedTime(28800)).toBe('8:00:00');
  });

  it('pads minutes and seconds', () => {
    expect(formatElapsedTime(65)).toBe('0:01:05');
  });
});

describe('formatElapsedTimeShort', () => {
  it('formats as H:MM', () => {
    expect(formatElapsedTimeShort(3660)).toBe('1:01');
  });

  it('formats 0', () => {
    expect(formatElapsedTimeShort(0)).toBe('0:00');
  });

  it('formats 8 hours', () => {
    expect(formatElapsedTimeShort(28800)).toBe('8:00');
  });
});
