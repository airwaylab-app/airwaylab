import { describe, it, expect } from 'vitest';
import { parseEDF } from '@/lib/parsers/edf-parser';

/**
 * Build a minimal valid EDF buffer with a single flow signal.
 *
 * EDF spec:
 *   Fixed header: 256 bytes
 *   Per-signal header: 256 bytes each (label 16 + transducer 80 + physDim 8
 *     + physMin 8 + physMax 8 + digMin 8 + digMax 8 + prefilter 80 + numSamples 8 + reserved 32)
 *   Data records: numRecords * samplesPerRecord * 2 bytes (Int16LE)
 */
function buildEDFBuffer(opts: {
  numDataRecords: number;
  samplesPerRecord: number;
  /** Number of complete data records to actually include in the buffer (for truncation testing). */
  actualRecords?: number;
}): ArrayBuffer {
  const { numDataRecords, samplesPerRecord } = opts;
  const actualRecords = opts.actualRecords ?? numDataRecords;
  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;
  const bytesPerRecord = samplesPerRecord * 2;
  const dataBytes = actualRecords * bytesPerRecord;
  const totalSize = headerBytes + dataBytes;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  // Helper: write a padded ASCII field
  function writeField(offset: number, length: number, value: string): void {
    const padded = value.padEnd(length, ' ');
    const bytes = encoder.encode(padded.slice(0, length));
    new Uint8Array(buffer, offset, length).set(bytes);
  }

  // -- Fixed header (256 bytes) --
  writeField(0, 8, '0');                                    // version
  writeField(8, 80, '');                                     // patientId
  writeField(88, 80, '');                                    // recordingId
  writeField(168, 8, '10.01.25');                            // startDate (dd.MM.yy)
  writeField(176, 8, '22.30.00');                            // startTime (hh.mm.ss)
  writeField(184, 8, String(headerBytes));                   // headerBytes
  writeField(192, 44, '');                                   // reserved
  writeField(236, 8, String(numDataRecords));                // numDataRecords (what header claims)
  writeField(244, 8, '1');                                   // recordDuration (1 second)
  writeField(252, 4, String(numSignals));                    // numSignals

  // -- Per-signal header fields (1 signal) --
  let offset = 256;

  // Labels (16 bytes each)
  writeField(offset, 16, 'Flow');
  offset += numSignals * 16;

  // Transducer (80 bytes each)
  writeField(offset, 80, '');
  offset += numSignals * 80;

  // Physical dimension (8 bytes each)
  writeField(offset, 8, 'L/min');
  offset += numSignals * 8;

  // Physical min (8 bytes each)
  writeField(offset, 8, '-100');
  offset += numSignals * 8;

  // Physical max (8 bytes each)
  writeField(offset, 8, '100');
  offset += numSignals * 8;

  // Digital min (8 bytes each)
  writeField(offset, 8, '-32768');
  offset += numSignals * 8;

  // Digital max (8 bytes each)
  writeField(offset, 8, '32767');
  offset += numSignals * 8;

  // Prefiltering (80 bytes each)
  writeField(offset, 80, '');
  offset += numSignals * 80;

  // Num samples per record (8 bytes each)
  writeField(offset, 8, String(samplesPerRecord));
  offset += numSignals * 8;

  // Reserved (32 bytes each)
  writeField(offset, 32, '');
  offset += numSignals * 32;

  // -- Data records: write simple sine-ish Int16 values --
  let dataPtr = headerBytes;
  for (let rec = 0; rec < actualRecords; rec++) {
    for (let s = 0; s < samplesPerRecord; s++) {
      // Simple waveform: oscillating positive/negative values
      const value = Math.round(10000 * Math.sin((2 * Math.PI * s) / samplesPerRecord));
      view.setInt16(dataPtr, value, true);
      dataPtr += 2;
    }
  }

  return buffer;
}

describe('EDF Parser — Truncation Handling', () => {
  it('parses a normal (non-truncated) file correctly', () => {
    const buffer = buildEDFBuffer({ numDataRecords: 10, samplesPerRecord: 25 });
    const result = parseEDF(buffer, 'test/BRP.edf');

    expect(result.truncated).toBeUndefined();
    expect(result.recordsParsed).toBeUndefined();
    expect(result.recordsExpected).toBeUndefined();
    expect(result.flowData.length).toBe(10 * 25);
    expect(result.durationSeconds).toBe(10);
    expect(result.samplingRate).toBe(25);
  });

  it('parses available complete records from a truncated file', () => {
    // Header says 10 records but buffer only has 7 complete records
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      actualRecords: 7,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    expect(result.flowData.length).toBe(7 * 25);
    expect(result.durationSeconds).toBe(7);
  });

  it('sets truncated flag on truncated files', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      actualRecords: 7,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    expect(result.truncated).toBe(true);
  });

  it('reports recordsParsed < recordsExpected on truncated files', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      actualRecords: 7,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    expect(result.recordsParsed).toBe(7);
    expect(result.recordsExpected).toBe(10);
    expect(result.recordsParsed!).toBeLessThan(result.recordsExpected!);
  });

  it('throws when zero complete records fit in the buffer', () => {
    // Header says 10 records but buffer has 0 complete records
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      actualRecords: 0,
    });

    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(
      /zero complete data records/
    );
  });

  it('throws for genuinely unusable truncated files (partial record only)', () => {
    // Build a buffer with the header but only a few bytes of data (not enough for one record)
    const numSignals = 1;
    const samplesPerRecord = 25;
    const headerBytes = 256 + numSignals * 256;
    const partialDataBytes = 10; // Not enough for one full record (25 * 2 = 50 bytes needed)
    const totalSize = headerBytes + partialDataBytes;

    const buffer = new ArrayBuffer(totalSize);
    const encoder = new TextEncoder();

    function writeField(offset: number, length: number, value: string): void {
      const padded = value.padEnd(length, ' ');
      const bytes = encoder.encode(padded.slice(0, length));
      new Uint8Array(buffer, offset, length).set(bytes);
    }

    // Minimal valid header
    let offset = 0;
    writeField(offset, 8, '0'); offset = 8;
    writeField(offset, 80, ''); offset = 88;
    writeField(offset, 80, ''); offset = 168;
    writeField(offset, 8, '10.01.25'); offset = 176;
    writeField(offset, 8, '22.30.00'); offset = 184;
    writeField(offset, 8, String(headerBytes)); offset = 192;
    writeField(offset, 44, ''); offset = 236;
    writeField(offset, 8, '10'); offset = 244;       // claims 10 records
    writeField(offset, 8, '1'); offset = 252;
    writeField(offset, 4, '1'); offset = 256;

    // Signal headers
    writeField(offset, 16, 'Flow'); offset += 16;
    writeField(offset, 80, ''); offset += 80;
    writeField(offset, 8, 'L/min'); offset += 8;
    writeField(offset, 8, '-100'); offset += 8;
    writeField(offset, 8, '100'); offset += 8;
    writeField(offset, 8, '-32768'); offset += 8;
    writeField(offset, 8, '32767'); offset += 8;
    writeField(offset, 80, ''); offset += 80;
    writeField(offset, 8, String(samplesPerRecord)); offset += 8;
    writeField(offset, 32, '');

    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(
      /zero complete data records/
    );
  });

  it('handles truncation at exact record boundary (no partial data)', () => {
    // Buffer has exactly 5 complete records out of 10 expected
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      actualRecords: 5,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    expect(result.truncated).toBe(true);
    expect(result.recordsParsed).toBe(5);
    expect(result.recordsExpected).toBe(10);
    expect(result.flowData.length).toBe(5 * 25);
  });

  it('parses flow data values correctly from truncated files', () => {
    // Ensure the actual data values are correct, not just the count
    const buffer = buildEDFBuffer({
      numDataRecords: 4,
      samplesPerRecord: 25,
      actualRecords: 2,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    // Flow data should have real values (not all zeros)
    const hasNonZero = Array.from(result.flowData).some((v) => v !== 0);
    expect(hasNonZero).toBe(true);
    expect(result.flowData.length).toBe(2 * 25);
  });

  it('preserves sampling rate from truncated files', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 50,
      actualRecords: 3,
    });
    const result = parseEDF(buffer, 'test/BRP.edf');

    // samplingRate = numSamples / recordDuration = 50 / 1 = 50
    expect(result.samplingRate).toBe(50);
  });
});
