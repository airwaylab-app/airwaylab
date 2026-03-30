import { describe, it, expect } from 'vitest';
import {
  decimateFlow,
  decimateFlowRange,
  decimatePressure,
  decimatePressureRange,
  computeFlowStats,
  computeFlowStatsFromRaw,
  computeTidalVolume,
  computeRespiratoryRate,
  generateSyntheticWaveform,
  sliceByTime,
  getTargetRate,
  formatElapsedTime,
  formatElapsedTimeShort,
  downsampleFlow,
  downsamplePressure,
  detectMShapeInWorker,
} from '@/lib/waveform-utils';
import type { FlowSample, PressurePoint } from '@/lib/waveform-types';

// ── decimateFlow ──────────────────────────────────────────

describe('decimateFlow', () => {
  it('returns empty array for empty input', () => {
    expect(decimateFlow(new Float32Array(0), 25, 5)).toEqual([]);
  });

  it('returns empty array for zero sample rate', () => {
    expect(decimateFlow(new Float32Array([1, 2, 3]), 0, 5)).toEqual([]);
  });

  it('returns empty array for negative sample rate', () => {
    expect(decimateFlow(new Float32Array([1, 2, 3]), -1, 5)).toEqual([]);
  });

  it('takes every Nth sample with correct timestamps', () => {
    // 25 Hz, target 5 Hz → step = 5, take every 5th sample
    const data = new Float32Array(25);
    for (let i = 0; i < 25; i++) data[i] = i * 10;

    const result = decimateFlow(data, 25, 5);

    // Should take indices 0, 5, 10, 15, 20 → 5 samples
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ t: 0, value: 0 });
    expect(result[1]).toEqual({ t: 0.2, value: 50 });
    expect(result[2]).toEqual({ t: 0.4, value: 100 });
    expect(result[3]).toEqual({ t: 0.6, value: 150 });
    expect(result[4]).toEqual({ t: 0.8, value: 200 });
  });

  it('returns all samples when targetRate equals sampleRate', () => {
    const data = new Float32Array([1, 2, 3, 4, 5]);
    const result = decimateFlow(data, 25, 25);

    expect(result).toHaveLength(5);
    expect(result[0]!.value).toBe(1);
    expect(result[4]!.value).toBe(5);
  });

  it('output length equals ceil(input.length / step)', () => {
    const data = new Float32Array(100);
    const result = decimateFlow(data, 25, 1); // step = 25
    expect(result).toHaveLength(Math.ceil(100 / 25)); // 4
  });

  it('handles single sample', () => {
    const data = new Float32Array([42]);
    const result = decimateFlow(data, 25, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBe(42);
    expect(result[0]!.t).toBe(0);
  });

  it('preserves actual measured values (not computed aggregates)', () => {
    // Each output value should be exactly a value from the input
    const data = new Float32Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const result = decimateFlow(data, 10, 2); // step = 5

    for (const sample of result) {
      const idx = Math.round(sample.t * 10);
      expect(sample.value).toBe(data[idx]);
    }
  });
});

// ── decimateFlowRange ──────────────────────────────────────

describe('decimateFlowRange', () => {
  it('returns empty for empty input', () => {
    expect(decimateFlowRange(new Float32Array(0), 25, 0, 10, 5)).toEqual([]);
  });

  it('decimates only the specified time range', () => {
    // 25 Hz, 4 seconds = 100 samples
    const data = new Float32Array(100);
    for (let i = 0; i < 100; i++) data[i] = i;

    // Request range 1s to 3s at 5 Hz (step = 5)
    const result = decimateFlowRange(data, 25, 1, 3, 5);

    // All timestamps should be within [1, 3] range
    for (const s of result) {
      expect(s.t).toBeGreaterThanOrEqual(0.8); // aligned start might be slightly before
      expect(s.t).toBeLessThanOrEqual(3);
    }
    // Should have roughly 2 seconds * 5 Hz = 10 points (±1 due to alignment)
    expect(result.length).toBeGreaterThan(5);
    expect(result.length).toBeLessThanOrEqual(15);
  });
});

// ── decimatePressure ────────────────────────────────────────

describe('decimatePressure', () => {
  it('returns empty array for empty input', () => {
    expect(decimatePressure(new Float32Array(0), 25, 5)).toEqual([]);
  });

  it('takes every Nth pressure sample', () => {
    const data = new Float32Array(10);
    for (let i = 0; i < 10; i++) data[i] = 10 + i * 0.5;

    const result = decimatePressure(data, 10, 2); // step = 5
    expect(result).toHaveLength(2);
    expect(result[0]!.avg).toBe(10);
    expect(result[1]!.avg).toBe(12.5);
  });
});

// ── decimatePressureRange ──────────────────────────────────

describe('decimatePressureRange', () => {
  it('returns empty for empty input', () => {
    expect(decimatePressureRange(new Float32Array(0), 25, 0, 10, 5)).toEqual([]);
  });
});

// ── sliceByTime ─────────────────────────────────────────────

describe('sliceByTime', () => {
  it('returns empty for empty input', () => {
    expect(sliceByTime([], 0, 10)).toEqual([]);
  });

  it('slices by time range using binary search', () => {
    const data = [
      { t: 0 }, { t: 1 }, { t: 2 }, { t: 3 }, { t: 4 },
      { t: 5 }, { t: 6 }, { t: 7 }, { t: 8 }, { t: 9 },
    ];

    const result = sliceByTime(data, 3, 7);
    expect(result).toHaveLength(5); // t=3,4,5,6,7
    expect(result[0]!.t).toBe(3);
    expect(result[result.length - 1]!.t).toBe(7);
  });

  it('returns empty when range has no points', () => {
    const data = [{ t: 0 }, { t: 1 }, { t: 5 }, { t: 6 }];
    const result = sliceByTime(data, 2, 4);
    expect(result).toHaveLength(0);
  });

  it('handles exact boundary matches', () => {
    const data = [{ t: 0 }, { t: 1 }, { t: 2 }, { t: 3 }];
    const result = sliceByTime(data, 0, 3);
    expect(result).toHaveLength(4);
  });
});

// ── getTargetRate ───────────────────────────────────────────

describe('getTargetRate', () => {
  it('returns full rate for < 5 min', () => {
    expect(getTargetRate(299, 25)).toBe(25);
    expect(getTargetRate(60, 25)).toBe(25);
  });

  it('returns 5 Hz for 5–30 min', () => {
    expect(getTargetRate(300, 25)).toBe(25); // exactly 5 min → full
    expect(getTargetRate(301, 25)).toBe(5);
    expect(getTargetRate(1800, 25)).toBe(5);
  });

  it('returns 2 Hz for 30 min–2h', () => {
    expect(getTargetRate(1801, 25)).toBe(2);
    expect(getTargetRate(3600, 25)).toBe(2); // 1h
    expect(getTargetRate(7200, 25)).toBe(2);
  });

  it('returns 1 Hz for > 2h', () => {
    expect(getTargetRate(7201, 25)).toBe(1);
    expect(getTargetRate(28800, 25)).toBe(1); // 8h
  });
});

// ── computeFlowStats (FlowSample[]) ────────────────────────

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
    const flow: FlowSample[] = [
      { t: 0, value: 20 },    // positive
      { t: 2, value: 25 },    // positive
      { t: 4, value: -15 },   // negative (1 crossing)
      { t: 6, value: -10 },   // negative
      { t: 8, value: 20 },    // positive (2 crossings)
      { t: 10, value: -15 },  // negative (3 crossings)
      { t: 12, value: 18 },   // positive (4 crossings)
    ];
    const stats = computeFlowStats(flow, []);

    expect(stats.flowMin).toBe(-15);
    expect(stats.flowMax).toBe(25);
    expect(stats.breathCount).toBe(2); // 4 crossings / 2
    expect(stats.pressureMin).toBeNull();
    expect(stats.pressureMax).toBeNull();
  });

  it('computes pressure range when available', () => {
    const flow: FlowSample[] = [{ t: 0, value: 10 }];
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

// ── computeFlowStatsFromRaw ────────────────────────────────

describe('computeFlowStatsFromRaw', () => {
  it('returns zeros for empty flow', () => {
    const stats = computeFlowStatsFromRaw(new Float32Array(0), 25, null);
    expect(stats.breathCount).toBe(0);
    expect(stats.flowMin).toBe(0);
    expect(stats.flowMax).toBe(0);
  });

  it('applies refractory period to prevent high RR', () => {
    // Create a signal with rapid oscillations (e.g. noise at 2 Hz = every 0.5s)
    // At 25 Hz, 0.5s = 12.5 samples per cycle
    // Without refractory period: many crossings
    // With 1.5s refractory: only crossings 1.5s+ apart count
    const sampleRate = 25;
    const duration = 30; // 30 seconds
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);

    // Create a 2 Hz signal (too fast to be real breathing)
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 2 * i / sampleRate) * 20;
    }

    const stats = computeFlowStatsFromRaw(data, sampleRate, null);
    // With 1.5s refractory, max ~40 br/min → over 30s, max ~20 breaths
    // A 2 Hz signal would give 60 crossings/min without refractory
    // With refractory, it should be capped at roughly 40/min → ~20 in 30s
    expect(stats.breathCount).toBeLessThanOrEqual(22);
  });

  it('counts breaths correctly for normal breathing rate', () => {
    // Normal breathing: ~15 br/min = 0.25 Hz
    const sampleRate = 25;
    const duration = 60; // 60 seconds
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);

    // 15 breaths/min = one breath every 4 seconds
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * (15 / 60) * i / sampleRate) * 20;
    }

    const stats = computeFlowStatsFromRaw(data, sampleRate, null);
    // Should count approximately 15 breaths
    expect(stats.breathCount).toBeGreaterThanOrEqual(13);
    expect(stats.breathCount).toBeLessThanOrEqual(17);
  });
});

// ── generateSyntheticWaveform ───────────────────────────────

describe('generateSyntheticWaveform', () => {
  it('returns a StoredWaveform with Float32Array flow data', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    expect(waveform.flow).toBeInstanceOf(Float32Array);
    expect(waveform.pressure).toBeInstanceOf(Float32Array);
    expect(waveform.sampleRate).toBe(25);
    expect(waveform.storedAt).toBeGreaterThan(0);
    expect(waveform.engineVersion).toBeTruthy();
  });

  it('generates correct number of raw samples', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    // 1 hour = 3600 seconds at 25 Hz = 90,000 samples
    expect(waveform.flow.length).toBe(3600 * 25);
    expect(waveform.pressure!.length).toBe(3600 * 25);
    expect(waveform.durationSeconds).toBe(3600);
  });

  it('generates RERA events matching reraCount', () => {
    const waveform = generateSyntheticWaveform(8, 4000, { reraCount: 15 });
    const reraEvents = waveform.events.filter((e) => e.type === 'rera');
    expect(reraEvents.length).toBe(15);
  });

  it('generates events sorted by start time', () => {
    const waveform = generateSyntheticWaveform(8, 4000, { reraCount: 20, flPct: 30 });
    for (let i = 1; i < waveform.events.length; i++) {
      expect(waveform.events[i]!.startSec).toBeGreaterThanOrEqual(waveform.events[i - 1]!.startSec);
    }
  });

  it('sets breath count from input', () => {
    const waveform = generateSyntheticWaveform(7, 3500);
    expect(waveform.stats.breathCount).toBe(3500);
  });

  it('generates flow values in realistic range', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < waveform.flow.length; i++) {
      if (waveform.flow[i]! < min) min = waveform.flow[i]!;
      if (waveform.flow[i]! > max) max = waveform.flow[i]!;
    }
    expect(max).toBeLessThan(60);
    expect(min).toBeGreaterThan(-50);
  });

  it('respects pressure settings', () => {
    const waveform = generateSyntheticWaveform(1, 500, { epap: 12, ipap: 20 });
    expect(waveform.pressure).not.toBeNull();
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < waveform.pressure!.length; i++) {
      if (waveform.pressure![i]! < min) min = waveform.pressure![i]!;
      if (waveform.pressure![i]! > max) max = waveform.pressure![i]!;
    }
    expect(min).toBeGreaterThanOrEqual(10);
    expect(max).toBeLessThanOrEqual(22);
  });

  it('handles edge case of zero breath count', () => {
    const waveform = generateSyntheticWaveform(1, 0, { reraCount: 0 });
    expect(waveform.flow.length).toBeGreaterThan(0);
  });

  it('handles very short duration', () => {
    const waveform = generateSyntheticWaveform(0.01, 10);
    expect(waveform.flow.length).toBeGreaterThan(0);
    expect(waveform.durationSeconds).toBeCloseTo(36, 0);
  });

  it('includes tidal volume and respiratory rate arrays', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    expect(Array.isArray(waveform.tidalVolume)).toBe(true);
    expect(Array.isArray(waveform.respiratoryRate)).toBe(true);
    expect(waveform.tidalVolume.length).toBeGreaterThan(0);
    expect(waveform.respiratoryRate.length).toBeGreaterThan(0);
  });

  it('includes leak data', () => {
    const waveform = generateSyntheticWaveform(1, 500);
    expect(Array.isArray(waveform.leak)).toBe(true);
    expect(waveform.leak.length).toBeGreaterThan(0);
  });
});

// ── Deprecated functions still work ────────────────────────

describe('downsampleFlow (deprecated)', () => {
  it('still produces WaveformPoint[] with min/max/avg', () => {
    const data = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const result = downsampleFlow(data, 5, 2);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('min');
    expect(result[0]).toHaveProperty('max');
    expect(result[0]).toHaveProperty('avg');
  });
});

describe('downsamplePressure (deprecated)', () => {
  it('still produces PressurePoint[] with avg', () => {
    const data = new Float32Array([10, 12, 14, 10, 12, 14, 10, 12, 14, 10]);
    const result = downsamplePressure(data, 5, 2);
    expect(result).toHaveLength(1);
    expect(result[0]!.avg).toBeCloseTo(11.8, 1);
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

// ── computeTidalVolume ─────────────────────────────────────

describe('computeTidalVolume', () => {
  it('returns empty for empty input', () => {
    expect(computeTidalVolume(new Float32Array(0), 25)).toEqual([]);
  });

  it('returns empty for zero sample rate', () => {
    expect(computeTidalVolume(new Float32Array([1, 2, 3]), 0)).toEqual([]);
  });

  it('returns empty for negative sample rate', () => {
    expect(computeTidalVolume(new Float32Array([1, 2, 3]), -1)).toEqual([]);
  });

  it('produces tidal volume points from a sine wave signal', () => {
    // Normal breathing: ~15 br/min = 0.25 Hz, 60 seconds at 25 Hz
    const sampleRate = 25;
    const duration = 60;
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);
    const breathFreq = 15 / 60; // 0.25 Hz

    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * breathFreq * i / sampleRate) * 30;
    }

    const result = computeTidalVolume(data, sampleRate);
    expect(result.length).toBeGreaterThan(0);
    // Each point should have t and avg
    for (const p of result) {
      expect(typeof p.t).toBe('number');
      expect(typeof p.avg).toBe('number');
      expect(p.t).toBeGreaterThanOrEqual(0);
    }
  });

  it('respects custom bucket size', () => {
    const sampleRate = 25;
    const duration = 60;
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 0.25 * i / sampleRate) * 30;
    }

    const bucket2 = computeTidalVolume(data, sampleRate, 2);
    const bucket5 = computeTidalVolume(data, sampleRate, 5);

    // Larger buckets = fewer points
    expect(bucket5.length).toBeLessThan(bucket2.length);
    // 60s / 2s = 30 buckets, 60s / 5s = 12 buckets
    expect(bucket2.length).toBe(30);
    expect(bucket5.length).toBe(12);
  });

  it('filters out unrealistically short and long breaths', () => {
    // Very rapid oscillation at 5 Hz → breath duration ~0.2s, well below 1.5s minimum
    const sampleRate = 25;
    const duration = 10;
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 5 * i / sampleRate) * 20;
    }

    const result = computeTidalVolume(data, sampleRate);
    // All TV values should be 0 because breaths are too short (< 1.5s)
    for (const p of result) {
      expect(p.avg).toBe(0);
    }
  });

  it('handles single sample', () => {
    const data = new Float32Array([42]);
    const result = computeTidalVolume(data, 25);
    expect(result.length).toBe(1);
    expect(result[0]!.t).toBe(0);
  });
});

// ── computeRespiratoryRate ──────────────────────────────────

describe('computeRespiratoryRate', () => {
  it('returns empty for empty input', () => {
    expect(computeRespiratoryRate(new Float32Array(0), 25)).toEqual([]);
  });

  it('returns empty for zero sample rate', () => {
    expect(computeRespiratoryRate(new Float32Array([1, 2, 3]), 0)).toEqual([]);
  });

  it('returns empty for negative sample rate', () => {
    expect(computeRespiratoryRate(new Float32Array([1, 2, 3]), -1)).toEqual([]);
  });

  it('estimates correct RR for a known breathing frequency', () => {
    // 15 breaths/min = 0.25 Hz, need enough duration for the 30s window
    const sampleRate = 25;
    const duration = 120; // 2 minutes for stable measurement
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * (15 / 60) * i / sampleRate) * 25;
    }

    const result = computeRespiratoryRate(data, sampleRate);
    expect(result.length).toBeGreaterThan(0);

    // Mid-signal buckets should show ~15 br/min
    const midIdx = Math.floor(result.length / 2);
    expect(result[midIdx]!.avg).toBeGreaterThanOrEqual(12);
    expect(result[midIdx]!.avg).toBeLessThanOrEqual(18);
  });

  it('applies refractory period to cap high-frequency noise', () => {
    // 3 Hz oscillation: way too fast for real breathing
    const sampleRate = 25;
    const duration = 60;
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 3 * i / sampleRate) * 20;
    }

    const result = computeRespiratoryRate(data, sampleRate);
    // With 1.5s refractory, max ~40 br/min
    for (const p of result) {
      expect(p.avg).toBeLessThanOrEqual(42);
    }
  });

  it('respects custom bucket size', () => {
    const sampleRate = 25;
    const duration = 60;
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 0.25 * i / sampleRate) * 25;
    }

    const bucket2 = computeRespiratoryRate(data, sampleRate, 2);
    const bucket5 = computeRespiratoryRate(data, sampleRate, 5);

    expect(bucket5.length).toBeLessThan(bucket2.length);
  });

  it('handles single sample gracefully', () => {
    const data = new Float32Array([42]);
    const result = computeRespiratoryRate(data, 25);
    expect(result.length).toBe(1);
    expect(result[0]!.avg).toBe(0); // Not enough data for crossings
  });
});

// ── detectMShapeInWorker ──────────────────────────────────────

describe('detectMShapeInWorker', () => {
  it('returns false for arrays shorter than 12 samples', () => {
    const data = new Float32Array([10, 20, 15, 10, 20, 15, 10, 20, 15, 10, 20]);
    expect(detectMShapeInWorker(data, 20)).toBe(false);
  });

  it('detects M-shape when valley dips below 80% of peak in middle', () => {
    // Create an M-shape: two peaks with a valley in between
    const len = 24;
    const data = new Float32Array(len);
    const qPeak = 30;

    for (let i = 0; i < len; i++) {
      if (i < 6) {
        // Rising to first peak
        data[i] = (i / 5) * qPeak;
      } else if (i < 10) {
        // First peak
        data[i] = qPeak;
      } else if (i < 14) {
        // Valley in the middle (below 80% of qPeak = 24)
        data[i] = qPeak * 0.5; // 15, well below 24
      } else if (i < 18) {
        // Second peak
        data[i] = qPeak;
      } else {
        // Falling
        data[i] = qPeak * (1 - (i - 17) / 7);
      }
    }

    expect(detectMShapeInWorker(data, qPeak)).toBe(true);
  });

  it('returns false for normal inspiration (no valley)', () => {
    // Smooth sinusoidal inspiration -- no M-shape
    const len = 24;
    const data = new Float32Array(len);
    const qPeak = 30;

    for (let i = 0; i < len; i++) {
      data[i] = Math.sin((i / (len - 1)) * Math.PI) * qPeak;
    }

    expect(detectMShapeInWorker(data, qPeak)).toBe(false);
  });

  it('returns false when valley is above 80% threshold', () => {
    // Two peaks with a shallow dip (still above 80%)
    const len = 24;
    const data = new Float32Array(len);
    const qPeak = 30;

    for (let i = 0; i < len; i++) {
      if (i < 6) data[i] = (i / 5) * qPeak;
      else if (i < 10) data[i] = qPeak;
      else if (i < 14) data[i] = qPeak * 0.85; // Above 80% threshold
      else if (i < 18) data[i] = qPeak;
      else data[i] = qPeak * (1 - (i - 17) / 7);
    }

    expect(detectMShapeInWorker(data, qPeak)).toBe(false);
  });

  it('requires peaks on both sides of the valley', () => {
    // Valley in middle but left side never reaches above threshold
    const len = 24;
    const data = new Float32Array(len);
    const qPeak = 30;

    for (let i = 0; i < len; i++) {
      if (i < 12) data[i] = qPeak * 0.3; // Left side below threshold
      else if (i < 14) data[i] = qPeak * 0.5; // Valley
      else data[i] = qPeak; // Right side above threshold
    }

    expect(detectMShapeInWorker(data, qPeak)).toBe(false);
  });
});

// ── downsampleFlow min/max preservation ──────────────────────

describe('downsampleFlow min/max preservation', () => {
  it('preserves actual min and max values within each bucket', () => {
    // Create data where a spike exists within a bucket
    const sampleRate = 10;
    const bucketSeconds = 2; // 20 samples per bucket
    const data = new Float32Array(20);
    for (let i = 0; i < 20; i++) data[i] = 5;
    data[3] = -42; // spike low
    data[15] = 99; // spike high

    const result = downsampleFlow(data, sampleRate, bucketSeconds);
    expect(result).toHaveLength(1);
    expect(result[0]!.min).toBe(-42);
    expect(result[0]!.max).toBe(99);
  });

  it('computes correct avg for each bucket', () => {
    const data = new Float32Array([10, 20, 30, 40, 50]);
    const result = downsampleFlow(data, 5, 1); // 5 samples per bucket
    expect(result).toHaveLength(1);
    expect(result[0]!.avg).toBe(30); // (10+20+30+40+50)/5 = 30
  });

  it('handles multiple buckets', () => {
    const data = new Float32Array(20);
    // Bucket 1 (0-9): values 0-9
    // Bucket 2 (10-19): values 10-19
    for (let i = 0; i < 20; i++) data[i] = i;

    const result = downsampleFlow(data, 10, 1); // 10 samples per bucket
    expect(result).toHaveLength(2);
    expect(result[0]!.min).toBe(0);
    expect(result[0]!.max).toBe(9);
    expect(result[1]!.min).toBe(10);
    expect(result[1]!.max).toBe(19);
  });
});

// ── Large array handling ─────────────────────────────────────

describe('large array handling', () => {
  it('decimateFlow handles a large array (8h at 25 Hz)', () => {
    const sampleRate = 25;
    const duration = 8 * 3600; // 8 hours
    const totalSamples = sampleRate * duration;
    const data = new Float32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.sin(2 * Math.PI * 0.25 * i / sampleRate) * 30;
    }

    const result = decimateFlow(data, sampleRate, 1); // step = 25
    const expectedLength = Math.ceil(totalSamples / 25);
    expect(result).toHaveLength(expectedLength);
    // Verify first and last timestamps
    expect(result[0]!.t).toBe(0);
    expect(result[result.length - 1]!.t).toBeCloseTo(duration - 1, 0);
  });

  it('computeFlowStatsFromRaw handles large array with reservoir sampling', () => {
    // Create array larger than RESERVOIR_SIZE (50k)
    const sampleRate = 25;
    const totalSamples = 200_000;
    const flow = new Float32Array(totalSamples);
    const pressure = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      flow[i] = Math.sin(2 * Math.PI * 0.2 * i / sampleRate) * 25;
      pressure[i] = 12 + Math.sin(2 * Math.PI * 0.2 * i / sampleRate) * 2;
    }

    const stats = computeFlowStatsFromRaw(flow, sampleRate, pressure);
    expect(stats.flowMin).toBeLessThan(0);
    expect(stats.flowMax).toBeGreaterThan(0);
    expect(stats.pressureMin).not.toBeNull();
    expect(stats.pressureMax).not.toBeNull();
    expect(stats.pressureP10).not.toBeNull();
    expect(stats.pressureP90).not.toBeNull();
    // P10 should be less than P90
    expect(stats.pressureP10!).toBeLessThanOrEqual(stats.pressureP90!);
  });
});
