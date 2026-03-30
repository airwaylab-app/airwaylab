import { describe, it, expect } from 'vitest';
import { buildWaveformBlob, parseWaveformBlob, AWL2_MAGIC } from '@/lib/waveform-blob';

// ── Helpers ─────────────────────────────────────────────────

/** Create a simple Float32Array with incrementing values */
function makeFlow(length: number, offset = 0): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = (i + offset) * 0.1;
  return data;
}

/** Create a pressure array with a constant base + small variation */
function makePressure(length: number, base = 12): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = base + Math.sin(i * 0.2) * 2;
  return data;
}

// ── AWL2 Header Structure ───────────────────────────────────

describe('AWL2 header structure', () => {
  it('writes correct magic number', () => {
    const flow = makeFlow(10);
    const buffer = buildWaveformBlob(flow, null);
    const view = new DataView(buffer);

    expect(view.getUint32(0, true)).toBe(AWL2_MAGIC);
  });

  it('writes version 2 in header', () => {
    const flow = makeFlow(10);
    const buffer = buildWaveformBlob(flow, null);
    const view = new DataView(buffer);

    expect(view.getUint32(4, true)).toBe(2);
  });

  it('writes channel count 1 for flow-only', () => {
    const flow = makeFlow(10);
    const buffer = buildWaveformBlob(flow, null);
    const view = new DataView(buffer);

    expect(view.getUint32(8, true)).toBe(1);
  });

  it('writes channel count 2 for flow + pressure', () => {
    const flow = makeFlow(10);
    const pressure = makePressure(10);
    const buffer = buildWaveformBlob(flow, pressure);
    const view = new DataView(buffer);

    expect(view.getUint32(8, true)).toBe(2);
  });

  it('writes reserved field as 0', () => {
    const flow = makeFlow(10);
    const buffer = buildWaveformBlob(flow, null);
    const view = new DataView(buffer);

    expect(view.getUint32(12, true)).toBe(0);
  });

  it('header is 16 bytes', () => {
    const flow = makeFlow(10);
    const buffer = buildWaveformBlob(flow, null);

    // Total size = 16 (header) + 10 * 4 (float32 samples)
    expect(buffer.byteLength).toBe(16 + 10 * 4);
  });
});

// ── Single-channel blobs ────────────────────────────────────

describe('single-channel (flow only)', () => {
  it('round-trip: build then parse recovers flow data exactly', () => {
    const flow = makeFlow(100);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.formatVersion).toBe(2);
    expect(parsed.channelCount).toBe(1);
    expect(parsed.pressure).toBeNull();
    expect(parsed.flow.length).toBe(100);

    for (let i = 0; i < flow.length; i++) {
      expect(parsed.flow[i]).toBeCloseTo(flow[i]!, 5);
    }
  });

  it('falls back to single channel when pressure is null', () => {
    const flow = makeFlow(50);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(1);
    expect(parsed.pressure).toBeNull();
  });

  it('falls back to single channel when pressure is empty', () => {
    const flow = makeFlow(50);
    const pressure = new Float32Array(0);
    const buffer = buildWaveformBlob(flow, pressure);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(1);
    expect(parsed.pressure).toBeNull();
  });

  it('falls back to single channel when pressure length mismatches flow', () => {
    const flow = makeFlow(50);
    const pressure = makePressure(30); // Different length
    const buffer = buildWaveformBlob(flow, pressure);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(1);
    expect(parsed.pressure).toBeNull();
  });
});

// ── Dual-channel blobs ──────────────────────────────────────

describe('dual-channel (flow + pressure)', () => {
  it('round-trip: build then parse recovers both channels', () => {
    const flow = makeFlow(100);
    const pressure = makePressure(100);
    const buffer = buildWaveformBlob(flow, pressure);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.formatVersion).toBe(2);
    expect(parsed.channelCount).toBe(2);
    expect(parsed.flow.length).toBe(100);
    expect(parsed.pressure).not.toBeNull();
    expect(parsed.pressure!.length).toBe(100);

    for (let i = 0; i < flow.length; i++) {
      expect(parsed.flow[i]).toBeCloseTo(flow[i]!, 5);
      expect(parsed.pressure![i]).toBeCloseTo(pressure[i]!, 5);
    }
  });

  it('interleaves data correctly (flow0, pressure0, flow1, pressure1, ...)', () => {
    const flow = new Float32Array([1.0, 2.0, 3.0]);
    const pressure = new Float32Array([10.0, 20.0, 30.0]);
    const buffer = buildWaveformBlob(flow, pressure);

    // Read raw data after header
    const data = new Float32Array(buffer, 16);
    expect(data.length).toBe(6); // 3 samples * 2 channels
    expect(data[0]).toBeCloseTo(1.0);  // flow[0]
    expect(data[1]).toBeCloseTo(10.0); // pressure[0]
    expect(data[2]).toBeCloseTo(2.0);  // flow[1]
    expect(data[3]).toBeCloseTo(20.0); // pressure[1]
    expect(data[4]).toBeCloseTo(3.0);  // flow[2]
    expect(data[5]).toBeCloseTo(30.0); // pressure[2]
  });

  it('buffer size is correct for dual-channel', () => {
    const flow = makeFlow(50);
    const pressure = makePressure(50);
    const buffer = buildWaveformBlob(flow, pressure);

    // 16 bytes header + 50 * 2 channels * 4 bytes per float
    expect(buffer.byteLength).toBe(16 + 50 * 2 * 4);
  });
});

// ── Empty data ──────────────────────────────────────────────

describe('empty data', () => {
  it('builds and parses empty flow array', () => {
    const flow = new Float32Array(0);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(1);
    expect(parsed.flow.length).toBe(0);
    expect(parsed.pressure).toBeNull();
  });

  it('empty buffer size is header-only', () => {
    const flow = new Float32Array(0);
    const buffer = buildWaveformBlob(flow, null);
    expect(buffer.byteLength).toBe(16);
  });
});

// ── Legacy format (no AWL2 header) ──────────────────────────

describe('legacy format parsing', () => {
  it('parses a raw Float32Array as legacy format (version 1)', () => {
    // Simulate a legacy blob: just raw Float32 data, no header
    const rawData = new Float32Array([1.5, 2.5, 3.5, 4.5]);
    const buffer = rawData.buffer;

    const parsed = parseWaveformBlob(buffer);

    expect(parsed.formatVersion).toBe(1);
    expect(parsed.channelCount).toBe(1);
    expect(parsed.pressure).toBeNull();
    expect(parsed.flow.length).toBe(4);
    expect(parsed.flow[0]).toBeCloseTo(1.5);
    expect(parsed.flow[3]).toBeCloseTo(4.5);
  });

  it('detects legacy format when first 4 bytes do not match magic', () => {
    // Create a buffer where the first uint32 is NOT AWL2_MAGIC
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    view.setUint32(0, 0x12345678, true); // Not AWL2_MAGIC
    // Fill with some float data
    const floats = new Float32Array(buffer);
    floats[1] = 5.0;

    const parsed = parseWaveformBlob(buffer);
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.channelCount).toBe(1);
  });

  it('handles very small buffer (less than header size) as legacy', () => {
    // 8 bytes = 2 Float32 values, less than 16-byte header
    const data = new Float32Array([1.0, 2.0]);
    const parsed = parseWaveformBlob(data.buffer);

    expect(parsed.formatVersion).toBe(1);
    expect(parsed.channelCount).toBe(1);
    expect(parsed.flow.length).toBe(2);
  });

  it('handles empty buffer as legacy', () => {
    const buffer = new ArrayBuffer(0);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.formatVersion).toBe(1);
    expect(parsed.channelCount).toBe(1);
    expect(parsed.flow.length).toBe(0);
  });
});

// ── Large data round-trip ───────────────────────────────────

describe('large data round-trip', () => {
  it('handles 8h of 25 Hz data (720,000 samples)', () => {
    const sampleCount = 25 * 8 * 3600; // 720,000
    const flow = new Float32Array(sampleCount);
    const pressure = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      flow[i] = Math.sin(i * 0.01) * 30;
      pressure[i] = 12 + Math.sin(i * 0.001) * 2;
    }

    const buffer = buildWaveformBlob(flow, pressure);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(2);
    expect(parsed.flow.length).toBe(sampleCount);
    expect(parsed.pressure!.length).toBe(sampleCount);

    // Spot-check values
    expect(parsed.flow[0]).toBeCloseTo(flow[0]!, 5);
    expect(parsed.flow[sampleCount - 1]).toBeCloseTo(flow[sampleCount - 1]!, 5);
    expect(parsed.pressure![0]).toBeCloseTo(pressure[0]!, 5);
    expect(parsed.pressure![sampleCount - 1]).toBeCloseTo(pressure[sampleCount - 1]!, 5);
  });
});

// ── Negative and extreme values ─────────────────────────────

describe('negative and extreme values', () => {
  it('preserves negative flow values', () => {
    const flow = new Float32Array([-30.5, -15.2, 0, 20.1, 35.7]);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    for (let i = 0; i < flow.length; i++) {
      expect(parsed.flow[i]).toBeCloseTo(flow[i]!, 5);
    }
  });

  it('preserves very small values near zero', () => {
    const flow = new Float32Array([0.001, -0.001, 0.0001, -0.0001]);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    for (let i = 0; i < flow.length; i++) {
      expect(parsed.flow[i]).toBeCloseTo(flow[i]!, 5);
    }
  });
});

// ── Single sample ───────────────────────────────────────────

describe('single sample', () => {
  it('round-trips a single flow sample', () => {
    const flow = new Float32Array([42.0]);
    const buffer = buildWaveformBlob(flow, null);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.flow.length).toBe(1);
    expect(parsed.flow[0]).toBeCloseTo(42.0);
  });

  it('round-trips a single dual-channel sample', () => {
    const flow = new Float32Array([42.0]);
    const pressure = new Float32Array([14.5]);
    const buffer = buildWaveformBlob(flow, pressure);
    const parsed = parseWaveformBlob(buffer);

    expect(parsed.channelCount).toBe(2);
    expect(parsed.flow.length).toBe(1);
    expect(parsed.flow[0]).toBeCloseTo(42.0);
    expect(parsed.pressure!.length).toBe(1);
    expect(parsed.pressure![0]).toBeCloseTo(14.5);
  });
});
