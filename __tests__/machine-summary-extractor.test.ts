import { describe, it, expect } from 'vitest';
import { extractMachineSummary } from '@/lib/parsers/machine-summary-extractor';

// ============================================================
// Helpers — build synthetic STR.edf buffers
// ============================================================

/**
 * Build a minimal STR.edf buffer with specified signal labels and daily values.
 * Each signal has 1 sample per data record. Each data record = 1 day.
 */
function buildSTRBuffer(
  signalDefs: { label: string; values: number[]; physMin?: number; physMax?: number }[]
): ArrayBuffer {
  // Always include Date signal (required for extractMachineSummary)
  const allSignals = signalDefs;
  const numSignals = allSignals.length;
  const numDataRecords = allSignals[0]?.values.length ?? 1;
  const samplesPerRecord = 1; // 1 sample per signal per record
  const headerBytes = 256 + numSignals * 256;
  const dataSize = numDataRecords * numSignals * samplesPerRecord * 2; // int16
  const totalSize = headerBytes + dataSize;

  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const rawView = new Uint8Array(buf);
  const encoder = new TextEncoder();

  // Fixed header (256 bytes)
  writeField(rawView, encoder, 0, '0', 8);
  writeField(rawView, encoder, 8, '', 80);   // patientId
  writeField(rawView, encoder, 88, '', 80);  // recordingId
  writeField(rawView, encoder, 168, '01.01.26', 8); // startDate
  writeField(rawView, encoder, 176, '00.00.00', 8); // startTime
  writeField(rawView, encoder, 184, String(headerBytes), 8);
  writeField(rawView, encoder, 192, '', 44); // reserved
  writeField(rawView, encoder, 236, String(numDataRecords), 8);
  writeField(rawView, encoder, 244, '86400', 8); // recordDuration = 1 day in seconds
  writeField(rawView, encoder, 252, String(numSignals), 4);

  // Per-signal header fields (in blocks of numSignals)
  let offset = 256;

  // Labels (16 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 16, allSignals[i]!.label, 16);
  }
  offset += numSignals * 16;

  // Transducers (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 80, '', 80);
  }
  offset += numSignals * 80;

  // Physical dimension (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 8, '', 8);
  }
  offset += numSignals * 8;

  // Physical min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    const physMin = allSignals[i]!.physMin ?? 0;
    writeField(rawView, encoder, offset + i * 8, String(physMin), 8);
  }
  offset += numSignals * 8;

  // Physical max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    const physMax = allSignals[i]!.physMax ?? 100;
    writeField(rawView, encoder, offset + i * 8, String(physMax), 8);
  }
  offset += numSignals * 8;

  // Digital min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 8, '0', 8);
  }
  offset += numSignals * 8;

  // Digital max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 8, '32767', 8);
  }
  offset += numSignals * 8;

  // Prefiltering (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 80, '', 80);
  }
  offset += numSignals * 80;

  // Samples per record (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 8, String(samplesPerRecord), 8);
  }
  offset += numSignals * 8;

  // Reserved (32 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(rawView, encoder, offset + i * 32, '', 32);
  }

  // Data records — write int16 values
  // Physical value = (digital - digMin) * scale + physMin
  // So digital = (physical - physMin) / scale + digMin
  // Where scale = (physMax - physMin) / (digMax - digMin) = (physMax - physMin) / 32767
  let dataPtr = headerBytes;
  for (let rec = 0; rec < numDataRecords; rec++) {
    for (let sig = 0; sig < numSignals; sig++) {
      const physMin = allSignals[sig]!.physMin ?? 0;
      const physMax = allSignals[sig]!.physMax ?? 100;
      const scale = (physMax - physMin) / 32767;
      const physical = allSignals[sig]!.values[rec] ?? 0;
      const digital = Math.round((physical - physMin) / scale);
      view.setInt16(dataPtr, digital, true);
      dataPtr += 2;
    }
  }

  return buf;
}

function writeField(view: Uint8Array, encoder: TextEncoder, offset: number, value: string, length: number): void {
  const padded = value.padEnd(length).slice(0, length);
  const bytes = encoder.encode(padded);
  view.set(bytes, offset);
}

// ============================================================
// Tests
// ============================================================

describe('extractMachineSummary', () => {
  it('extracts AHI and event indices from STR signals', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'AHI', values: [5.3], physMin: 0, physMax: 100 },
      { label: 'OAI', values: [2.1], physMin: 0, physMax: 100 },
      { label: 'CAI', values: [1.0], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const dates = Object.keys(result);
    expect(dates).toHaveLength(1);

    const day = result[dates[0]!]!;
    expect(day.ahi).toBeCloseTo(5.3, 1);
    expect(day.oai).toBeCloseTo(2.1, 1);
    expect(day.cai).toBeCloseTo(1.0, 1);
  });

  it('extracts new RIN (RERA index) signal', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'RIN', values: [8.5], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    expect(day.reraIndex).toBeCloseTo(8.5, 1);
  });

  it('extracts new CSR (Cheyne-Stokes %) signal', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'CSR', values: [12.3], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    expect(day.csrPercentage).toBeCloseTo(12.3, 1);
  });

  it('extracts new MaskPress.Max signal', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'MaskPress.Max', values: [18.5], physMin: 0, physMax: 30 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    expect(day.maskPressMax).toBeCloseTo(18.5, 1);
  });

  it('defaults missing signals to null', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'AHI', values: [3.0], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    expect(day.reraIndex).toBeNull();
    expect(day.csrPercentage).toBeNull();
    expect(day.maskPressMax).toBeNull();
    expect(day.leak50).toBeNull();
    expect(day.spo2_50).toBeNull();
  });

  it('extracts fault flags correctly', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'Fault.Device', values: [1], physMin: 0, physMax: 1 },
      { label: 'Fault.Alarm', values: [0], physMin: 0, physMax: 1 },
      { label: 'Fault.Humidifier', values: [1], physMin: 0, physMax: 1 },
      { label: 'Fault.HeatedTube', values: [0], physMin: 0, physMax: 1 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    expect(day.faultDevice).toBe(true);
    expect(day.faultAlarm).toBe(false);
    expect(day.faultHumidifier).toBe(true);
    expect(day.faultHeatedTube).toBe(false);
    expect(day.anyFault).toBe(true);
  });

  it('extracts multiple days from multi-record STR', () => {
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0, 1, 2], physMin: 0, physMax: 36500 },
      { label: 'AHI', values: [3.0, 5.0, 2.0], physMin: 0, physMax: 100 },
      { label: 'RIN', values: [4.0, 6.0, 3.0], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    expect(Object.keys(result)).toHaveLength(3);

    const days = Object.values(result);
    expect(days[0]!.ahi).toBeCloseTo(3.0, 1);
    expect(days[0]!.reraIndex).toBeCloseTo(4.0, 1);
    expect(days[1]!.ahi).toBeCloseTo(5.0, 1);
    expect(days[1]!.reraIndex).toBeCloseTo(6.0, 1);
    expect(days[2]!.ahi).toBeCloseTo(2.0, 1);
    expect(days[2]!.reraIndex).toBeCloseTo(3.0, 1);
  });

  it('returns empty object when Date signal is missing', () => {
    const buf = buildSTRBuffer([
      { label: 'AHI', values: [5.0], physMin: 0, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('clamps negative event indices to zero', () => {
    // Digital-to-physical conversion can sometimes produce small negatives
    const buf = buildSTRBuffer([
      { label: 'Date', values: [0], physMin: 0, physMax: 36500 },
      { label: 'AHI', values: [0], physMin: -0.1, physMax: 100 },
    ]);

    const result = extractMachineSummary(buf, 'AirSense 11');
    const day = Object.values(result)[0]!;
    // The actual value might be slightly negative due to quantization, but should be clamped to 0
    expect(day.ahi).toBeGreaterThanOrEqual(0);
  });
});
