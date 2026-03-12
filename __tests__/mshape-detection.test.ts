import { describe, it, expect } from 'vitest';
import { detectMShapeInWorker } from '@/lib/waveform-utils';

// Helper: create a Float32Array representing inspiratory flow
function makeInspFlow(values: number[]): Float32Array {
  return new Float32Array(values);
}

describe('detectMShapeInWorker', () => {
  it('detects true bi-modal M-shape (valley at 70% of peak)', () => {
    // Two peaks at 1.0, valley at 0.7 in the middle
    const len = 40;
    const flow = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 10) flow[i] = 0.3 + (0.7 * i) / 10; // rise to 1.0
      else if (i < 15) flow[i] = 1.0 - (0.3 * (i - 10)) / 5; // dip to 0.7
      else if (i < 20) flow[i] = 0.7; // valley at 0.7
      else if (i < 25) flow[i] = 0.7 + (0.3 * (i - 20)) / 5; // rise to 1.0
      else if (i < 30) flow[i] = 1.0; // second peak
      else flow[i] = 1.0 - (1.0 * (i - 30)) / 10; // decay
    }
    const fa = makeInspFlow(flow);
    const peak = 1.0;
    expect(detectMShapeInWorker(fa, peak)).toBe(true);
  });

  it('rejects minor noise dip (valley at 88% of peak)', () => {
    // Slight dip that was caught by old 85% threshold but should be rejected by 80%
    const len = 40;
    const flow = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 10) flow[i] = 0.5 + (0.5 * i) / 10;
      else if (i < 20) flow[i] = 0.88; // slight dip — above 80% threshold
      else if (i < 30) flow[i] = 1.0;
      else flow[i] = 0.9;
    }
    const fa = makeInspFlow(flow);
    const peak = 1.0;
    expect(detectMShapeInWorker(fa, peak)).toBe(false);
  });

  it('rejects single-sided dip (no peak on left side)', () => {
    // Valley exists but left side never reaches 80% of peak
    const len = 40;
    const flow = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 15) flow[i] = 0.5; // left side stays low (50% of peak)
      else if (i < 25) flow[i] = 0.6; // valley at 60%
      else flow[i] = 1.0; // right peak at 100%
    }
    const fa = makeInspFlow(flow);
    const peak = 1.0;
    expect(detectMShapeInWorker(fa, peak)).toBe(false);
  });

  it('rejects short inspiration (<12 samples)', () => {
    // Even with perfect M-shape, too few samples
    const flow = makeInspFlow([1.0, 0.9, 0.5, 0.9, 1.0, 0.8, 0.5, 0.8, 1.0, 0.7, 0.5]);
    expect(detectMShapeInWorker(flow, 1.0)).toBe(false);
  });

  it('rejects breath with valley exactly at 80% threshold', () => {
    // Valley at exactly 80% — should NOT trigger (must be strictly below)
    const len = 40;
    const flow = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 10) flow[i] = 1.0; // left peak
      else if (i < 20) flow[i] = 0.8; // valley exactly at threshold
      else if (i < 30) flow[i] = 1.0; // right peak
      else flow[i] = 0.9;
    }
    const fa = makeInspFlow(flow);
    expect(detectMShapeInWorker(fa, 1.0)).toBe(false);
  });

  it('detects M-shape with valley at 75% (below 80% threshold, peaks on both sides)', () => {
    const len = 40;
    const flow = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 10) flow[i] = 0.95; // left peak above 80%
      else if (i < 20) flow[i] = 0.75; // valley below 80%
      else if (i < 30) flow[i] = 0.95; // right peak above 80%
      else flow[i] = 0.85;
    }
    const fa = makeInspFlow(flow);
    expect(detectMShapeInWorker(fa, 1.0)).toBe(true);
  });
});
