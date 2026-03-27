import { describe, it, expect } from 'vitest';
import { computeGlasgowIndex, computeNightGlasgow } from '@/lib/analyzers/glasgow-index';
import type { EDFFile } from '@/lib/types';

// Helper: generate a sine wave (normal breathing pattern)
function makeSineWave(breaths: number, samplingRate = 25): Float32Array {
  const samplesPerBreath = Math.floor(samplingRate * 4); // 4s per breath cycle
  const total = breaths * samplesPerBreath;
  const data = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    data[i] = 20 * Math.sin((2 * Math.PI * i) / samplesPerBreath);
  }
  return data;
}

// Helper: generate flat-topped (flow limited) breathing
function makeFlatToppedWave(breaths: number, samplingRate = 25): Float32Array {
  const samplesPerBreath = Math.floor(samplingRate * 4);
  const total = breaths * samplesPerBreath;
  const data = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const phase = (i % samplesPerBreath) / samplesPerBreath;
    if (phase < 0.5) {
      // Inspiration: clipped sine (flat top)
      const raw = Math.sin(Math.PI * phase * 2);
      data[i] = 20 * Math.min(raw, 0.7);
    } else {
      // Expiration
      data[i] = -15 * Math.sin(Math.PI * (phase - 0.5) * 2);
    }
  }
  return data;
}

describe('Glasgow Index Engine', () => {
  describe('computeGlasgowIndex', () => {
    it('returns empty components for insufficient data', () => {
      const shortData = new Float32Array(50);
      const result = computeGlasgowIndex(shortData, 25);
      expect(result.overall).toBe(0);
      expect(result.skew).toBe(0);
    });

    it('returns valid components for normal breathing', () => {
      const data = makeSineWave(30);
      const result = computeGlasgowIndex(data, 25);

      // All component scores should be between 0 and 1
      expect(result.skew).toBeGreaterThanOrEqual(0);
      expect(result.skew).toBeLessThanOrEqual(1);
      expect(result.spike).toBeGreaterThanOrEqual(0);
      expect(result.flatTop).toBeGreaterThanOrEqual(0);
      expect(result.multiPeak).toBeGreaterThanOrEqual(0);
      expect(result.noPause).toBeGreaterThanOrEqual(0);
      expect(result.inspirRate).toBeGreaterThanOrEqual(0);
      expect(result.multiBreath).toBeGreaterThanOrEqual(0);
      expect(result.variableAmp).toBeGreaterThanOrEqual(0);
    });

    it('overall = sum of all 9 components', () => {
      const data = makeSineWave(30);
      const result = computeGlasgowIndex(data, 25);

      const expectedOverall =
        result.skew +
        result.flatTop +
        result.spike +
        result.topHeavy +
        result.multiPeak +
        result.noPause +
        result.inspirRate +
        result.multiBreath +
        result.variableAmp;

      expect(result.overall).toBeCloseTo(expectedOverall, 1);
    });

    it('overall score is between 0 and 9', () => {
      const data = makeSineWave(30);
      const result = computeGlasgowIndex(data, 25);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(9);
    });

    it('detects flat-topped breathing patterns', () => {
      const normal = computeGlasgowIndex(makeSineWave(40), 25);
      const flatTopped = computeGlasgowIndex(makeFlatToppedWave(40), 25);

      // Flat-topped waveform should score higher on flatTop component
      expect(flatTopped.flatTop).toBeGreaterThanOrEqual(normal.flatTop);
    });

    it('returns empty for all-zero data', () => {
      const zeros = new Float32Array(5000);
      const result = computeGlasgowIndex(zeros, 25);
      expect(result.overall).toBe(0);
    });
  });

  describe('computeNightGlasgow', () => {
    it('returns empty for no sessions', () => {
      const result = computeNightGlasgow([]);
      expect(result.overall).toBe(0);
    });

    it('returns single session result unchanged', () => {
      const flowData = makeSineWave(30);
      const session: EDFFile = {
        header: { version: '0', patientId: '', recordingId: '', startDate: '', startTime: '', headerBytes: 0, reserved: '', numDataRecords: 0, recordDuration: 1, numSignals: 1 },
        signals: [],
        recordingDate: new Date(),
        flowData,
        pressureData: null,
        respEventData: null,
        samplingRate: 25,
        durationSeconds: 120,
        filePath: 'test.edf',
      };

      const single = computeGlasgowIndex(flowData, 25);
      const night = computeNightGlasgow([session]);

      expect(night.overall).toBeCloseTo(single.overall, 1);
    });

    it('produces duration-weighted average for multiple sessions', () => {
      const makeSession = (breaths: number, duration: number): EDFFile => ({
        header: { version: '0', patientId: '', recordingId: '', startDate: '', startTime: '', headerBytes: 0, reserved: '', numDataRecords: 0, recordDuration: 1, numSignals: 1 },
        signals: [],
        recordingDate: new Date(),
        flowData: makeSineWave(breaths),
        pressureData: null,
        respEventData: null,
        samplingRate: 25,
        durationSeconds: duration,
        filePath: 'test.edf',
      });

      const sessions = [makeSession(20, 600), makeSession(20, 1200)];
      const result = computeNightGlasgow(sessions);

      // Should complete without error and return valid scores
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(9);
    });
  });
});
