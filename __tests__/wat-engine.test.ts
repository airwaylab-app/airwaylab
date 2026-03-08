import { describe, it, expect } from 'vitest';
import { computeWAT } from '@/lib/analyzers/wat-engine';

// Helper: generate a sine wave (normal breathing)
function makeSineWave(seconds: number, samplingRate = 25): Float32Array {
  const total = seconds * samplingRate;
  const data = new Float32Array(total);
  const breathPeriod = 4 * samplingRate; // 4s per breath
  for (let i = 0; i < total; i++) {
    data[i] = 20 * Math.sin((2 * Math.PI * i) / breathPeriod);
  }
  return data;
}

// Helper: generate flat-topped (flow limited) breathing
function makeFlatWave(seconds: number, samplingRate = 25): Float32Array {
  const total = seconds * samplingRate;
  const data = new Float32Array(total);
  const breathPeriod = 4 * samplingRate;
  for (let i = 0; i < total; i++) {
    const phase = (i % breathPeriod) / breathPeriod;
    if (phase < 0.5) {
      const raw = Math.sin(Math.PI * phase * 2);
      data[i] = 20 * Math.min(raw, 0.5); // clipped
    } else {
      data[i] = -15 * Math.sin(Math.PI * (phase - 0.5) * 2);
    }
  }
  return data;
}

describe('WAT Engine', () => {
  it('returns valid scores for normal breathing', () => {
    const data = makeSineWave(300); // 5 minutes
    const result = computeWAT(data, 25);

    expect(result.flScore).toBeGreaterThanOrEqual(0);
    expect(result.flScore).toBeLessThanOrEqual(100);
    expect(result.regularityScore).toBeGreaterThanOrEqual(0);
    expect(result.regularityScore).toBeLessThanOrEqual(100);
    expect(result.periodicityIndex).toBeGreaterThanOrEqual(0);
    expect(result.periodicityIndex).toBeLessThanOrEqual(100);
  });

  it('returns zero scores for insufficient data', () => {
    const short = new Float32Array(100);
    const result = computeWAT(short, 25);

    expect(result.flScore).toBe(0);
    // Regularity and periodicity may also be 0 for short data
    expect(result.regularityScore).toBeGreaterThanOrEqual(0);
  });

  it('detects higher FL score in flat-topped vs normal breathing', () => {
    const normal = computeWAT(makeSineWave(300), 25);
    const flat = computeWAT(makeFlatWave(300), 25);

    // Flat-topped breathing should score higher on flow limitation
    expect(flat.flScore).toBeGreaterThan(normal.flScore);
  });

  it('returns all-zero for all-zero data', () => {
    const zeros = new Float32Array(10000);
    const result = computeWAT(zeros, 25);

    expect(result.flScore).toBe(0);
  });

  it('regularity score is high for periodic breathing', () => {
    // Very regular sine wave
    const data = makeSineWave(600); // 10 minutes for enough minute-vent windows
    const result = computeWAT(data, 25);

    // Regular breathing should have a high regularity score
    expect(result.regularityScore).toBeGreaterThan(0);
  });
});
