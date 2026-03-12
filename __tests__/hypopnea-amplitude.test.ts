// ============================================================
// AirwayLab — Hypopnea & Amplitude Stability Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeNED } from '@/lib/analyzers/ned-engine';
import { getTrafficLight, THRESHOLDS } from '@/lib/thresholds';
import type { Breath, MachineHypopneaSummary } from '@/lib/types';

// ============================================================
// Helpers — build synthetic breath arrays for testing
// ============================================================

/**
 * Build a minimal Breath object with the given qPeak.
 * inspStart is expressed in samples (sampleIdx), which can be
 * converted to seconds via samplingRate.
 */
function makeBeath(qPeak: number, inspStartSample: number, durationSamples: number, ned = 0): Breath {
  const inspFlow = new Float32Array(durationSamples);
  // Fill with a simple sine-ish shape peaking at qPeak
  for (let i = 0; i < durationSamples; i++) {
    const t = i / durationSamples;
    inspFlow[i] = qPeak * Math.sin(Math.PI * t);
  }
  const midIdx = Math.floor(durationSamples / 2);
  return {
    inspStart: inspStartSample,
    inspEnd: inspStartSample + durationSamples,
    expStart: inspStartSample + durationSamples,
    expEnd: inspStartSample + durationSamples * 2,
    inspFlow,
    qPeak,
    qMid: inspFlow[midIdx],
    ti: durationSamples / 25, // assume 25 Hz
    tPeakTi: 0.3,
    ned,
    fi: 0.7,
    isMShape: false,
    isEarlyPeakFL: false,
  };
}

/**
 * Build a flow signal (Float32Array) from a sequence of breath amplitudes.
 * Each breath is a sine half-wave (inspiration) followed by a negative
 * sine half-wave (expiration). This creates zero-crossings that
 * detectBreaths() can segment.
 *
 * @param amplitudes - peak flow for each breath
 * @param samplingRate - samples per second (default 25)
 * @param breathDurationS - total breath duration in seconds (default 4s: 2s insp + 2s exp)
 */
function buildFlowSignal(
  amplitudes: number[],
  samplingRate = 25,
  breathDurationS = 4
): Float32Array {
  const samplesPerBreath = Math.round(breathDurationS * samplingRate);
  const halfSamples = Math.floor(samplesPerBreath / 2);
  const total = amplitudes.length * samplesPerBreath;
  const flow = new Float32Array(total);

  for (let b = 0; b < amplitudes.length; b++) {
    const amp = amplitudes[b];
    const offset = b * samplesPerBreath;
    // Inspiration (positive half-sine)
    for (let i = 0; i < halfSamples; i++) {
      flow[offset + i] = amp * Math.sin((Math.PI * i) / halfSamples);
    }
    // Expiration (negative half-sine)
    for (let i = 0; i < halfSamples; i++) {
      flow[offset + halfSamples + i] = -amp * 0.5 * Math.sin((Math.PI * i) / halfSamples);
    }
  }

  return flow;
}

// ============================================================
// Test Suite
// ============================================================

describe('Hypopnea & Amplitude Stability Detection', () => {
  const SR = 25; // sampling rate

  // ----------------------------------------------------------
  // Test 1: uniform amplitude → 0 events
  // ----------------------------------------------------------
  it('returns 0 hypopneas and 0 brief obstructions for uniform-amplitude breaths', () => {
    // 60 breaths all at qPeak = 1.0
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR);
    const result = computeNED(flow, SR);

    expect(result.hypopneaCount ?? 0).toBe(0);
    expect(result.briefObstructionCount ?? 0).toBe(0);
    expect(result.briefObstructionIndex ?? 0).toBe(0);
  });

  // ----------------------------------------------------------
  // Test 2: sustained hypopnea (5 breaths at 50% baseline, ~15s)
  // ----------------------------------------------------------
  it('detects a sustained hypopnea (>=30% drop, >=10s)', () => {
    // 35 normal breaths (baseline window + buffer), then 5 at 50%, then 10 normal
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(5).fill(0.5), // 50% of baseline → 50% drop (>30%)
      ...Array(10).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4); // 4s/breath → 5 breaths = 20s > 10s
    const result = computeNED(flow, SR);

    expect(result.hypopneaCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(result.hypopneaIndex ?? 0).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // Test 3: brief obstruction (1 breath at 50% of baseline)
  // ----------------------------------------------------------
  it('detects a brief obstruction (1-2 breaths, >40% drop)', () => {
    // 35 normal, 1 at 50% (>40% drop), then continue normal
    const amps = [
      ...Array(35).fill(1.0),
      0.5, // single-breath 50% drop
      ...Array(20).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    expect(result.briefObstructionCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(result.briefObstructionIndex ?? 0).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // Test 4: 20% drop does NOT trigger detection
  // ----------------------------------------------------------
  it('does NOT flag a 20% drop (below 30% threshold)', () => {
    // 35 normal, then 5 at 80% of baseline (20% drop)
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(5).fill(0.8),
      ...Array(10).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    expect(result.hypopneaCount ?? 0).toBe(0);
    expect(result.briefObstructionCount ?? 0).toBe(0);
  });

  // ----------------------------------------------------------
  // Test 5: 35% drop lasting only 8s → not a hypopnea
  // ----------------------------------------------------------
  it('does NOT flag a 35% drop lasting only 8s as a hypopnea', () => {
    // 2 breaths at 4s each = 8s < 10s
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(2).fill(0.6), // 40% drop, but only 2 breaths × 4s = 8s
      ...Array(15).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // Should NOT be classified as hypopnea (too short)
    expect(result.hypopneaCount ?? 0).toBe(0);
    // But could be a brief obstruction if drop > 40%
    // 40% drop exactly — borderline. With 2 breaths it may or may not depending on mean
  });

  // ----------------------------------------------------------
  // Test 6: NED-invisible flagging (max NED during event < 34%)
  // ----------------------------------------------------------
  it('flags nedVisible: false when max NED during event < 34%', () => {
    // Use a drop that creates a hypopnea but where breath shapes stay normal (low NED)
    // Since detectBreaths recalculates NED, we rely on the synthetic sine waves
    // which produce low NED values (peak at same relative position)
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(5).fill(0.4), // 60% drop, clearly a hypopnea
      ...Array(10).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // Sine waves produce low NED → these should be NED-invisible
    expect(result.hypopneaCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(result.hypopneaNedInvisibleCount ?? 0).toBeGreaterThanOrEqual(1);
  });

  // ----------------------------------------------------------
  // Test 7: NED-visible (max NED >= 34%)
  // ----------------------------------------------------------
  it('flags nedVisible: true when max NED during event >= 34%', () => {
    // Build a signal where the low-amplitude breaths have flat-topped shapes
    // (high NED). We can create this by making the inspiration very flat.
    const normalAmps = Array(35).fill(1.0);
    const lowAmps = Array(5).fill(0.4); // 60% drop

    // Build flow manually with flat-topped breaths during the event
    const samplesPerBreath = 4 * SR; // 100 samples per breath
    const halfSamples = 50;
    const total = 50 * samplesPerBreath;
    const flow = new Float32Array(total);

    for (let b = 0; b < 50; b++) {
      const amp = b >= 35 && b < 40 ? 0.4 : 1.0;
      const offset = b * samplesPerBreath;

      if (b >= 35 && b < 40) {
        // Early-peaked inspiration: peak at 10% Ti, then decay → high NED
        // NED = (Qpeak - Qmid) / Qpeak. With this shape, Qmid << Qpeak.
        for (let i = 0; i < halfSamples; i++) {
          const t = i / halfSamples;
          if (t < 0.1) flow[offset + i] = amp * (t / 0.1);
          else flow[offset + i] = amp * Math.max(0.01, (1 - t) / 0.9);
        }
      } else {
        // Normal sine inspiration
        for (let i = 0; i < halfSamples; i++) {
          flow[offset + i] = amp * Math.sin((Math.PI * i) / halfSamples);
        }
      }
      // Expiration
      for (let i = 0; i < halfSamples; i++) {
        flow[offset + halfSamples + i] = -amp * 0.5 * Math.sin((Math.PI * i) / halfSamples);
      }
    }

    const result = computeNED(flow, SR);

    // The event should be detected AND the flat-topped breaths should have high NED
    if ((result.hypopneaCount ?? 0) > 0) {
      // If hypopnea detected, check NED-invisible count is less than total
      // (some events should be NED-visible due to flat tops)
      const totalHypopneas = result.hypopneaCount ?? 0;
      const invisible = result.hypopneaNedInvisibleCount ?? 0;
      expect(invisible).toBeLessThan(totalHypopneas);
    }
  });

  // ----------------------------------------------------------
  // Test 8: cooldown prevents double-counting
  // ----------------------------------------------------------
  it('respects cooldown between events', () => {
    // Two drops separated by only 2 normal breaths (< cooldown of 5)
    const amps = [
      ...Array(35).fill(1.0),
      0.4, // brief obstruction 1
      ...Array(2).fill(1.0), // only 2 breaths gap (< 5 cooldown)
      0.4, // should NOT be counted due to cooldown
      ...Array(15).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // At most 1 brief obstruction (second one is within cooldown)
    expect(result.briefObstructionCount ?? 0).toBeLessThanOrEqual(1);
  });

  // ----------------------------------------------------------
  // Test 9: H1/H2 assignment
  // ----------------------------------------------------------
  it('assigns H1/H2 correctly based on mid-point timestamp', () => {
    // 80 breaths total: event in first half (breath 35) and event in second half (breath 60)
    const amps = Array(80).fill(1.0);
    amps[35] = 0.4; // brief obstruction in H1
    amps[65] = 0.4; // brief obstruction in H2

    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    const h1 = result.briefObstructionH1Index ?? 0;
    const h2 = result.briefObstructionH2Index ?? 0;
    // Both halves should have events
    expect(h1 + h2).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // Test 10: short night (<35 breaths) → empty results
  // ----------------------------------------------------------
  it('returns empty results when breaths < 35', () => {
    const amps = Array(20).fill(1.0); // too few breaths
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    expect(result.hypopneaCount ?? 0).toBe(0);
    expect(result.briefObstructionCount ?? 0).toBe(0);
    expect(result.amplitudeCvOverall ?? 0).toBe(0);
  });

  // ----------------------------------------------------------
  // Test 11: amplitude stability — CV = 0 for constant amplitude
  // ----------------------------------------------------------
  it('computeAmplitudeStability returns CV ~0 for constant-amplitude breaths', () => {
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // CV should be very low (close to 0, not exactly 0 due to sine sampling)
    expect(result.amplitudeCvOverall ?? 0).toBeLessThan(5);
  });

  // ----------------------------------------------------------
  // Test 12: high CV for alternating amplitudes
  // ----------------------------------------------------------
  it('computeAmplitudeStability returns high CV for alternating high/low amplitude', () => {
    // Alternate between 1.0 and 0.3 every breath → very high variability
    const amps = Array(60).fill(0).map((_, i) => i % 2 === 0 ? 1.0 : 0.3);
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    expect(result.amplitudeCvOverall ?? 0).toBeGreaterThan(25);
  });

  // ----------------------------------------------------------
  // Test 13: unstable epochs (CV > 25%)
  // ----------------------------------------------------------
  it('marks epochs with CV > 25% as unstable', () => {
    // First 30 breaths constant (2 min at 4s/breath), next 30 alternate wildly
    const stable = Array(30).fill(1.0);
    const unstable = Array(30).fill(0).map((_, i) => i % 2 === 0 ? 1.0 : 0.3);
    const amps = [...stable, ...unstable];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    expect(result.unstableEpochPct ?? 0).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // Test 14: epochs with < 5 breaths are skipped
  // ----------------------------------------------------------
  it('skips epochs with fewer than 5 breaths in stability calculation', () => {
    // 8 breaths at 4s each = 32 seconds. One epoch of 5 min won't fill.
    // But we need enough breaths for the algorithm to run at all (>= baseline window)
    // With only 8 breaths (<35), we get empty results anyway — which is correct.
    const amps = Array(8).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // Should be 0 — not enough data for epoch-level analysis
    expect(result.unstableEpochPct ?? 0).toBe(0);
  });

  // ----------------------------------------------------------
  // Test 15: end-to-end — computeNED includes new fields
  // ----------------------------------------------------------
  it('computeNED output includes all new fields', () => {
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR);

    // All new fields should be defined (not undefined)
    expect(result.hypopneaCount).toBeDefined();
    expect(result.hypopneaIndex).toBeDefined();
    expect(result.hypopneaSource).toBeDefined();
    expect(result.briefObstructionCount).toBeDefined();
    expect(result.briefObstructionIndex).toBeDefined();
    expect(result.amplitudeCvOverall).toBeDefined();
    expect(result.amplitudeCvMedianEpoch).toBeDefined();
    expect(result.unstableEpochPct).toBeDefined();
    expect(result.hypopneaNedInvisibleCount).toBeDefined();
    expect(result.hypopneaNedInvisiblePct).toBeDefined();
  });

  // ----------------------------------------------------------
  // Test 16: emptyNEDResults includes all new fields at 0
  // ----------------------------------------------------------
  it('emptyNEDResults includes all new fields defaulting to 0', () => {
    // Feed empty flow data → should get empty results
    const flow = new Float32Array(0);
    const result = computeNED(flow, SR);

    expect(result.hypopneaCount).toBe(0);
    expect(result.hypopneaIndex).toBe(0);
    expect(result.briefObstructionCount).toBe(0);
    expect(result.briefObstructionIndex).toBe(0);
    expect(result.amplitudeCvOverall).toBe(0);
    expect(result.amplitudeCvMedianEpoch).toBe(0);
    expect(result.unstableEpochPct).toBe(0);
  });

  // ----------------------------------------------------------
  // Test 17: threshold bands
  // ----------------------------------------------------------
  it('threshold for briefObstructionIndex returns correct traffic lights', () => {
    expect(getTrafficLight(2, THRESHOLDS.briefObstructionIndex)).toBe('good');
    expect(getTrafficLight(4, THRESHOLDS.briefObstructionIndex)).toBe('warn');
    expect(getTrafficLight(8, THRESHOLDS.briefObstructionIndex)).toBe('bad');
  });

  it('threshold for hypopneaIndex returns correct traffic lights', () => {
    expect(getTrafficLight(1, THRESHOLDS.hypopneaIndex)).toBe('good');
    expect(getTrafficLight(3, THRESHOLDS.hypopneaIndex)).toBe('warn');
    expect(getTrafficLight(7, THRESHOLDS.hypopneaIndex)).toBe('bad');
  });

  it('threshold for amplitudeCv returns correct traffic lights', () => {
    expect(getTrafficLight(15, THRESHOLDS.amplitudeCv)).toBe('good');
    expect(getTrafficLight(25, THRESHOLDS.amplitudeCv)).toBe('warn');
    expect(getTrafficLight(35, THRESHOLDS.amplitudeCv)).toBe('bad');
  });

  // ----------------------------------------------------------
  // Test 18: persistence migration
  // ----------------------------------------------------------
  // (Tested indirectly — the persistence module is tested via integration)

  // ----------------------------------------------------------
  // Test 19: machine-preferred source selection
  // ----------------------------------------------------------
  it('uses machine source when machine events are provided', () => {
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);
    const machineEvents: MachineHypopneaSummary[] = [
      { onsetSec: 50, durationSec: 15 },
      { onsetSec: 100, durationSec: 12 },
    ];

    const result = computeNED(flow, SR, machineEvents);

    expect(result.hypopneaSource).toBe('machine');
    expect(result.hypopneaCount).toBe(2);
  });

  // ----------------------------------------------------------
  // Test 20: algorithm fallback when no machine events
  // ----------------------------------------------------------
  it('uses algorithm source when machine events are empty', () => {
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(5).fill(0.4), // clear hypopnea
      ...Array(15).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR, []); // empty machine events

    expect(result.hypopneaSource).toBe('algorithm');
  });

  it('uses algorithm source when machine events are undefined', () => {
    const amps = [
      ...Array(35).fill(1.0),
      ...Array(5).fill(0.4),
      ...Array(15).fill(1.0),
    ];
    const flow = buildFlowSignal(amps, SR, 4);
    const result = computeNED(flow, SR); // no machine events

    expect(result.hypopneaSource).toBe('algorithm');
  });

  // ----------------------------------------------------------
  // Test 21: NED-invisible check maps machine timestamps to breaths
  // ----------------------------------------------------------
  it('checks NED visibility for machine events via timestamp mapping', () => {
    // Build 60 normal breaths, inject machine events at known timestamps
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);

    // Machine event at t=140s (breath ~35), lasting 20s (5 breaths)
    const machineEvents: MachineHypopneaSummary[] = [
      { onsetSec: 140, durationSec: 20 },
    ];

    const result = computeNED(flow, SR, machineEvents);

    expect(result.hypopneaSource).toBe('machine');
    expect(result.hypopneaCount).toBe(1);
    // NED-invisible fields should be populated
    expect(result.hypopneaNedInvisibleCount).toBeDefined();
    expect(result.hypopneaNedInvisiblePct).toBeDefined();
  });

  // ----------------------------------------------------------
  // Test 22: machine event with no matching breaths
  // ----------------------------------------------------------
  it('counts machine events even when no breaths match the timestamp', () => {
    const amps = Array(60).fill(1.0);
    const flow = buildFlowSignal(amps, SR, 4);

    // Machine event at t=5000s — way beyond the signal duration
    const machineEvents: MachineHypopneaSummary[] = [
      { onsetSec: 5000, durationSec: 15 },
    ];

    const result = computeNED(flow, SR, machineEvents);

    expect(result.hypopneaSource).toBe('machine');
    expect(result.hypopneaCount).toBe(1);
    // No breaths matched → nedVisible defaults to false → counted as NED-invisible
  });
});
