import { describe, it, expect } from 'vitest';
import { parseCSL } from '@/lib/parsers/csl-parser';
import { filterCSLFiles } from '@/lib/parsers/night-grouper';

// ============================================================
// Helpers — build synthetic CSL.edf files with EDF+ Annotations
// ============================================================

/**
 * Build a minimal valid EDF+ Annotations buffer containing CSR annotations.
 * Follows the same TAL (Time-stamped Annotation List) format as EVE.edf.
 */
function buildCSLBuffer(annotations: { onset: number; label: string }[], options?: {
  numDataRecords?: number;
  recordDuration?: number;
}): ArrayBuffer {
  const numDataRecords = options?.numDataRecords ?? 1;
  const recordDuration = options?.recordDuration ?? 3600; // 1 hour default

  // Build annotation bytes as TAL format:
  // For timekeeping: +onset\x14\x14\x00
  // For event annotations: +onset\x14label\x14\x00
  const annotParts: string[] = [];

  // Add timekeeping TAL first (like real EDF+ files)
  annotParts.push(`+0\x14\x14\x00`);

  for (const ann of annotations) {
    // CSR annotations use onset-only TAL (no duration separator \x15)
    annotParts.push(`+${ann.onset}\x14${ann.label}\x14\x00`);
  }

  const annotString = annotParts.join('');
  const annotBytes = new TextEncoder().encode(annotString);

  // Pad to even number of bytes (EDF requires int16 samples)
  const paddedSize = Math.ceil(annotBytes.length / 2) * 2;

  // EDF header: 256 bytes fixed + 256 bytes per signal (1 signal)
  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;
  const samplesPerRecord = paddedSize / 2;
  const dataSize = numDataRecords * paddedSize;
  const totalSize = headerBytes + dataSize;

  const buf = new ArrayBuffer(totalSize);
  const view = new Uint8Array(buf);
  const encoder = new TextEncoder();

  // Fixed header (256 bytes)
  writeField(view, encoder, 0, '0       ', 8);                      // version
  writeField(view, encoder, 8, '                                                                                ', 80); // patientId
  writeField(view, encoder, 88, '                                                                                ', 80); // recordingId
  writeField(view, encoder, 168, '01.01.26', 8);                    // startDate
  writeField(view, encoder, 176, '22.00.00', 8);                    // startTime
  writeField(view, encoder, 184, String(headerBytes).padEnd(8), 8); // headerBytes
  writeField(view, encoder, 192, 'EDF+C'.padEnd(44), 44);           // reserved (EDF+C = continuous)
  writeField(view, encoder, 236, String(numDataRecords).padEnd(8), 8); // numDataRecords
  writeField(view, encoder, 244, String(recordDuration).padEnd(8), 8); // recordDuration
  writeField(view, encoder, 252, String(numSignals).padEnd(4), 4);  // numSignals

  // Signal header (256 bytes for 1 signal)
  const sigBase = 256;
  writeField(view, encoder, sigBase, 'EDF Annotations '.padEnd(16), 16); // label
  writeField(view, encoder, sigBase + 16, ''.padEnd(80), 80);        // transducer
  writeField(view, encoder, sigBase + 96, ''.padEnd(8), 8);          // physical dimension
  writeField(view, encoder, sigBase + 104, '-1      ', 8);           // physical min
  writeField(view, encoder, sigBase + 112, '1       ', 8);           // physical max
  writeField(view, encoder, sigBase + 120, '-32768  ', 8);           // digital min
  writeField(view, encoder, sigBase + 128, '32767   ', 8);           // digital max
  writeField(view, encoder, sigBase + 136, ''.padEnd(80), 80);       // prefiltering
  writeField(view, encoder, sigBase + 216, String(samplesPerRecord).padEnd(8), 8); // numSamples
  writeField(view, encoder, sigBase + 224, ''.padEnd(32), 32);       // reserved

  // Data records — write annotation bytes
  for (let rec = 0; rec < numDataRecords; rec++) {
    const offset = headerBytes + rec * paddedSize;
    if (rec === 0) {
      view.set(annotBytes, offset);
    }
    // Other records are zero-filled (no annotations)
  }

  return buf;
}

function writeField(view: Uint8Array, encoder: TextEncoder, offset: number, value: string, length: number): void {
  const bytes = encoder.encode(value.padEnd(length).slice(0, length));
  view.set(bytes, offset);
}

// ============================================================
// Tests
// ============================================================

describe('CSL Parser', () => {
  describe('parseCSL — paired CSR episodes', () => {
    it('parses paired CSR Start / CSR End annotations', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 100, label: 'CSR Start' },
        { onset: 400, label: 'CSR End' },
        { onset: 1000, label: 'CSR Start' },
        { onset: 1200, label: 'CSR End' },
      ]));

      expect(result).not.toBeNull();
      expect(result!.episodeCount).toBe(2);
      expect(result!.episodes[0]!.startSec).toBe(100);
      expect(result!.episodes[0]!.endSec).toBe(400);
      expect(result!.episodes[0]!.durationSec).toBe(300);
      expect(result!.episodes[1]!.startSec).toBe(1000);
      expect(result!.episodes[1]!.endSec).toBe(1200);
      expect(result!.episodes[1]!.durationSec).toBe(200);
    });

    it('computes totalCSRSeconds as sum of episode durations', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 100, label: 'CSR Start' },
        { onset: 400, label: 'CSR End' },
        { onset: 1000, label: 'CSR Start' },
        { onset: 1200, label: 'CSR End' },
      ]));

      expect(result).not.toBeNull();
      expect(result!.totalCSRSeconds).toBe(500); // 300 + 200
    });

    it('computes csrPercentage correctly', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 0, label: 'CSR Start' },
        { onset: 360, label: 'CSR End' },
      ], { recordDuration: 3600, numDataRecords: 1 }));

      expect(result).not.toBeNull();
      // 360 / 3600 * 100 = 10%
      expect(result!.csrPercentage).toBe(10);
    });
  });

  describe('parseCSL — unpaired CSR Start', () => {
    it('estimates end as recording end when session ends during CSR', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 3000, label: 'CSR Start' },
        // No CSR End — session ended during CSR
      ], { recordDuration: 3600, numDataRecords: 1 }));

      expect(result).not.toBeNull();
      expect(result!.episodeCount).toBe(1);
      expect(result!.episodes[0]!.startSec).toBe(3000);
      expect(result!.episodes[0]!.endSec).toBe(3600);
      expect(result!.episodes[0]!.durationSec).toBe(600);
    });
  });

  describe('parseCSL — orphan CSR End', () => {
    it('ignores CSR End without preceding CSR Start', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 100, label: 'CSR End' },
        { onset: 500, label: 'CSR Start' },
        { onset: 700, label: 'CSR End' },
      ]));

      expect(result).not.toBeNull();
      expect(result!.episodeCount).toBe(1);
      expect(result!.episodes[0]!.startSec).toBe(500);
      expect(result!.episodes[0]!.endSec).toBe(700);
    });
  });

  describe('parseCSL — error resilience', () => {
    it('returns null for truncated buffer', () => {
      expect(parseCSL(new ArrayBuffer(10))).toBeNull();
    });

    it('returns null for empty buffer', () => {
      expect(parseCSL(new ArrayBuffer(0))).toBeNull();
    });

    it('returns null for buffer with no EDF Annotations signal', () => {
      const buf = new ArrayBuffer(768);
      const view = new Uint8Array(buf);
      const encoder = new TextEncoder();
      writeField(view, encoder, 0, '0       ', 8);
      writeField(view, encoder, 252, '1   ', 4);
      writeField(view, encoder, 256, 'SomeOther       ', 16);
      writeField(view, encoder, 184, '512     ', 8);
      writeField(view, encoder, 236, '0       ', 8);
      writeField(view, encoder, 244, '0.00    ', 8);

      expect(parseCSL(buf)).toBeNull();
    });
  });

  describe('parseCSL — empty file', () => {
    it('returns empty episodes when no CSR annotations present', () => {
      const result = parseCSL(buildCSLBuffer([]));

      expect(result).not.toBeNull();
      expect(result!.episodeCount).toBe(0);
      expect(result!.episodes).toHaveLength(0);
      expect(result!.totalCSRSeconds).toBe(0);
      expect(result!.csrPercentage).toBe(0);
    });
  });

  describe('parseCSL — skips Recording starts', () => {
    it('ignores Recording starts annotation', () => {
      const result = parseCSL(buildCSLBuffer([
        { onset: 500, label: 'CSR Start' },
        { onset: 700, label: 'CSR End' },
      ]));

      // The timekeeping TAL is included in buildCSLBuffer already
      expect(result).not.toBeNull();
      expect(result!.episodeCount).toBe(1);
    });
  });
});

describe('filterCSLFiles', () => {
  it('matches _CSL.edf files', () => {
    const files = [
      { name: '20260111_210642_CSL.edf', path: 'DATALOG/20260111/20260111_210642_CSL.edf', size: 1000 },
      { name: '20260111_210642_BRP.edf', path: 'DATALOG/20260111/20260111_210642_BRP.edf', size: 500000 },
      { name: 'STR.edf', path: 'STR.edf', size: 10000 },
    ];

    const result = filterCSLFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('20260111_210642_CSL.edf');
  });

  it('matches case-insensitively', () => {
    const files = [
      { name: '20260111_210642_csl.edf', path: 'test/20260111_210642_csl.edf', size: 500 },
      { name: '20260111_210642_CSL.EDF', path: 'test/20260111_210642_CSL.EDF', size: 500 },
    ];

    const result = filterCSLFiles(files);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no CSL files', () => {
    const files = [
      { name: 'BRP.edf', path: 'test/BRP.edf', size: 500000 },
      { name: 'STR.edf', path: 'test/STR.edf', size: 10000 },
    ];

    const result = filterCSLFiles(files);
    expect(result).toHaveLength(0);
  });

  it('does not match partial CSL in filename', () => {
    const files = [
      { name: 'EXCLUSION_CSL.edf', path: 'test/EXCLUSION_CSL.edf', size: 500 },
      { name: 'CSLDATA.edf', path: 'test/CSLDATA.edf', size: 500 },
    ];

    // EXCLUSION_CSL.edf ends with _CSL.edf so it should match
    // CSLDATA.edf does not end with CSL.edf properly
    const result = filterCSLFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('EXCLUSION_CSL.edf');
  });
});
