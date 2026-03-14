import { describe, it, expect } from 'vitest';
import {
  buildWaveformBlob,
  parseWaveformBlob,
  AWL2_MAGIC,
} from '@/lib/waveform-blob';

describe('buildWaveformBlob', () => {
  it('builds AWL2 header + interleaved data with flow + pressure', () => {
    const flow = new Float32Array([1.0, 2.0, 3.0]);
    const pressure = new Float32Array([10.0, 11.0, 12.0]);

    const blob = buildWaveformBlob(flow, pressure);

    // 16 byte header + 6 interleaved floats (24 bytes) = 40 bytes
    expect(blob.byteLength).toBe(16 + 6 * 4);

    const view = new DataView(blob);
    expect(view.getUint32(0, true)).toBe(AWL2_MAGIC);
    expect(view.getUint32(4, true)).toBe(2); // format version
    expect(view.getUint32(8, true)).toBe(2); // channel count
    expect(view.getUint32(12, true)).toBe(0); // reserved

    // Interleaved: flow0, pressure0, flow1, pressure1, ...
    const data = new Float32Array(blob, 16);
    expect(data[0]).toBeCloseTo(1.0);
    expect(data[1]).toBeCloseTo(10.0);
    expect(data[2]).toBeCloseTo(2.0);
    expect(data[3]).toBeCloseTo(11.0);
    expect(data[4]).toBeCloseTo(3.0);
    expect(data[5]).toBeCloseTo(12.0);
  });

  it('builds AWL2 header + single-channel data with flow only', () => {
    const flow = new Float32Array([1.0, 2.0, 3.0]);

    const blob = buildWaveformBlob(flow, null);

    // 16 byte header + 3 floats (12 bytes) = 28 bytes
    expect(blob.byteLength).toBe(16 + 3 * 4);

    const view = new DataView(blob);
    expect(view.getUint32(0, true)).toBe(AWL2_MAGIC);
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(1); // single channel
    expect(view.getUint32(12, true)).toBe(0);

    const data = new Float32Array(blob, 16);
    expect(data[0]).toBeCloseTo(1.0);
    expect(data[1]).toBeCloseTo(2.0);
    expect(data[2]).toBeCloseTo(3.0);
  });
});

describe('parseWaveformBlob', () => {
  it('correctly reads AWL2 v2 format and deinterleaves 2 channels', () => {
    const flow = new Float32Array([1.0, 2.0, 3.0]);
    const pressure = new Float32Array([10.0, 11.0, 12.0]);
    const blob = buildWaveformBlob(flow, pressure);

    const result = parseWaveformBlob(blob);

    expect(result.formatVersion).toBe(2);
    expect(result.channelCount).toBe(2);
    expect(result.flow.length).toBe(3);
    expect(result.pressure).not.toBeNull();
    expect(result.pressure!.length).toBe(3);

    expect(result.flow[0]).toBeCloseTo(1.0);
    expect(result.flow[1]).toBeCloseTo(2.0);
    expect(result.flow[2]).toBeCloseTo(3.0);
    expect(result.pressure![0]).toBeCloseTo(10.0);
    expect(result.pressure![1]).toBeCloseTo(11.0);
    expect(result.pressure![2]).toBeCloseTo(12.0);
  });

  it('correctly reads AWL2 v2 single-channel format', () => {
    const flow = new Float32Array([4.0, 5.0, 6.0]);
    const blob = buildWaveformBlob(flow, null);

    const result = parseWaveformBlob(blob);

    expect(result.formatVersion).toBe(2);
    expect(result.channelCount).toBe(1);
    expect(result.flow.length).toBe(3);
    expect(result.pressure).toBeNull();
    expect(result.flow[0]).toBeCloseTo(4.0);
  });

  it('correctly reads legacy format (no header, raw Float32)', () => {
    // Legacy format: just raw Float32Array bytes, no AWL2 header
    const flow = new Float32Array([7.0, 8.0, 9.0]);
    const rawBuffer = flow.buffer.slice(0);

    const result = parseWaveformBlob(rawBuffer);

    expect(result.formatVersion).toBe(1);
    expect(result.channelCount).toBe(1);
    expect(result.flow.length).toBe(3);
    expect(result.pressure).toBeNull();
    expect(result.flow[0]).toBeCloseTo(7.0);
  });
});

describe('buildWaveformBlob edge cases', () => {
  it('falls back to flow-only when pressure length mismatches flow length', () => {
    const flow = new Float32Array([1.0, 2.0, 3.0]);
    const pressure = new Float32Array([10.0, 11.0]); // mismatched length

    const blob = buildWaveformBlob(flow, pressure);

    const view = new DataView(blob);
    expect(view.getUint32(8, true)).toBe(1); // falls back to single channel

    // Only flow data, no interleaving
    const data = new Float32Array(blob, 16);
    expect(data.length).toBe(3);
  });

  it('builds empty blob for empty flow array', () => {
    const flow = new Float32Array(0);
    const blob = buildWaveformBlob(flow, null);

    expect(blob.byteLength).toBe(16); // header only
    const view = new DataView(blob);
    expect(view.getUint32(8, true)).toBe(1);
  });
});
