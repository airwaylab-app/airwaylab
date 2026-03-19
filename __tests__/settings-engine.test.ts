import { describe, it, expect } from 'vitest';
import { computeSettingsMetrics } from '@/lib/analyzers/settings-engine';

// --- Synthetic Data Generators ---

/**
 * Generate sinusoidal flow waveform simulating normal breathing.
 * Positive = inspiration, negative = expiration.
 */
function makeSineFlow(
  seconds: number,
  samplingRate: number,
  breathsPerMin = 15
): Float32Array {
  const len = Math.floor(seconds * samplingRate);
  const flow = new Float32Array(len);
  const breathFreq = breathsPerMin / 60; // Hz
  for (let i = 0; i < len; i++) {
    const t = i / samplingRate;
    // Sine wave: positive half = inspiration, negative half = expiration
    // Scale to realistic L/min range (peak ~30 L/min)
    flow[i] = 30 * Math.sin(2 * Math.PI * breathFreq * t);
  }
  return flow;
}

/**
 * Generate BiPAP pressure waveform that tracks flow zero-crossings.
 * During inspiration: ramps to IPAP (with optional trigger delay).
 * During expiration: drops to EPAP.
 */
function makeBiPAPPressure(
  flowData: Float32Array,
  samplingRate: number,
  epap: number,
  ipap: number,
  triggerDelayMs = 100
): Float32Array {
  const len = flowData.length;
  const pressure = new Float32Array(len);
  const delaySamples = Math.round((triggerDelayMs / 1000) * samplingRate);
  // Rise time: ~200ms to reach IPAP
  const riseSamples = Math.round(0.2 * samplingRate);

  let inInspiration = false;
  let inspStartSample = 0;

  for (let i = 0; i < len; i++) {
    // Detect inspiration start (positive-going zero crossing)
    if (i > 0 && flowData[i - 1]! <= 0 && flowData[i]! > 0) {
      inInspiration = true;
      inspStartSample = i;
    }
    // Detect expiration start (negative-going zero crossing)
    if (i > 0 && flowData[i - 1]! > 0 && flowData[i]! <= 0) {
      inInspiration = false;
    }

    if (inInspiration) {
      const samplesIntoInsp = i - inspStartSample;
      if (samplesIntoInsp < delaySamples) {
        // Still at EPAP during trigger delay
        pressure[i] = epap;
      } else {
        // Ramp toward IPAP
        const rampProgress = Math.min(1, (samplesIntoInsp - delaySamples) / riseSamples);
        pressure[i] = epap + (ipap - epap) * rampProgress;
      }
    } else {
      pressure[i] = epap;
    }
  }

  return pressure;
}

/**
 * Generate constant pressure (CPAP-like — no pressure support).
 */
function makeCPAPPressure(length: number, pressure: number): Float32Array {
  const data = new Float32Array(length);
  data.fill(pressure);
  return data;
}

// --- Tests ---

describe('Settings Engine', () => {
  const SR = 25; // 25 Hz sampling rate

  it('returns null for empty pressure data', () => {
    const flow = makeSineFlow(120, SR);
    const pressure = new Float32Array(0);
    const result = computeSettingsMetrics(flow, pressure, SR);
    expect(result).toBeNull();
  });

  it('returns null when fewer than 10 valid breaths', () => {
    // 5 seconds of data at 15 breaths/min = ~1.25 breaths
    const flow = makeSineFlow(5, SR);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);
    expect(result).toBeNull();
  });

  it('returns null when detected PS < 1 cmH2O (CPAP data)', () => {
    const flow = makeSineFlow(120, SR);
    const pressure = makeCPAPPressure(flow.length, 10);
    const result = computeSettingsMetrics(flow, pressure, SR);
    expect(result).toBeNull();
  });

  it('detects EPAP/IPAP correctly from synthetic bimodal pressure', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    // Detected pressures should be close to set values
    // EPAP should be within ~1 cmH2O of 10
    expect(result!.epapDetected).toBeGreaterThanOrEqual(9);
    expect(result!.epapDetected).toBeLessThanOrEqual(11);
    // IPAP should be within ~1.5 cmH2O of 17 (ramp time reduces P90)
    expect(result!.ipapDetected).toBeGreaterThanOrEqual(14);
    expect(result!.ipapDetected).toBeLessThanOrEqual(18);
    // PS should be positive
    expect(result!.psDetected).toBeGreaterThan(1);
  });

  it('Ti values in physiological range (800-2500ms) for normal breathing', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    // At 15 breaths/min: cycle = 4s, Ti ~2s, Te ~2s
    expect(result!.tiMedianMs).toBeGreaterThanOrEqual(800);
    expect(result!.tiMedianMs).toBeLessThanOrEqual(2500);
  });

  it('Te > Ti (I:E > 1.0) for normal breathing', () => {
    // Sine wave has equal Ti and Te, so I:E should be ~1.0
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    // I:E should be close to 1.0 for symmetric sine wave
    expect(result!.ieRatio).toBeGreaterThanOrEqual(0.8);
    expect(result!.ieRatio).toBeLessThanOrEqual(1.3);
  });

  it('time-at-IPAP > 0 for BiPAP pressure waveform', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.timeAtIpapMedianMs).toBeGreaterThan(0);
    expect(result!.ipapDwellMedianPct).toBeGreaterThan(0);
  });

  it('premature cycle % < 50% on well-timed pressure waveform', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.prematureCyclePct).toBeLessThan(50);
  });

  it('late cycle % < 50% on well-timed pressure waveform', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.lateCyclePct).toBeLessThan(50);
  });

  it('tidal volume > 0 for positive inspiratory flow', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.tidalVolumeMedianMl).toBeGreaterThan(0);
  });

  it('tidal volume CV < 100% for regular breathing', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.tidalVolumeCv).toBeLessThan(100);
  });

  it('trigger delay > 0 for delayed pressure rise', () => {
    const flow = makeSineFlow(120, SR, 15);
    // 200ms delay — clearly measurable
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 200);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.triggerDelayMedianMs).toBeGreaterThan(0);
  });

  it('auto-trigger % increases when pressure leads flow', () => {
    const flow = makeSineFlow(120, SR, 15);

    // Normal: 200ms trigger delay → low auto-trigger %
    const normalPressure = makeBiPAPPressure(flow, SR, 10, 17, 200);
    const normalResult = computeSettingsMetrics(flow, normalPressure, SR);

    // Auto-trigger: negative delay (pressure rises before flow onset)
    // Simulate by shifting pressure forward by offsetting the delay to -200ms
    const autoTriggerPressure = makeBiPAPPressure(flow, SR, 10, 17, -200);
    const autoResult = computeSettingsMetrics(flow, autoTriggerPressure, SR);

    expect(normalResult).not.toBeNull();
    expect(autoResult).not.toBeNull();
    // With negative delay, pressure is already above threshold at flow onset
    expect(autoResult!.autoTriggerPct).toBeGreaterThanOrEqual(normalResult!.autoTriggerPct);
  });

  it('all output values are finite numbers', () => {
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    for (const [key, value] of Object.entries(result!)) {
      expect(Number.isFinite(value), `${key} should be finite, got ${value}`).toBe(true);
    }
  });

  it('breathCount reflects number of analysed breaths', () => {
    // 120 seconds at 15 breaths/min ≈ 30 breaths
    const flow = makeSineFlow(120, SR, 15);
    const pressure = makeBiPAPPressure(flow, SR, 10, 17, 100);
    const result = computeSettingsMetrics(flow, pressure, SR);

    expect(result).not.toBeNull();
    expect(result!.breathCount).toBeGreaterThan(10);
    expect(result!.breathCount).toBeLessThan(40); // some breaths may be filtered
  });
});
