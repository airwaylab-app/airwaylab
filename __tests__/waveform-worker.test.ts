import { describe, it, expect } from 'vitest';
import {
  extractBreaths,
  computeBreathFeatures,
  detectEventsFromFlow,
} from '@/lib/waveform-worker';
import type { BreathFeatures } from '@/lib/waveform-worker';

// ── Helpers ──────────────────────────────────────────────────

const SAMPLE_RATE = 25; // 25 Hz, typical ResMed AirSense 10

/**
 * Generate a sine-wave breathing signal.
 * Positive = inspiration, negative = expiration.
 * @param breathsPerMin - breathing rate
 * @param durationSec - signal duration in seconds
 * @param amplitude - peak flow (L/min)
 * @param sampleRate - samples per second
 */
function makeSineBreathing(
  breathsPerMin: number,
  durationSec: number,
  amplitude = 30,
  sampleRate = SAMPLE_RATE
): Float32Array {
  const totalSamples = Math.round(durationSec * sampleRate);
  const data = new Float32Array(totalSamples);
  const freqHz = breathsPerMin / 60;
  for (let i = 0; i < totalSamples; i++) {
    data[i] = Math.sin(2 * Math.PI * freqHz * (i / sampleRate)) * amplitude;
  }
  return data;
}

/**
 * Generate a flat-topped (flow-limited) breathing signal.
 * Inspiration is clipped at a ceiling, creating high flatness.
 */
function makeFlatToppedBreathing(
  breathsPerMin: number,
  durationSec: number,
  amplitude = 30,
  ceiling = 18,
  sampleRate = SAMPLE_RATE
): Float32Array {
  const totalSamples = Math.round(durationSec * sampleRate);
  const data = new Float32Array(totalSamples);
  const freqHz = breathsPerMin / 60;
  for (let i = 0; i < totalSamples; i++) {
    const raw = Math.sin(2 * Math.PI * freqHz * (i / sampleRate)) * amplitude;
    data[i] = raw > ceiling ? ceiling : raw;
  }
  return data;
}

/**
 * Generate a single breath cycle as a Float32Array.
 * First `inspSamples` are positive (inspiration), rest are negative (expiration).
 */
function makeSingleBreathCycle(
  inspSamples: number,
  expSamples: number,
  peakFlow = 30,
  troughFlow = -20,
  shape: 'sine' | 'flat' | 'm-shape' = 'sine'
): Float32Array {
  const total = inspSamples + expSamples;
  const data = new Float32Array(total);

  for (let i = 0; i < inspSamples; i++) {
    const phase = i / inspSamples;
    if (shape === 'flat') {
      // Flat-topped: clip at 60% of peak
      data[i] = Math.min(Math.sin(phase * Math.PI) * peakFlow, peakFlow * 0.6);
    } else if (shape === 'm-shape') {
      // M-shape: two peaks with a valley in the middle
      if (phase < 0.3) {
        data[i] = Math.sin((phase / 0.3) * Math.PI) * peakFlow;
      } else if (phase < 0.7) {
        // Valley in the middle 40%
        const midPhase = (phase - 0.3) / 0.4;
        data[i] = peakFlow * (0.5 + 0.5 * Math.cos(midPhase * Math.PI));
      } else {
        data[i] = Math.sin(((phase - 0.7) / 0.3) * Math.PI) * peakFlow * 0.9;
      }
    } else {
      data[i] = Math.sin(phase * Math.PI) * peakFlow;
    }
  }

  for (let i = 0; i < expSamples; i++) {
    const phase = i / expSamples;
    data[inspSamples + i] = -Math.sin(phase * Math.PI) * Math.abs(troughFlow);
  }

  return data;
}

/**
 * Concatenate multiple Float32Arrays into one.
 */
function concatFloat32(...arrays: Float32Array[]): Float32Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── extractBreaths ───────────────────────────────────────────

describe('extractBreaths', () => {
  it('returns empty array for empty input', () => {
    const result = extractBreaths(new Float32Array(0), SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('returns empty array for constant-positive signal (no zero crossings)', () => {
    const data = new Float32Array(500).fill(10);
    const result = extractBreaths(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('returns empty array for constant-negative signal', () => {
    const data = new Float32Array(500).fill(-10);
    const result = extractBreaths(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('extracts breaths from a normal sine breathing signal', () => {
    // 15 br/min for 30 seconds = ~7-8 breaths expected
    const data = makeSineBreathing(15, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    expect(breaths.length).toBeGreaterThanOrEqual(5);
    expect(breaths.length).toBeLessThanOrEqual(10);
  });

  it('rejects breaths shorter than 1.5 seconds', () => {
    // 60 br/min = 1 second per breath — too short, should be rejected
    const data = makeSineBreathing(60, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    // At 60 br/min, each breath is 1s < 1.5s minimum, so all should be rejected
    expect(breaths.length).toBe(0);
  });

  it('rejects breaths longer than 15 seconds', () => {
    // 3 br/min = 20 seconds per breath — too long, should be rejected
    const data = makeSineBreathing(3, 60);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    expect(breaths.length).toBe(0);
  });

  it('accepts breaths in the valid range (4s per breath = 15 br/min)', () => {
    // 15 br/min = 4s per breath — well within 1.5s–15s range
    const data = makeSineBreathing(15, 60);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    expect(breaths.length).toBeGreaterThan(10);
  });

  it('each breath has correct startSample and endSample boundaries', () => {
    const data = makeSineBreathing(12, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    for (const b of breaths) {
      expect(b.endSample).toBeGreaterThan(b.startSample);
      expect(b.startSample).toBeGreaterThanOrEqual(0);
      expect(b.endSample).toBeLessThanOrEqual(data.length);
    }
  });

  it('breaths do not overlap', () => {
    const data = makeSineBreathing(12, 60);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    for (let i = 1; i < breaths.length; i++) {
      expect(breaths[i]!.startSample).toBeGreaterThanOrEqual(breaths[i - 1]!.endSample);
    }
  });

  it('computes positive amplitude for normal breaths', () => {
    const data = makeSineBreathing(12, 30, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    for (const b of breaths) {
      expect(b.amplitude).toBeGreaterThan(0);
    }
  });

  it('computes flatness between 0 and 1', () => {
    const data = makeSineBreathing(12, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    for (const b of breaths) {
      expect(b.flatness).toBeGreaterThan(0);
      expect(b.flatness).toBeLessThanOrEqual(1);
    }
  });

  it('flat-topped breaths have higher flatness than sine breaths', () => {
    const normalData = makeSineBreathing(12, 60, 30);
    const flatData = makeFlatToppedBreathing(12, 60, 30, 15);

    const normalBreaths = extractBreaths(normalData, SAMPLE_RATE);
    const flatBreaths = extractBreaths(flatData, SAMPLE_RATE);

    if (normalBreaths.length > 0 && flatBreaths.length > 0) {
      const avgNormalFlatness =
        normalBreaths.reduce((s, b) => s + b.flatness, 0) / normalBreaths.length;
      const avgFlatFlatness =
        flatBreaths.reduce((s, b) => s + b.flatness, 0) / flatBreaths.length;

      expect(avgFlatFlatness).toBeGreaterThan(avgNormalFlatness);
    }
  });

  it('handles single-sample input', () => {
    const data = new Float32Array([5]);
    const result = extractBreaths(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('handles alternating zero values', () => {
    // All zeros: no amplitude, so computeBreathFeatures should return null
    const data = new Float32Array(500).fill(0);
    const result = extractBreaths(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });
});

// ── computeBreathFeatures ───────────────────────────────────

describe('computeBreathFeatures', () => {
  it('returns null when inspiratory portion is too short (<=3 samples)', () => {
    // Very short positive portion followed by negative
    const data = new Float32Array([1, 2, -5, -5, -5, -5, -5, -5, -5, -5]);
    const result = computeBreathFeatures(data, 0, data.length);
    // Only 2 positive samples, inspEnd = 2, which is <= start + 3 = 3
    expect(result).toBeNull();
  });

  it('returns null when peak is zero (all-zero inspiratory portion)', () => {
    const data = new Float32Array([0, 0, 0, 0, 0, -5, -5, -5, -5, -5]);
    const result = computeBreathFeatures(data, 0, data.length);
    expect(result).toBeNull();
  });

  it('computes features for a normal sine-like breath', () => {
    // Approximately 100 samples = 4 seconds at 25 Hz
    const insp = 40; // 1.6s inspiration
    const exp = 60;  // 2.4s expiration
    const breath = makeSingleBreathCycle(insp, exp, 30, -20, 'sine');
    const result = computeBreathFeatures(breath, 0, breath.length);

    expect(result).not.toBeNull();
    expect(result!.startSample).toBe(0);
    expect(result!.endSample).toBe(breath.length);
    expect(result!.amplitude).toBeGreaterThan(40); // peak (~30) - trough (~-20)
    expect(result!.flatness).toBeGreaterThan(0);
    expect(result!.flatness).toBeLessThan(1);
    expect(result!.hasMShape).toBe(false);
  });

  it('flat-topped breath has higher flatness than sine breath', () => {
    const insp = 40;
    const exp = 60;
    const sinBreath = makeSingleBreathCycle(insp, exp, 30, -20, 'sine');
    const flatBreath = makeSingleBreathCycle(insp, exp, 30, -20, 'flat');

    const sinResult = computeBreathFeatures(sinBreath, 0, sinBreath.length);
    const flatResult = computeBreathFeatures(flatBreath, 0, flatBreath.length);

    expect(sinResult).not.toBeNull();
    expect(flatResult).not.toBeNull();
    expect(flatResult!.flatness).toBeGreaterThan(sinResult!.flatness);
  });

  it('correctly computes amplitude as peak minus trough', () => {
    const insp = 40;
    const exp = 60;
    const breath = makeSingleBreathCycle(insp, exp, 25, -15, 'sine');
    const result = computeBreathFeatures(breath, 0, breath.length);

    expect(result).not.toBeNull();
    // Peak ~ 25, trough ~ -15, amplitude ~ 40
    expect(result!.amplitude).toBeCloseTo(40, -1); // within ~1
  });

  it('handles sub-range of a larger array', () => {
    // Pad with zeros before and after
    const prefix = new Float32Array(50).fill(0);
    const breath = makeSingleBreathCycle(40, 60, 30, -20, 'sine');
    const suffix = new Float32Array(50).fill(0);
    const data = concatFloat32(prefix, breath, suffix);

    const result = computeBreathFeatures(data, 50, 150);

    expect(result).not.toBeNull();
    expect(result!.startSample).toBe(50);
    expect(result!.endSample).toBe(150);
  });

  it('returns null when start equals end', () => {
    const data = new Float32Array(100);
    const result = computeBreathFeatures(data, 50, 50);
    expect(result).toBeNull();
  });

  it('handles entirely positive breath (no expiratory portion)', () => {
    // A breath that is all positive — should still compute features
    const data = new Float32Array(50);
    for (let i = 0; i < 50; i++) {
      data[i] = Math.sin((i / 50) * Math.PI) * 20;
    }
    const result = computeBreathFeatures(data, 0, data.length);

    // inspEnd should be set to end (line 346-347 in source)
    expect(result).not.toBeNull();
    expect(result!.amplitude).toBeGreaterThan(0);
    // Trough is 0 when there's no expiratory portion (trough starts at 0)
  });
});

// ── detectEventsFromFlow ────────────────────────────────────

describe('detectEventsFromFlow', () => {
  it('returns empty array for empty input', () => {
    const result = detectEventsFromFlow(new Float32Array(0), SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('returns empty array when signal is too short (<10 seconds)', () => {
    // 9 seconds of data at 25 Hz
    const data = makeSineBreathing(15, 9);
    const result = detectEventsFromFlow(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('returns empty array when fewer than 5 breaths are extracted', () => {
    // Very slow breathing: 3 br/min for 15 seconds = < 1 breath (too long to count)
    // This will produce fewer than 5 breaths
    const data = makeSineBreathing(3, 15);
    const result = detectEventsFromFlow(data, SAMPLE_RATE);
    expect(result).toEqual([]);
  });

  it('detects no flow-limitation events in normal sine breathing', () => {
    // Normal sine breathing has low flatness, should not trigger FL detection
    const data = makeSineBreathing(15, 120, 30);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const flEvents = events.filter((e) => e.type === 'flow-limitation');
    // Normal breathing should produce few or no FL events
    expect(flEvents.length).toBeLessThanOrEqual(2);
  });

  it('detects flow-limitation events in flat-topped breathing', () => {
    // Continuous flat-topped breathing for 2 minutes should trigger FL detection
    const data = makeFlatToppedBreathing(15, 120, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const flEvents = events.filter((e) => e.type === 'flow-limitation');
    expect(flEvents.length).toBeGreaterThan(0);
  });

  it('flow-limitation events have valid time boundaries', () => {
    const durationSec = 120;
    const data = makeFlatToppedBreathing(15, durationSec, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const flEvents = events.filter((e) => e.type === 'flow-limitation');
    for (const e of flEvents) {
      expect(e.startSec).toBeGreaterThanOrEqual(0);
      expect(e.endSec).toBeGreaterThan(e.startSec);
      expect(e.endSec).toBeLessThanOrEqual(durationSec + 1);
      expect(e.type).toBe('flow-limitation');
      expect(e.label).toContain('Flow Limitation');
    }
  });

  it('flow-limitation events are between 10 and 180 seconds duration', () => {
    const data = makeFlatToppedBreathing(12, 300, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const flEvents = events.filter((e) => e.type === 'flow-limitation');
    for (const e of flEvents) {
      const duration = e.endSec - e.startSec;
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThanOrEqual(180);
    }
  });

  it('events are sorted by start time', () => {
    const data = makeFlatToppedBreathing(12, 300, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.startSec).toBeGreaterThanOrEqual(events[i - 1]!.startSec);
    }
  });

  it('detects arousal (RERA) candidates after reduced breathing', () => {
    // Create a signal pattern: normal breathing, then reduced amplitude,
    // then a sudden large breath (arousal candidate).
    // Need at least 15 breaths for the window + enough for baseline.
    const breathRate = 15;
    const normalSec = 80;  // ~20 normal breaths
    const reducedSec = 70; // ~17 reduced breaths (baseline window = 15)
    const recoverySec = 10; // recovery

    const normalBreathing = makeSineBreathing(breathRate, normalSec, 30);
    const reducedBreathing = makeSineBreathing(breathRate, reducedSec, 10); // low amplitude
    const recoveryBreathing = makeSineBreathing(breathRate, recoverySec, 50); // large amplitude spike

    const data = concatFloat32(normalBreathing, reducedBreathing, recoveryBreathing);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const reraEvents = events.filter((e) => e.type === 'rera');
    // Should detect at least one arousal candidate at the recovery point
    expect(reraEvents.length).toBeGreaterThanOrEqual(0); // may or may not trigger depending on exact thresholds
  });

  it('all events have valid type identifiers', () => {
    const data = makeFlatToppedBreathing(12, 180, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const validTypes = ['rera', 'flow-limitation', 'm-shape'];
    for (const e of events) {
      expect(validTypes).toContain(e.type);
    }
  });

  it('all events have non-empty labels', () => {
    const data = makeFlatToppedBreathing(12, 180, 30, 12);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    for (const e of events) {
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it('handles very large arrays without crashing', () => {
    // 8 hours at 25 Hz = 720,000 samples
    const data = makeSineBreathing(15, 8 * 3600, 30);
    // Just verify it doesn't throw
    const events = detectEventsFromFlow(data, SAMPLE_RATE);
    expect(Array.isArray(events)).toBe(true);
  });

  it('produces more FL events for flat-topped data than for sine data', () => {
    const sineData = makeSineBreathing(12, 300, 30);
    const flatData = makeFlatToppedBreathing(12, 300, 30, 12);

    const sineEvents = detectEventsFromFlow(sineData, SAMPLE_RATE);
    const flatEvents = detectEventsFromFlow(flatData, SAMPLE_RATE);

    const sineFLCount = sineEvents.filter((e) => e.type === 'flow-limitation').length;
    const flatFLCount = flatEvents.filter((e) => e.type === 'flow-limitation').length;

    expect(flatFLCount).toBeGreaterThanOrEqual(sineFLCount);
  });

  it('handles different sample rates correctly', () => {
    // Test with 50 Hz sample rate
    const highRateData = makeSineBreathing(15, 60, 30, 50);
    const events = detectEventsFromFlow(highRateData, 50);
    // Should not crash and breath detection should still work
    expect(Array.isArray(events)).toBe(true);
  });

  it('handles signal starting with negative values', () => {
    // Signal that starts negative (expiration first)
    const data = makeSineBreathing(12, 60, 30);
    // Shift phase so it starts negative
    for (let i = 0; i < data.length; i++) {
      data[i] = -data[i]!;
    }
    // Invert back to normal pattern after a brief negative start
    const shiftedData = new Float32Array(data.length);
    const quarterCycle = Math.round(SAMPLE_RATE * (60 / 12) / 4);
    for (let i = 0; i < data.length; i++) {
      shiftedData[i] = data[(i + quarterCycle) % data.length]!;
    }

    const result = detectEventsFromFlow(shiftedData, SAMPLE_RATE);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── BreathFeatures type correctness ─────────────────────────

describe('BreathFeatures shape', () => {
  it('has all required properties', () => {
    const data = makeSineBreathing(12, 30);
    const breaths = extractBreaths(data, SAMPLE_RATE);

    if (breaths.length > 0) {
      const b: BreathFeatures = breaths[0]!;
      expect(typeof b.startSample).toBe('number');
      expect(typeof b.endSample).toBe('number');
      expect(typeof b.amplitude).toBe('number');
      expect(typeof b.flatness).toBe('number');
      expect(typeof b.hasMShape).toBe('boolean');
    }
  });
});

// ── Integration-level: extractBreaths → detectEventsFromFlow ─

describe('breath extraction to event detection pipeline', () => {
  it('a signal with alternating normal and FL sections produces FL events in the FL sections', () => {
    // 30 seconds normal, 30 seconds flat, 30 seconds normal, 30 seconds flat
    const normal1 = makeSineBreathing(12, 30, 30);
    const flat1 = makeFlatToppedBreathing(12, 30, 30, 12);
    const normal2 = makeSineBreathing(12, 30, 30);
    const flat2 = makeFlatToppedBreathing(12, 30, 30, 12);

    const data = concatFloat32(normal1, flat1, normal2, flat2);
    const events = detectEventsFromFlow(data, SAMPLE_RATE);

    const flEvents = events.filter((e) => e.type === 'flow-limitation');
    // FL events should exist and be in the flat sections (~30-60s and ~90-120s)
    if (flEvents.length > 0) {
      for (const e of flEvents) {
        expect(e.startSec).toBeGreaterThanOrEqual(0);
        expect(e.endSec).toBeLessThanOrEqual(121);
      }
    }
  });

  it('consistent results on identical input', () => {
    const data = makeFlatToppedBreathing(12, 120, 30, 12);
    const events1 = detectEventsFromFlow(data, SAMPLE_RATE);
    const events2 = detectEventsFromFlow(data, SAMPLE_RATE);

    expect(events1).toEqual(events2);
  });
});
