import { describe, it, expect } from 'vitest';
import {
  decimateFlow,
  decimateFlowRange,
  decimatePressure,
  decimatePressureRange,
  computeFlowStats,
  computeFlowStatsFromRaw,
  generateSyntheticWaveform,
  sliceByTime,
  getTargetRate,
  formatElapsedTime,
  formatElapsedTimeShort,
  formatWallClockTime,
  downsampleFlow,
  downsamplePressure,
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

// ── formatWallClockTime ─────────────────────────────────────

describe('formatWallClockTime', () => {
  it('falls back to elapsed-only when recordingDate is null', () => {
    expect(formatWallClockTime(null, 3661)).toBe('1:01:01');
  });

  it('falls back to elapsed-only when recordingDate is undefined', () => {
    expect(formatWallClockTime(undefined, 65)).toBe('0:01:05');
  });

  it('includes wall-clock and elapsed label for sub-hour elapsed', () => {
    // 11:00 PM start + 30 minutes elapsed = 11:30 PM
    const start = new Date('2026-05-11T23:00:00');
    const result = formatWallClockTime(start, 1800);
    expect(result).toContain('30m in');
    // Should contain a time string (locale-dependent format)
    expect(result).toMatch(/\d+:\d{2}/);
  });

  it('includes hours and minutes in elapsed label for multi-hour elapsed', () => {
    const start = new Date('2026-05-11T22:00:00');
    const result = formatWallClockTime(start, 3600 * 3 + 60 * 15); // 3h 15m in
    expect(result).toContain('3h 15m in');
  });

  it('wall-clock time reflects correct offset from recording start', () => {
    // Use a fixed timezone-safe check: the offset in ms should match
    const start = new Date('2026-05-11T22:00:00');
    const elapsedSec = 11700; // 3h 15m = 11700s
    const expected = new Date(start.getTime() + elapsedSec * 1000);
    const result = formatWallClockTime(start, elapsedSec);
    expect(result).toContain('3h 15m in');
    const expectedTime = expected.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    expect(result).toContain(expectedTime);
  });
});
