import { describe, it, expect } from 'vitest';
import { computeSpontaneousPct } from '@/lib/bilevel-metrics';

/**
 * Build a synthetic TrigCycEvt Float32Array from a sequence of
 * [eventCode, durationSamples] pairs. Between each event there is
 * a gap of zeroed samples to simulate the 25 Hz continuous signal.
 */
function makeTrigCycEvtSignal(
  events: { code: number; samples: number }[],
  gapSamples = 25
): Float32Array {
  const parts: number[] = [];
  for (const ev of events) {
    // Each event: non-zero for `samples` samples, then gap of zeros
    for (let i = 0; i < ev.samples; i++) parts.push(ev.code);
    for (let i = 0; i < gapSamples; i++) parts.push(0);
  }
  return new Float32Array(parts);
}

describe('computeSpontaneousPct', () => {
  it('returns null for all-zero signal (CPAP/no bilevel data)', () => {
    const data = new Float32Array(1000); // all zeros
    expect(computeSpontaneousPct(data)).toBeNull();
  });

  it('returns null for empty signal', () => {
    expect(computeSpontaneousPct(new Float32Array(0))).toBeNull();
  });

  it('computes 100% spontaneous when all breaths are code 1', () => {
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 50 }, // S breath
      { code: 1, samples: 50 }, // S breath
      { code: 1, samples: 50 }, // S breath
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(100);
    expect(result!.timedPct).toBe(0);
  });

  it('computes 100% timed when all breaths are code 2', () => {
    const data = makeTrigCycEvtSignal([
      { code: 2, samples: 50 },
      { code: 2, samples: 50 },
      { code: 2, samples: 50 },
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(0);
    expect(result!.timedPct).toBe(100);
  });

  it('computes correct split for 3 spontaneous and 1 timed breath', () => {
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 50 }, // S
      { code: 1, samples: 50 }, // S
      { code: 1, samples: 50 }, // S
      { code: 2, samples: 50 }, // T
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(75);
    expect(result!.timedPct).toBe(25);
  });

  it('counts hypopnea (code 3) in total but not in spontaneous or timed pct', () => {
    // 2S + 2T + 2H = 6 total; S% = 33.3, T% = 33.3
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 50 },
      { code: 1, samples: 50 },
      { code: 2, samples: 50 },
      { code: 2, samples: 50 },
      { code: 3, samples: 50 },
      { code: 3, samples: 50 },
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    // 2/6 = 33.333... → rounded to 33.3
    expect(result!.spontaneousPct).toBeCloseTo(33.3, 1);
    expect(result!.timedPct).toBeCloseTo(33.3, 1);
    // spontaneous + timed < 100 because hypopneas make up the remainder
    expect(result!.spontaneousPct + result!.timedPct).toBeLessThan(100);
  });

  it('counts each run as one breath, not each sample', () => {
    // 1 S breath of 100 samples and 1 T breath of 10 samples → equal weight
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 100 },
      { code: 2, samples: 10 },
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(50);
    expect(result!.timedPct).toBe(50);
  });

  it('handles floating-point physical values by rounding to nearest integer code', () => {
    // Physical scaling can produce 1.0000001 instead of exactly 1
    const data = new Float32Array([0, 1.0000001, 1.0000001, 0, 1.9999999, 1.9999999, 0]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(50);
    expect(result!.timedPct).toBe(50);
  });

  it('returns percentages that sum to ≤ 100', () => {
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 50 },
      { code: 2, samples: 50 },
      { code: 3, samples: 50 },
    ]);
    const result = computeSpontaneousPct(data);
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct + result!.timedPct).toBeLessThanOrEqual(100);
  });

  it('ignores unrecognised event codes (e.g. 4, 5)', () => {
    // Only codes 1, 2, 3 are counted. Unknown codes are ignored.
    const data = makeTrigCycEvtSignal([
      { code: 1, samples: 50 },
      { code: 4, samples: 50 }, // unrecognised — ignored
      { code: 5, samples: 50 }, // unrecognised — ignored
    ]);
    const result = computeSpontaneousPct(data);
    // Only 1 breath (code 1) → 100% spontaneous
    expect(result).not.toBeNull();
    expect(result!.spontaneousPct).toBe(100);
  });

  it('returns null when only unrecognised codes are present', () => {
    const data = makeTrigCycEvtSignal([
      { code: 4, samples: 50 },
      { code: 5, samples: 50 },
    ]);
    expect(computeSpontaneousPct(data)).toBeNull();
  });
});
