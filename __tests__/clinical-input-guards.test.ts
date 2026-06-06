/**
 * Clinical input-validation guards (b5)
 *
 * These tests cover the input-validation guards added to the PROTECTED
 * parser/analyzer modules:
 *   - lib/parsers/edf-parser.ts  (headerBytes / recordDuration / numSamples / samplingRate)
 *   - lib/analyzers/wat-engine.ts (samplingRate entry guard)
 *
 * The guards are input-validation ONLY. The first describe block is a
 * GOLDEN-OUTPUT REGRESSION: it parses a real, representative EDF night through
 * all three engines and asserts the Glasgow / WAT / NED outputs are IDENTICAL
 * to a captured baseline, proving the guards do not change results for any
 * valid input. The remaining blocks prove malformed inputs are rejected with a
 * clear error instead of being silently mis-decoded or hanging the worker.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEDF, EDFValidationError } from '@/lib/parsers/edf-parser';
import { computeGlasgowIndex } from '@/lib/analyzers/glasgow-index';
import { computeWAT } from '@/lib/analyzers/wat-engine';
import { computeNED } from '@/lib/analyzers/ned-engine';
import type { EDFFile } from '@/lib/types';

const FIXTURES = path.resolve(__dirname, 'fixtures/sd-card');

function parseFixture(relativePath: string): EDFFile {
  const buf = fs.readFileSync(path.join(FIXTURES, relativePath));
  return parseEDF(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    relativePath
  );
}

// ──────────────────────────────────────────────────────────────────────────
// GOLDEN-OUTPUT REGRESSION
//
// Baseline captured from origin/main (commit 4f4fb65), BEFORE the guards were
// added, by parsing the real fixture below and running all three engines.
// If a guard ever alters a computed result for valid input, one of these exact
// assertions will fail.
// ──────────────────────────────────────────────────────────────────────────

const GOLDEN_FIXTURE = 'DATALOG/20260309/20260310_000159_BRP.edf';

const GOLDEN = {
  samplingRate: 25,
  flowLength: 676500,
  glasgow: {
    overall: 0.74,
    skew: 0.09,
    spike: 0.16,
    flatTop: 0,
    topHeavy: 0.01,
    multiPeak: 0.02,
    noPause: 0.06,
    inspirRate: 0.01,
    multiBreath: 0,
    variableAmp: 0.39,
  },
  wat: {
    flScore: 55.055737689664774,
    regularityScore: 62.62244876774203,
    periodicityIndex: 37.397479236215744,
  },
  // NED exposes large per-breath arrays; we pin the clinical scalar outputs.
  nedScalars: {
    breathCount: 6907,
    nedMean: 9.79,
    nedMedian: 5.38,
    nedP95: 40,
    nedClearFLPct: 6.6,
    nedBorderlinePct: 19.76,
    fiMean: 0.56,
    fiFL85Pct: 0,
    tpeakMean: 0.55,
    mShapePct: 0.72,
    reraIndex: 2.79,
    reraCount: 21,
    h1NedMean: 9.43,
    h2NedMean: 10.14,
    combinedFLPct: 6.6,
    estimatedArousalIndex: 2.8,
    hypopneaCount: 2,
    hypopneaIndex: 0.27,
    hypopneaSource: 'algorithm',
    hypopneaMeanDropPct: 91.13,
    hypopneaMeanDurationS: 12.48,
    briefObstructionCount: 254,
    briefObstructionIndex: 33.79,
    amplitudeCvOverall: 31,
    amplitudeCvMedianEpoch: 24.81,
    unstableEpochPct: 49.45,
  },
} as const;

describe('Golden-output regression — guards do not change valid results', () => {
  it('parses the real fixture and reproduces the captured baseline exactly', () => {
    const edf = parseFixture(GOLDEN_FIXTURE);

    expect(edf.samplingRate).toBe(GOLDEN.samplingRate);
    expect(edf.flowData.length).toBe(GOLDEN.flowLength);

    const glasgow = computeGlasgowIndex(edf.flowData, edf.samplingRate);
    expect(glasgow).toEqual(GOLDEN.glasgow);

    const wat = computeWAT(edf.flowData, edf.samplingRate);
    expect(wat).toEqual(GOLDEN.wat);

    const ned = computeNED(edf.flowData, edf.samplingRate) as unknown as Record<
      string,
      unknown
    >;
    for (const [key, value] of Object.entries(GOLDEN.nedScalars)) {
      expect(ned[key], `NED.${key}`).toEqual(value);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Minimal valid EDF builder (single flow signal), used for the
// malformed-input tests. Mirrors the builder in edf-parser-truncation.test.ts.
// ──────────────────────────────────────────────────────────────────────────

function buildEDFBuffer(opts: {
  numDataRecords: number;
  samplesPerRecord: number;
  /** Override the headerBytes field written into the file (default: correct value). */
  headerBytesOverride?: number;
  /** Override the recordDuration field written into the file (default: '1'). */
  recordDurationField?: string;
  /** Override the samplesPerRecord field written into the signal header. */
  samplesPerRecordField?: string;
}): ArrayBuffer {
  const { numDataRecords, samplesPerRecord } = opts;
  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;
  const bytesPerRecord = samplesPerRecord * 2;
  const dataBytes = numDataRecords * bytesPerRecord;
  const totalSize = headerBytes + dataBytes;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  function writeField(offset: number, length: number, value: string): void {
    const padded = value.padEnd(length, ' ');
    const bytes = encoder.encode(padded.slice(0, length));
    new Uint8Array(buffer, offset, length).set(bytes);
  }

  // Fixed header (256 bytes)
  writeField(0, 8, '0');
  writeField(8, 80, '');
  writeField(88, 80, '');
  writeField(168, 8, '10.01.25');
  writeField(176, 8, '22.30.00');
  writeField(184, 8, String(opts.headerBytesOverride ?? headerBytes));
  writeField(192, 44, '');
  writeField(236, 8, String(numDataRecords));
  writeField(244, 8, opts.recordDurationField ?? '1');
  writeField(252, 4, String(numSignals));

  // Per-signal header (1 signal)
  let offset = 256;
  writeField(offset, 16, 'Flow'); offset += numSignals * 16;
  writeField(offset, 80, ''); offset += numSignals * 80;
  writeField(offset, 8, 'L/min'); offset += numSignals * 8;
  writeField(offset, 8, '-100'); offset += numSignals * 8;
  writeField(offset, 8, '100'); offset += numSignals * 8;
  writeField(offset, 8, '-32768'); offset += numSignals * 8;
  writeField(offset, 8, '32767'); offset += numSignals * 8;
  writeField(offset, 80, ''); offset += numSignals * 80;
  writeField(offset, 8, opts.samplesPerRecordField ?? String(samplesPerRecord));
  offset += numSignals * 8;
  writeField(offset, 32, ''); offset += numSignals * 32;

  // Data records
  let dataPtr = headerBytes;
  for (let rec = 0; rec < numDataRecords; rec++) {
    for (let s = 0; s < samplesPerRecord; s++) {
      const value = Math.round(10000 * Math.sin((2 * Math.PI * s) / samplesPerRecord));
      view.setInt16(dataPtr, value, true);
      dataPtr += 2;
    }
  }

  return buffer;
}

describe('EDF parser — malformed input is rejected (input-validation guards)', () => {
  it('parses a correctly-formed buffer (control)', () => {
    const buffer = buildEDFBuffer({ numDataRecords: 10, samplesPerRecord: 25 });
    const result = parseEDF(buffer, 'test/BRP.edf');
    expect(result.flowData.length).toBe(10 * 25);
    expect(result.samplingRate).toBe(25);
  });

  it('throws EDFValidationError when headerBytes is under-reported', () => {
    // Correct value is 256 + 1*256 = 512; report 256 (drops the signal header).
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      headerBytesOverride: 256,
    });
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(EDFValidationError);
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(/headerBytes=256/);
  });

  it('throws EDFValidationError when headerBytes does not match (over-reported)', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      headerBytesOverride: 1024,
    });
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(EDFValidationError);
  });

  it('throws EDFValidationError when recordDuration is zero', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      recordDurationField: '0',
    });
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(EDFValidationError);
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(/recordDuration/);
  });

  it('throws EDFValidationError when recordDuration is non-numeric (NaN)', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      recordDurationField: 'abc',
    });
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(EDFValidationError);
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(/recordDuration/);
  });

  it('throws EDFValidationError when flow numSamples is zero (zero sampling rate)', () => {
    const buffer = buildEDFBuffer({
      numDataRecords: 10,
      samplesPerRecord: 25,
      samplesPerRecordField: '0',
    });
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(EDFValidationError);
    expect(() => parseEDF(buffer, 'test/BRP.edf')).toThrow(/numSamples/);
  });
});

describe('WAT engine — samplingRate guard prevents worker hang', () => {
  // A non-positive samplingRate makes stepSize = floor(5 * rate) = 0, so the
  // minute-vent loop never advances → infinite loop / worker hang. The guard
  // converts that into an immediate throw. Tests run with a finite timeout so a
  // regression (re-introduced hang) fails instead of stalling the suite.
  const flow = new Float32Array(10000).map((_, i) => 20 * Math.sin(i / 10));

  it('throws on samplingRate = 0 (does not hang)', { timeout: 3000 }, () => {
    expect(() => computeWAT(flow, 0)).toThrow(RangeError);
    expect(() => computeWAT(flow, 0)).toThrow(/samplingRate/);
  });

  it('throws on negative samplingRate (does not hang)', { timeout: 3000 }, () => {
    expect(() => computeWAT(flow, -25)).toThrow(RangeError);
  });

  it('throws on non-finite samplingRate (NaN)', { timeout: 3000 }, () => {
    expect(() => computeWAT(flow, NaN)).toThrow(RangeError);
  });

  it('still computes normally for a valid samplingRate', () => {
    const result = computeWAT(flow, 25);
    expect(result.flScore).toBeGreaterThanOrEqual(0);
    expect(result.flScore).toBeLessThanOrEqual(100);
  });
});
