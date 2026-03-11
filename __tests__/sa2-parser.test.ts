// ============================================================
// AirwayLab — SA2 EDF Parser Tests
// Tests for parsing ResMed SA2 pulse oximetry EDF files
// ============================================================

import { describe, it, expect } from 'vitest';
import { parseSA2 } from '@/lib/parsers/sa2-parser';
import { filterSA2Files } from '@/lib/parsers/night-grouper';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Build a minimal EDF buffer with the given signals and data records.
 * Follows the EDF spec: 256-byte fixed header + ns*256-byte signal headers + data records.
 */
function buildSA2Buffer(options: {
  startDate?: string; // dd.MM.yy
  startTime?: string; // HH.MM.SS
  signals: {
    label: string;
    physicalDimension: string;
    physicalMin: number;
    physicalMax: number;
    digitalMin: number;
    digitalMax: number;
    numSamples: number; // samples per data record
  }[];
  dataRecords: number[][]; // [record][all samples interleaved by signal]
}): ArrayBuffer {
  const { signals, dataRecords, startDate = '11.03.26', startTime = '23.00.00' } = options;
  const ns = signals.length;
  const numDataRecords = dataRecords.length;
  const headerBytes = 256 + ns * 256;

  // Calculate total data size
  const samplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  const totalBytes = headerBytes + numDataRecords * samplesPerRecord * 2;
  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  // Write fixed header
  function writeField(offset: number, length: number, value: string): void {
    const padded = value.padEnd(length);
    const bytes = encoder.encode(padded.slice(0, length));
    new Uint8Array(buffer, offset, length).set(bytes);
  }

  writeField(0, 8, '0');              // version
  writeField(8, 80, '');              // patient ID
  writeField(88, 80, '');             // recording ID
  writeField(168, 8, startDate);      // start date
  writeField(176, 8, startTime);      // start time
  writeField(184, 8, String(headerBytes)); // header bytes
  writeField(192, 44, '');            // reserved
  writeField(236, 8, String(numDataRecords)); // num data records
  writeField(244, 8, '1');            // record duration (1 second)
  writeField(252, 4, String(ns));     // num signals

  // Write per-signal headers
  let offset = 256;

  // Labels (16 bytes each)
  for (const s of signals) { writeField(offset, 16, s.label); offset += 16; }
  // Transducer types (80 bytes each)
  for (let i = 0; i < ns; i++) { writeField(offset, 80, ''); offset += 80; }
  // Physical dimensions (8 bytes each)
  for (const s of signals) { writeField(offset, 8, s.physicalDimension); offset += 8; }
  // Physical minimums (8 bytes each)
  for (const s of signals) { writeField(offset, 8, String(s.physicalMin)); offset += 8; }
  // Physical maximums (8 bytes each)
  for (const s of signals) { writeField(offset, 8, String(s.physicalMax)); offset += 8; }
  // Digital minimums (8 bytes each)
  for (const s of signals) { writeField(offset, 8, String(s.digitalMin)); offset += 8; }
  // Digital maximums (8 bytes each)
  for (const s of signals) { writeField(offset, 8, String(s.digitalMax)); offset += 8; }
  // Prefiltering (80 bytes each)
  for (let i = 0; i < ns; i++) { writeField(offset, 80, ''); offset += 80; }
  // Num samples per record (8 bytes each)
  for (const s of signals) { writeField(offset, 8, String(s.numSamples)); offset += 8; }
  // Reserved (32 bytes each)
  for (let i = 0; i < ns; i++) { writeField(offset, 32, ''); offset += 32; }

  // Write data records
  let dataOffset = headerBytes;
  for (const record of dataRecords) {
    for (const sample of record) {
      view.setInt16(dataOffset, sample, true); // little-endian
      dataOffset += 2;
    }
  }

  return buffer;
}

/**
 * Build a standard SA2 buffer with SpO2=97 and Pulse=72 for N records.
 * Uses 1:1 digital-to-physical mapping for simplicity.
 */
function buildStandardSA2(
  numRecords: number,
  opts?: { startDate?: string; startTime?: string; filePath?: string }
): { buffer: ArrayBuffer; filePath: string } {
  const spo2Value = 97;
  const pulseValue = 72;

  const buffer = buildSA2Buffer({
    startDate: opts?.startDate,
    startTime: opts?.startTime,
    signals: [
      { label: 'SpO2', physicalDimension: '%', physicalMin: 0, physicalMax: 100, digitalMin: 0, digitalMax: 100, numSamples: 1 },
      { label: 'Pulse', physicalDimension: 'BPM', physicalMin: 0, physicalMax: 250, digitalMin: 0, digitalMax: 250, numSamples: 1 },
    ],
    dataRecords: Array.from({ length: numRecords }, () => [spo2Value, pulseValue]),
  });

  return {
    buffer,
    filePath: opts?.filePath ?? 'DATALOG/20260311/20260311_230000_SA2.edf',
  };
}

// ── Test 1: Parse synthetic SA2 EDF with SpO2 + Pulse ────────

describe('parseSA2', () => {
  it('parses SA2 EDF with SpO2 + Pulse signals into valid ParsedOximetry', () => {
    const { buffer, filePath } = buildStandardSA2(60); // 60 seconds of data

    const result = parseSA2(buffer, filePath);

    expect(result.samples).toHaveLength(60);
    expect(result.durationSeconds).toBe(59); // 60 samples at 1Hz = 59s between first and last
    expect(result.dateStr).toBe('2026-03-11');

    // Check sample structure
    const sample = result.samples[0];
    expect(sample.spo2).toBe(97);
    expect(sample.hr).toBe(72);
    expect(sample.motion).toBe(0);
    expect(sample.valid).toBe(true);
  });

  // ── Test 2: SpO2 out of range → valid: false ──────────────

  it('marks samples with SpO2 outside 50–100 as invalid', () => {
    const buffer = buildSA2Buffer({
      signals: [
        { label: 'SpO2', physicalDimension: '%', physicalMin: 0, physicalMax: 100, digitalMin: 0, digitalMax: 100, numSamples: 1 },
        { label: 'Pulse', physicalDimension: 'BPM', physicalMin: 0, physicalMax: 250, digitalMin: 0, digitalMax: 250, numSamples: 1 },
      ],
      dataRecords: [
        [97, 72],  // valid
        [40, 72],  // SpO2 too low
        [0, 72],   // SpO2 zero
        [95, 72],  // valid
      ],
    });

    const result = parseSA2(buffer, 'DATALOG/20260311/test_SA2.edf');

    expect(result.samples[0].valid).toBe(true);
    expect(result.samples[1].valid).toBe(false);
    expect(result.samples[1].spo2).toBe(-1);
    expect(result.samples[2].valid).toBe(false);
    expect(result.samples[3].valid).toBe(true);
  });

  // ── Test 3: No SpO2 signal → throws ───────────────────────

  it('throws when no SpO2 signal is found', () => {
    const buffer = buildSA2Buffer({
      signals: [
        { label: 'Flow', physicalDimension: 'L/min', physicalMin: -2, physicalMax: 2, digitalMin: -32768, digitalMax: 32767, numSamples: 1 },
      ],
      dataRecords: [[100]],
    });

    expect(() => parseSA2(buffer, 'test_SA2.edf')).toThrow(/SpO2/i);
  });

  // ── Test 4: SpO2 only (no Pulse signal) → HR = -1 ─────────

  it('returns samples with HR=-1 when no Pulse signal found', () => {
    const buffer = buildSA2Buffer({
      signals: [
        { label: 'SpO2', physicalDimension: '%', physicalMin: 0, physicalMax: 100, digitalMin: 0, digitalMax: 100, numSamples: 1 },
      ],
      dataRecords: [[97], [95], [96]],
    });

    const result = parseSA2(buffer, 'DATALOG/20260311/test_SA2.edf');

    expect(result.samples).toHaveLength(3);
    expect(result.samples[0].hr).toBe(-1);
    expect(result.samples[0].spo2).toBe(97);
    // valid should still be true when SpO2 is in range (no pulse doesn't invalidate)
    expect(result.samples[0].valid).toBe(true);
  });

  // ── Test 5: 0 data records → throws ───────────────────────

  it('throws when EDF has 0 data records', () => {
    const buffer = buildSA2Buffer({
      signals: [
        { label: 'SpO2', physicalDimension: '%', physicalMin: 0, physicalMax: 100, digitalMin: 0, digitalMax: 100, numSamples: 1 },
      ],
      dataRecords: [],
    });

    expect(() => parseSA2(buffer, 'test_SA2.edf')).toThrow(/no data/i);
  });

  // ── Test 6: dateStr from DATALOG folder path ──────────────

  it('extracts dateStr from DATALOG folder path', () => {
    const { buffer } = buildStandardSA2(10, { startDate: '15.01.26', startTime: '23.30.00' });

    const result = parseSA2(buffer, 'SD_Card/DATALOG/20260115/20260115_233000_SA2.edf');
    expect(result.dateStr).toBe('2026-01-15');
  });

  // ── Test 7: dateStr time heuristic fallback ────────────────

  it('uses time heuristic when no DATALOG path — 23:00 recording → current date', () => {
    const { buffer } = buildStandardSA2(10, { startDate: '11.03.26', startTime: '23.00.00' });
    const result = parseSA2(buffer, 'some_folder/20260311_230000_SA2.edf');
    expect(result.dateStr).toBe('2026-03-11');
  });

  it('uses time heuristic when no DATALOG path — 02:00 recording → previous date', () => {
    const { buffer } = buildStandardSA2(10, { startDate: '12.03.26', startTime: '02.00.00' });
    const result = parseSA2(buffer, 'some_folder/20260312_020000_SA2.edf');
    expect(result.dateStr).toBe('2026-03-11');
  });

  // ── Test 10: Flexible signal label matching ────────────────

  it('matches SpO2 signal label variants case-insensitively', () => {
    const variants = ['SPO2', 'Sp O2', 'SpO2 %', 'spo2'];

    for (const label of variants) {
      const buffer = buildSA2Buffer({
        signals: [
          { label, physicalDimension: '%', physicalMin: 0, physicalMax: 100, digitalMin: 0, digitalMax: 100, numSamples: 1 },
        ],
        dataRecords: [[95]],
      });

      const result = parseSA2(buffer, 'DATALOG/20260311/test_SA2.edf');
      expect(result.samples[0].spo2).toBe(95);
    }
  });

  // ── Test 11: Correct timestamps from sampling rate ─────────

  it('generates correct timestamps based on sampling rate', () => {
    const { buffer } = buildStandardSA2(5, { startDate: '11.03.26', startTime: '23.00.00' });
    const result = parseSA2(buffer, 'DATALOG/20260311/test_SA2.edf');

    // At 1 Hz: samples at t=0s, 1s, 2s, 3s, 4s
    const t0 = result.samples[0].time.getTime();
    const t1 = result.samples[1].time.getTime();
    const t4 = result.samples[4].time.getTime();

    expect(t1 - t0).toBe(1000); // 1 second between samples
    expect(t4 - t0).toBe(4000); // 4 seconds total
  });

  // ── Test 12: Truncated EDF buffer → throws ─────────────────

  it('throws on truncated EDF buffer', () => {
    const { buffer } = buildStandardSA2(60);

    // Truncate after the header but before all data records are present.
    // Header = 256 + 2 signals * 256 = 768 bytes. Keep header + a few bytes of data.
    const headerSize = 256 + 2 * 256;
    const truncated = buffer.slice(0, headerSize + 10);

    expect(() => parseSA2(truncated, 'test_SA2.edf')).toThrow(/truncated/i);
  });
});

// ── filterSA2Files tests ─────────────────────────────────────

describe('filterSA2Files', () => {
  // ── Test 8: Matches SA2 file variants ──────────────────────

  it('matches SA2 EDF files case-insensitively', () => {
    const files = [
      { name: '20260311_230000_SA2.edf', path: 'a/_SA2.edf', size: 1000 },
      { name: '20260311_230000_sa2.edf', path: 'b/_sa2.edf', size: 1000 },
      { name: 'SA2.EDF', path: 'c/SA2.EDF', size: 1000 },
    ];

    const result = filterSA2Files(files);
    expect(result).toHaveLength(3);
  });

  // ── Test 9: Does NOT match non-SA2 files ───────────────────

  it('does not match BRP, STR, or SA (non-SA2) files', () => {
    const files = [
      { name: '20260311_230000_BRP.edf', path: 'a/BRP.edf', size: 100000 },
      { name: 'STR.edf', path: 'b/STR.edf', size: 50000 },
      { name: '20260311_230000_SA.edf', path: 'c/_SA.edf', size: 1000 },
      { name: '20260311_230000_EVE.edf', path: 'd/_EVE.edf', size: 1000 },
    ];

    const result = filterSA2Files(files);
    expect(result).toHaveLength(0);
  });
});
