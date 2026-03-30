import { describe, it, expect } from 'vitest';
import { parseEDF, parseSTR } from '@/lib/parsers/edf-parser';

// ============================================================
// Helpers — build synthetic EDF binary data
// ============================================================

interface SignalSpec {
  label: string;
  physicalDimension: string;
  physicalMin: number;
  physicalMax: number;
  digitalMin: number;
  digitalMax: number;
  numSamples: number;
  /** Generator for sample values (receives sample index within a record). Defaults to sine wave. */
  generator?: (sampleIndex: number, recordIndex: number) => number;
}

interface EDFBuildOptions {
  version?: string;
  patientId?: string;
  recordingId?: string;
  startDate?: string; // dd.MM.yy
  startTime?: string; // hh.mm.ss
  numDataRecords: number;
  recordDuration?: number;
  signals: SignalSpec[];
  /** Number of complete data records to actually write (for truncation). Defaults to numDataRecords. */
  actualRecords?: number;
  /** Extra garbage bytes appended after actual records (partial record simulation). */
  extraPartialBytes?: number;
}

/**
 * Build a synthetic EDF binary buffer from spec.
 * Follows the EDF specification:
 *   - Fixed header: 256 bytes
 *   - Per-signal header: 256 bytes per signal
 *   - Data records: interleaved signals, Int16LE samples
 */
function buildEDF(opts: EDFBuildOptions): ArrayBuffer {
  const {
    version = '0',
    patientId = '',
    recordingId = '',
    startDate = '15.03.24',
    startTime = '23.15.00',
    numDataRecords,
    recordDuration = 1,
    signals,
  } = opts;

  const numSignals = signals.length;
  const actualRecords = opts.actualRecords ?? numDataRecords;
  const headerBytes = 256 + numSignals * 256;
  const samplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  const bytesPerRecord = samplesPerRecord * 2;
  const dataBytes = actualRecords * bytesPerRecord + (opts.extraPartialBytes ?? 0);
  const totalSize = headerBytes + dataBytes;

  const buffer = new ArrayBuffer(totalSize);
       
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  function writeField(offset: number, length: number, value: string): void {
    const padded = value.padEnd(length, ' ');
    const bytes = encoder.encode(padded.slice(0, length));
    new Uint8Array(buffer, offset, length).set(bytes);
  }

  // -- Fixed header (256 bytes) --
  writeField(0, 8, version);
  writeField(8, 80, patientId);
  writeField(88, 80, recordingId);
  writeField(168, 8, startDate);
  writeField(176, 8, startTime);
  writeField(184, 8, String(headerBytes));
  writeField(192, 44, '');
  writeField(236, 8, String(numDataRecords));
  writeField(244, 8, String(recordDuration));
  writeField(252, 4, String(numSignals));

  // -- Per-signal header fields --
  let offset = 256;

  // Labels (16 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 16, 16, signals[i]!.label);
  }
  offset += numSignals * 16;

  // Transducer (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 80, 80, '');
  }
  offset += numSignals * 80;

  // Physical dimension (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, signals[i]!.physicalDimension);
  }
  offset += numSignals * 8;

  // Physical min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(signals[i]!.physicalMin));
  }
  offset += numSignals * 8;

  // Physical max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(signals[i]!.physicalMax));
  }
  offset += numSignals * 8;

  // Digital min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(signals[i]!.digitalMin));
  }
  offset += numSignals * 8;

  // Digital max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(signals[i]!.digitalMax));
  }
  offset += numSignals * 8;

  // Prefiltering (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 80, 80, '');
  }
  offset += numSignals * 80;

  // Num samples per record (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(signals[i]!.numSamples));
  }
  offset += numSignals * 8;

  // Reserved (32 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 32, 32, '');
  }

  // -- Data records --
  let dataPtr = headerBytes;
  for (let rec = 0; rec < actualRecords; rec++) {
    for (let sig = 0; sig < numSignals; sig++) {
      const s = signals[sig]!;
      for (let sIdx = 0; sIdx < s.numSamples; sIdx++) {
        const generator = s.generator ?? defaultSineGenerator(s.numSamples);
        const value = generator(sIdx, rec);
        const clamped = Math.max(-32768, Math.min(32767, Math.round(value)));
        view.setInt16(dataPtr, clamped, true);
        dataPtr += 2;
      }
    }
  }

  return buffer;
}

function defaultSineGenerator(samplesPerRecord: number) {
  return (sampleIndex: number): number =>
    Math.round(10000 * Math.sin((2 * Math.PI * sampleIndex) / samplesPerRecord));
}

/** Standard single flow signal spec for quick tests. */
function flowSignal(overrides: Partial<SignalSpec> = {}): SignalSpec {
  return {
    label: 'Flow',
    physicalDimension: 'L/min',
    physicalMin: -100,
    physicalMax: 100,
    digitalMin: -32768,
    digitalMax: 32767,
    numSamples: 25,
    ...overrides,
  };
}

/** Standard pressure signal spec. */
function pressureSignal(overrides: Partial<SignalSpec> = {}): SignalSpec {
  return {
    label: 'Press',
    physicalDimension: 'cmH2O',
    physicalMin: 0,
    physicalMax: 25,
    digitalMin: 0,
    digitalMax: 32767,
    numSamples: 2,
    generator: () => 16384, // ~12.5 cmH2O midpoint
    ...overrides,
  };
}

/** Standard resp event signal spec (BiPAP trigger/cycle). */
function respEventSignal(overrides: Partial<SignalSpec> = {}): SignalSpec {
  return {
    label: 'Resp Event',
    physicalDimension: '',
    physicalMin: 0,
    physicalMax: 3,
    digitalMin: 0,
    digitalMax: 3,
    numSamples: 25,
    generator: () => 1,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe('EDF Parser — parseEDF', () => {
  // ----------------------------------------------------------
  // Header parsing
  // ----------------------------------------------------------
  describe('header parsing', () => {
    it('parses version field from fixed header', () => {
      const buf = buildEDF({
        version: '0',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.version).toBe('0');
    });

    it('parses patient ID from fixed header', () => {
      const buf = buildEDF({
        patientId: 'Patient X123',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.patientId).toBe('Patient X123');
    });

    it('parses recording ID from fixed header', () => {
      const buf = buildEDF({
        recordingId: 'Startdate 15-MAR-2024',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.recordingId).toBe('Startdate 15-MAR-2024');
    });

    it('parses numDataRecords correctly', () => {
      const buf = buildEDF({
        numDataRecords: 42,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.numDataRecords).toBe(42);
    });

    it('parses recordDuration correctly', () => {
      const buf = buildEDF({
        numDataRecords: 5,
        recordDuration: 2,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.recordDuration).toBe(2);
    });

    it('parses numSignals correctly', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal(), pressureSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.header.numSignals).toBe(2);
    });

    it('parses headerBytes correctly', () => {
      // 1 signal: 256 + 1*256 = 512
      const buf1 = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      expect(parseEDF(buf1, 'test.edf').header.headerBytes).toBe(512);

      // 3 signals: 256 + 3*256 = 1024
      const buf3 = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal(), pressureSignal(), respEventSignal()],
      });
      expect(parseEDF(buf3, 'test.edf').header.headerBytes).toBe(1024);
    });

    it('trims whitespace from header string fields', () => {
      // The buildEDF helper pads fields with spaces. Parser should trim them.
      const buf = buildEDF({
        patientId: 'ABC',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      // 'ABC' padded to 80 chars, then trimmed back to 'ABC'
      expect(result.header.patientId).toBe('ABC');
      expect(result.header.patientId.length).toBe(3);
    });
  });

  // ----------------------------------------------------------
  // Signal metadata parsing
  // ----------------------------------------------------------
  describe('signal metadata parsing', () => {
    it('parses signal labels', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal(), pressureSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.signals[0]!.label).toBe('Flow');
      expect(result.signals[1]!.label).toBe('Press');
    });

    it('parses physical dimension', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ physicalDimension: 'L/min' })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.signals[0]!.physicalDimension).toBe('L/min');
    });

    it('parses physical min/max', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ physicalMin: -120, physicalMax: 120 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.signals[0]!.physicalMin).toBe(-120);
      expect(result.signals[0]!.physicalMax).toBe(120);
    });

    it('parses digital min/max', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ digitalMin: -32768, digitalMax: 32767 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.signals[0]!.digitalMin).toBe(-32768);
      expect(result.signals[0]!.digitalMax).toBe(32767);
    });

    it('parses numSamples per record', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ numSamples: 50 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.signals[0]!.numSamples).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // Date parsing — 2-digit year handling
  // ----------------------------------------------------------
  describe('date parsing (dd.MM.yy)', () => {
    it('parses year < 85 as 2000s', () => {
      const buf = buildEDF({
        startDate: '10.01.24',
        startTime: '22.30.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(2024);
      expect(result.recordingDate.getMonth()).toBe(0); // January (0-indexed)
      expect(result.recordingDate.getDate()).toBe(10);
    });

    it('parses year >= 85 as 1900s', () => {
      const buf = buildEDF({
        startDate: '05.06.95',
        startTime: '10.00.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(1995);
      expect(result.recordingDate.getMonth()).toBe(5); // June
      expect(result.recordingDate.getDate()).toBe(5);
    });

    it('handles boundary year 84 as 2084', () => {
      const buf = buildEDF({
        startDate: '01.01.84',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(2084);
    });

    it('handles boundary year 85 as 1985', () => {
      const buf = buildEDF({
        startDate: '01.01.85',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(1985);
    });

    it('handles year 00 as 2000', () => {
      const buf = buildEDF({
        startDate: '15.12.00',
        startTime: '08.00.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(2000);
      expect(result.recordingDate.getMonth()).toBe(11); // December
    });

    it('handles year 99 as 1999', () => {
      const buf = buildEDF({
        startDate: '31.12.99',
        startTime: '23.59.59',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getFullYear()).toBe(1999);
    });

    it('parses time components correctly', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '14.35.22',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getHours()).toBe(14);
      expect(result.recordingDate.getMinutes()).toBe(35);
      expect(result.recordingDate.getSeconds()).toBe(22);
    });

    it('parses midnight time correctly', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.recordingDate.getHours()).toBe(0);
      expect(result.recordingDate.getMinutes()).toBe(0);
      expect(result.recordingDate.getSeconds()).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // Flow signal detection
  // ----------------------------------------------------------
  describe('flow signal detection', () => {
    it('finds signal labelled "Flow"', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ label: 'Flow' })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData).toBeInstanceOf(Float32Array);
      expect(result.flowData.length).toBeGreaterThan(0);
    });

    it('finds signal labelled "Flw" (case-insensitive)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ label: 'Flw' })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData.length).toBe(25);
    });

    it('finds flow signal with mixed case', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ label: 'FLOW' })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData.length).toBe(25);
    });

    it('throws when no flow signal is present', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          {
            label: 'SpO2',
            physicalDimension: '%',
            physicalMin: 0,
            physicalMax: 100,
            digitalMin: 0,
            digitalMax: 1023,
            numSamples: 1,
            generator: () => 500,
          },
        ],
      });
      expect(() => parseEDF(buf, 'test.edf')).toThrow('No flow signal found');
    });
  });

  // ----------------------------------------------------------
  // Signal data extraction and scaling
  // ----------------------------------------------------------
  describe('signal data extraction', () => {
    it('converts digital values to physical values using linear scaling', () => {
      // With physMin=-100, physMax=100, digMin=-32768, digMax=32767:
      // scale = 200 / 65535 ≈ 0.003051804
      // physical = (digital - digMin) * scale + physMin
      //
      // Digital 0 → (0 - (-32768)) * scale + (-100) = 32768 * 0.003051804 - 100 ≈ 0.0015
      // Digital 32767 → (32767 + 32768) * scale - 100 = 65535 * 0.003051804 - 100 ≈ 100
      // Digital -32768 → (0) * scale - 100 = -100
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            numSamples: 3,
            generator: (idx) => {
              if (idx === 0) return -32768;
              if (idx === 1) return 0;
              return 32767;
            },
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Digital -32768 → physical -100
      expect(result.flowData[0]).toBeCloseTo(-100, 0);
      // Digital 0 → physical ≈ 0 (approximately midpoint)
      expect(result.flowData[1]).toBeCloseTo(0, 0);
      // Digital 32767 → physical ≈ 100
      expect(result.flowData[2]).toBeCloseTo(100, 0);
    });

    it('produces correct number of flow samples across multiple records', () => {
      const buf = buildEDF({
        numDataRecords: 10,
        signals: [flowSignal({ numSamples: 25 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData.length).toBe(250);
    });

    it('returns Float32Array for flow data', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData).toBeInstanceOf(Float32Array);
    });

    it('handles zero digital range gracefully (scale = 0)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            digitalMin: 100,
            digitalMax: 100, // zero range
            numSamples: 5,
            generator: () => 100,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');
      // With scale=0, all values should be physicalMin
      for (let i = 0; i < result.flowData.length; i++) {
        expect(result.flowData[i]).toBe(-100);
      }
    });
  });

  // ----------------------------------------------------------
  // Pressure data extraction
  // ----------------------------------------------------------
  describe('pressure data extraction', () => {
    it('extracts pressure data when "Press" signal exists', () => {
      const buf = buildEDF({
        numDataRecords: 5,
        signals: [flowSignal(), pressureSignal({ numSamples: 2 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.pressureData).toBeInstanceOf(Float32Array);
      expect(result.pressureData!.length).toBe(10); // 5 records * 2 samples
    });

    it('returns null pressureData when no pressure signal exists', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.pressureData).toBeNull();
    });

    it('scales pressure data correctly', () => {
      // Pressure: physMin=0, physMax=25, digMin=0, digMax=32767
      // All digital values = 16384 → physical = (16384/32767)*25 ≈ 12.5
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({ numSamples: 1, generator: () => 0 }),
          pressureSignal({ numSamples: 1, generator: () => 16384 }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.pressureData![0]).toBeCloseTo(12.5, 0);
    });
  });

  // ----------------------------------------------------------
  // Resp event data extraction (BiPAP)
  // ----------------------------------------------------------
  describe('resp event data extraction', () => {
    it('extracts resp event data when "Resp Event" signal exists', () => {
      const buf = buildEDF({
        numDataRecords: 3,
        signals: [flowSignal(), respEventSignal({ numSamples: 25 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.respEventData).toBeInstanceOf(Float32Array);
      expect(result.respEventData!.length).toBe(75); // 3 * 25
    });

    it('detects "TrigCycEvt" label for resp events', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal(), respEventSignal({ label: 'TrigCycEvt' })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.respEventData).not.toBeNull();
    });

    it('returns null respEventData when no resp event signal exists', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.respEventData).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // Sampling rate calculation
  // ----------------------------------------------------------
  describe('sampling rate', () => {
    it('calculates sampling rate as numSamples / recordDuration', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        recordDuration: 1,
        signals: [flowSignal({ numSamples: 25 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.samplingRate).toBe(25);
    });

    it('handles non-unit record duration', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        recordDuration: 2,
        signals: [flowSignal({ numSamples: 50 })],
      });
      const result = parseEDF(buf, 'test.edf');
      // 50 samples / 2 seconds = 25 Hz
      expect(result.samplingRate).toBe(25);
    });

    it('handles higher sampling rates (50 Hz)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        recordDuration: 1,
        signals: [flowSignal({ numSamples: 50 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.samplingRate).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // Duration calculation
  // ----------------------------------------------------------
  describe('duration', () => {
    it('calculates total duration from records * recordDuration', () => {
      const buf = buildEDF({
        numDataRecords: 60,
        recordDuration: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.durationSeconds).toBe(60);
    });

    it('accounts for non-unit record duration', () => {
      const buf = buildEDF({
        numDataRecords: 30,
        recordDuration: 2,
        signals: [flowSignal({ numSamples: 50 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.durationSeconds).toBe(60);
    });
  });

  // ----------------------------------------------------------
  // Flow unit conversion (L/s → L/min)
  // ----------------------------------------------------------
  describe('flow unit conversion', () => {
    it('converts L/s to L/min (multiplies by 60)', () => {
      // All samples = digital 0 → physical ≈ 0 for symmetric range
      // Use a constant non-zero digital value to verify ×60 conversion
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            physicalDimension: 'L/s',
            physicalMin: -2,
            physicalMax: 2,
            digitalMin: -32768,
            digitalMax: 32767,
            numSamples: 1,
            generator: () => 16384, // roughly +1 L/s
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Physical value before conversion: (16384+32768) * (4/65535) - 2 ≈ 1.0
      // After ×60: ≈ 60.0
      expect(result.flowData[0]).toBeGreaterThan(50); // approximately 60
    });

    it('does not convert L/min (no multiplication)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            physicalDimension: 'L/min',
            physicalMin: -100,
            physicalMax: 100,
            numSamples: 1,
            generator: () => 16384,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Physical value: (16384+32768) * (200/65535) - 100 ≈ 50.0
      // No conversion, so stays around 50
      expect(result.flowData[0]).toBeCloseTo(50, 0);
      expect(result.flowData[0]).toBeLessThan(55);
    });

    it('auto-detects L/s when physicalMax is small and no unit suffix', () => {
      // If physicalMax < 10 and unit doesn't indicate /min, parser assumes L/s
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            physicalDimension: 'L', // no /min or /s suffix
            physicalMin: -2,
            physicalMax: 2, // < 10, triggers auto-detect
            digitalMin: -32768,
            digitalMax: 32767,
            numSamples: 1,
            generator: () => 16384,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Should be multiplied by 60
      expect(result.flowData[0]).toBeGreaterThan(50);
    });

    it('does not convert when unit has /m suffix (L/m is treated as L/min)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            physicalDimension: 'L/m',
            physicalMin: -100,
            physicalMax: 100,
            numSamples: 1,
            generator: () => 16384,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Should NOT be multiplied by 60
      expect(result.flowData[0]).toBeLessThan(55);
    });
  });

  // ----------------------------------------------------------
  // Multi-signal files
  // ----------------------------------------------------------
  describe('multi-signal files', () => {
    it('correctly interleaves data from multiple signals', () => {
      const buf = buildEDF({
        numDataRecords: 2,
        signals: [
          flowSignal({
            numSamples: 3,
            generator: (idx) => (idx + 1) * 1000,
          }),
          pressureSignal({
            numSamples: 2,
            generator: (idx) => (idx + 1) * 5000,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      // Flow: 6 samples total (2 records × 3)
      expect(result.flowData.length).toBe(6);

      // Pressure: 4 samples total (2 records × 2)
      expect(result.pressureData).not.toBeNull();
      expect(result.pressureData!.length).toBe(4);
    });

    it('handles 3 signals (flow + pressure + resp event)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal(), pressureSignal(), respEventSignal()],
      });
      const result = parseEDF(buf, 'test.edf');

      expect(result.flowData.length).toBe(25);
      expect(result.pressureData).not.toBeNull();
      expect(result.respEventData).not.toBeNull();
    });

    it('flow signal can be at any position (not just index 0)', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          pressureSignal(),
          flowSignal({ numSamples: 10 }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');

      expect(result.flowData.length).toBe(10);
      expect(result.pressureData!.length).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // filePath passthrough
  // ----------------------------------------------------------
  describe('filePath', () => {
    it('passes through the filePath argument', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'DATALOG/20240315/BRP.edf');
      expect(result.filePath).toBe('DATALOG/20240315/BRP.edf');
    });
  });

  // ----------------------------------------------------------
  // Truncation handling
  // ----------------------------------------------------------
  describe('truncation handling', () => {
    it('marks truncated flag when buffer is shorter than expected', () => {
      const buf = buildEDF({
        numDataRecords: 10,
        signals: [flowSignal()],
        actualRecords: 7,
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.truncated).toBe(true);
      expect(result.recordsParsed).toBe(7);
      expect(result.recordsExpected).toBe(10);
    });

    it('does not set truncated when file is complete', () => {
      const buf = buildEDF({
        numDataRecords: 5,
        signals: [flowSignal()],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.truncated).toBeUndefined();
      expect(result.recordsParsed).toBeUndefined();
      expect(result.recordsExpected).toBeUndefined();
    });

    it('throws on zero complete records', () => {
      const buf = buildEDF({
        numDataRecords: 10,
        signals: [flowSignal()],
        actualRecords: 0,
      });
      expect(() => parseEDF(buf, 'test.edf')).toThrow(/zero complete data records/);
    });

    it('handles partial record (extra bytes that do not complete a record)', () => {
      const buf = buildEDF({
        numDataRecords: 10,
        signals: [flowSignal({ numSamples: 25 })],
        actualRecords: 5,
        extraPartialBytes: 10, // 10 bytes, not enough for a full record (25*2=50)
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.truncated).toBe(true);
      expect(result.recordsParsed).toBe(5);
      expect(result.flowData.length).toBe(125); // 5 * 25
    });

    it('uses correct duration for truncated files', () => {
      const buf = buildEDF({
        numDataRecords: 100,
        recordDuration: 2,
        signals: [flowSignal({ numSamples: 50 })],
        actualRecords: 10,
      });
      const result = parseEDF(buf, 'test.edf');
      // Duration based on actual parsed records
      expect(result.durationSeconds).toBe(20); // 10 records * 2 seconds
    });
  });

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------
  describe('edge cases', () => {
    it('handles single-sample records', () => {
      const buf = buildEDF({
        numDataRecords: 5,
        signals: [flowSignal({ numSamples: 1, generator: () => 1000 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData.length).toBe(5);
      expect(result.samplingRate).toBe(1);
    });

    it('handles large numSamples per record', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [flowSignal({ numSamples: 500 })],
      });
      const result = parseEDF(buf, 'test.edf');
      expect(result.flowData.length).toBe(500);
      expect(result.samplingRate).toBe(500);
    });

    it('preserves negative flow values', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            numSamples: 2,
            generator: (idx) => (idx === 0 ? -20000 : 20000),
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');
      // First sample should be negative, second positive
      expect(result.flowData[0]).toBeLessThan(0);
      expect(result.flowData[1]).toBeGreaterThan(0);
    });

    it('handles digital value at exact min boundary', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            numSamples: 1,
            generator: () => -32768,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');
      // Digital min → physical min
      expect(result.flowData[0]).toBeCloseTo(-100, 0);
    });

    it('handles digital value at exact max boundary', () => {
      const buf = buildEDF({
        numDataRecords: 1,
        signals: [
          flowSignal({
            numSamples: 1,
            generator: () => 32767,
          }),
        ],
      });
      const result = parseEDF(buf, 'test.edf');
      // Digital max → physical max
      expect(result.flowData[0]).toBeCloseTo(100, 0);
    });

    it('clamps negative numSamples to zero instead of crashing', () => {
      // Reproduce Sentry bug: "Invalid typed array length: -30"
      // Corrupted EDF metadata can produce negative numSamples, which then
      // causes `new Float32Array(negativeValue)` to throw a RangeError.
      const numSignals = 1;
      const headerBytes = 256 + numSignals * 256;
      const buffer = new ArrayBuffer(headerBytes + 100); // extra bytes for "data"
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const view = new DataView(buffer);
      const encoder = new TextEncoder();

      function writeField(off: number, length: number, value: string): void {
        const padded = value.padEnd(length);
        const bytes = encoder.encode(padded.slice(0, length));
        new Uint8Array(buffer, off, length).set(bytes);
      }

      // Fixed header
      writeField(0, 8, '0');
      writeField(8, 80, '');
      writeField(88, 80, '');
      writeField(168, 8, '15.03.24');
      writeField(176, 8, '23.15.00');
      writeField(184, 8, String(headerBytes));
      writeField(192, 44, '');
      writeField(236, 8, '10');  // 10 data records
      writeField(244, 8, '1');
      writeField(252, 4, String(numSignals));

      // Per-signal header
      let offset = 256;
      writeField(offset, 16, 'Flow');  // label
      offset += numSignals * 16;
      offset += numSignals * 80; // transducer
      writeField(offset, 8, 'L/min'); // physical dimension
      offset += numSignals * 8;
      writeField(offset, 8, '-100'); // physical min
      offset += numSignals * 8;
      writeField(offset, 8, '100'); // physical max
      offset += numSignals * 8;
      writeField(offset, 8, '-32768'); // digital min
      offset += numSignals * 8;
      writeField(offset, 8, '32767'); // digital max
      offset += numSignals * 8;
      offset += numSignals * 80; // prefiltering
      writeField(offset, 8, '-30');  // NEGATIVE numSamples (the bug trigger)
      offset += numSignals * 8;

      // The parser should NOT throw RangeError ("Invalid typed array length: -30").
      // With numSamples clamped to 0, samplesPerRecord=0, bytesPerRecord=0,
      // expectedBytes=headerBytes, and buffer.byteLength >= headerBytes,
      // so no truncation. The parser produces an empty flow array.
      const result = parseEDF(buffer, 'corrupted.edf');
      expect(result.flowData.length).toBe(0);
      expect(result.durationSeconds).toBe(10); // 10 records * 1s duration
    });

    it('clamps negative numDataRecords to zero', () => {
      // If numDataRecords is negative in the header, it should be clamped to 0
      const numSignals = 1;
      const headerBytes = 256 + numSignals * 256;
      const buffer = new ArrayBuffer(headerBytes + 100);
      const encoder = new TextEncoder();

      function writeField(off: number, length: number, value: string): void {
        const padded = value.padEnd(length);
        const bytes = encoder.encode(padded.slice(0, length));
        new Uint8Array(buffer, off, length).set(bytes);
      }

      writeField(0, 8, '0');
      writeField(8, 80, '');
      writeField(88, 80, '');
      writeField(168, 8, '15.03.24');
      writeField(176, 8, '23.15.00');
      writeField(184, 8, String(headerBytes));
      writeField(192, 44, '');
      writeField(236, 8, '-5');  // NEGATIVE numDataRecords
      writeField(244, 8, '1');
      writeField(252, 4, String(numSignals));

      let offset = 256;
      writeField(offset, 16, 'Flow');
      offset += numSignals * 16;
      offset += numSignals * 80;
      writeField(offset, 8, 'L/min');
      offset += numSignals * 8;
      writeField(offset, 8, '-100');
      offset += numSignals * 8;
      writeField(offset, 8, '100');
      offset += numSignals * 8;
      writeField(offset, 8, '-32768');
      offset += numSignals * 8;
      writeField(offset, 8, '32767');
      offset += numSignals * 8;
      offset += numSignals * 80;
      writeField(offset, 8, '25');  // valid numSamples
      offset += numSignals * 8;

      // numDataRecords clamped to 0 → samplesPerRecord * 0 = 0 → 0 bytes expected
      // But buffer has extra bytes → no truncation. However, actualFlowSamples = 0.
      // The flow data array will be empty (length 0) but shouldn't crash.
      const result = parseEDF(buffer, 'corrupted.edf');
      expect(result.flowData.length).toBe(0);
      expect(result.durationSeconds).toBe(0);
    });
  });
});

// ============================================================
// Tests for parseSTR
// ============================================================

describe('EDF Parser — parseSTR', () => {
  describe('header parsing', () => {
    it('parses STR header fields correctly', () => {
      const buf = buildEDF({
        patientId: 'Machine 12345',
        recordingId: 'STR Recording',
        startDate: '01.02.25',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [
          // STR files typically have settings signals, but the parser
          // just needs valid signals. We use a "flow" label to satisfy
          // parseEDF, but parseSTR doesn't care about label semantics.
          {
            label: 'S.EPR.Level',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 3,
            digitalMin: 0,
            digitalMax: 3,
            numSamples: 1,
            generator: () => 2,
          },
        ],
      });
      const result = parseSTR(buf);

      expect(result.header.patientId).toBe('Machine 12345');
      expect(result.header.recordingId).toBe('STR Recording');
      expect(result.header.numDataRecords).toBe(1);
      expect(result.header.numSignals).toBe(1);
    });
  });

  describe('date parsing', () => {
    it('parses 2-digit year < 85 as 2000s', () => {
      const buf = buildEDF({
        startDate: '20.03.26',
        startTime: '12.30.45',
        numDataRecords: 1,
        signals: [
          {
            label: 'Setting1',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 20,
            digitalMin: 0,
            digitalMax: 20,
            numSamples: 1,
            generator: () => 10,
          },
        ],
      });
      const result = parseSTR(buf);

      expect(result.startDateTime.getFullYear()).toBe(2026);
      expect(result.startDateTime.getMonth()).toBe(2); // March
      expect(result.startDateTime.getDate()).toBe(20);
      expect(result.startDateTime.getHours()).toBe(12);
      expect(result.startDateTime.getMinutes()).toBe(30);
      expect(result.startDateTime.getSeconds()).toBe(45);
    });

    it('parses 2-digit year >= 85 as 1900s', () => {
      const buf = buildEDF({
        startDate: '05.11.90',
        startTime: '08.00.00',
        numDataRecords: 1,
        signals: [
          {
            label: 'Setting1',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 10,
            digitalMin: 0,
            digitalMax: 10,
            numSamples: 1,
            generator: () => 5,
          },
        ],
      });
      const result = parseSTR(buf);
      expect(result.startDateTime.getFullYear()).toBe(1990);
    });
  });

  describe('signal data reading', () => {
    it('returns both digital and physical values for each signal', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 2,
        signals: [
          {
            label: 'EPR Level',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 3,
            digitalMin: 0,
            digitalMax: 3,
            numSamples: 1,
            generator: () => 2,
          },
        ],
      });
      const result = parseSTR(buf);

      expect(result.signals.length).toBe(1);
      expect(result.signals[0]!.label).toBe('EPR Level');
      expect(result.signals[0]!.digitalValues.length).toBe(2); // 2 records * 1 sample
      expect(result.signals[0]!.physicalValues.length).toBe(2);
    });

    it('correctly scales physical values from digital values', () => {
      // physMin=0, physMax=20, digMin=0, digMax=100
      // Digital 50 → physical = (50-0) * (20/100) + 0 = 10
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [
          {
            label: 'Pressure',
            physicalDimension: 'cmH2O',
            physicalMin: 0,
            physicalMax: 20,
            digitalMin: 0,
            digitalMax: 100,
            numSamples: 1,
            generator: () => 50,
          },
        ],
      });
      const result = parseSTR(buf);

      expect(result.signals[0]!.digitalValues[0]).toBe(50);
      expect(result.signals[0]!.physicalValues[0]).toBeCloseTo(10, 5);
    });

    it('handles multiple signals in STR file', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [
          {
            label: 'S.EPR.Level',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 3,
            digitalMin: 0,
            digitalMax: 3,
            numSamples: 1,
            generator: () => 2,
          },
          {
            label: 'S.C.Press',
            physicalDimension: 'cmH2O',
            physicalMin: 4,
            physicalMax: 20,
            digitalMin: 40,
            digitalMax: 200,
            numSamples: 1,
            generator: () => 100,
          },
        ],
      });
      const result = parseSTR(buf);

      expect(result.signals.length).toBe(2);
      expect(result.signals[0]!.label).toBe('S.EPR.Level');
      expect(result.signals[1]!.label).toBe('S.C.Press');
    });

    it('handles zero digital range (scale = 0)', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 1,
        signals: [
          {
            label: 'ZeroRange',
            physicalDimension: '',
            physicalMin: 5,
            physicalMax: 5,
            digitalMin: 0,
            digitalMax: 0,
            numSamples: 1,
            generator: () => 0,
          },
        ],
      });
      const result = parseSTR(buf);

      // scale = 0, so physical = (dv - 0) * 0 + 5 = 5
      expect(result.signals[0]!.physicalValues[0]).toBe(5);
    });

    it('reads multiple records per signal', () => {
      const buf = buildEDF({
        startDate: '01.01.24',
        startTime: '00.00.00',
        numDataRecords: 5,
        signals: [
          {
            label: 'Mode',
            physicalDimension: '',
            physicalMin: 0,
            physicalMax: 10,
            digitalMin: 0,
            digitalMax: 10,
            numSamples: 2,
            generator: (sIdx, rIdx) => rIdx * 2 + sIdx,
          },
        ],
      });
      const result = parseSTR(buf);

      // 5 records * 2 samples = 10 values
      expect(result.signals[0]!.digitalValues.length).toBe(10);
      expect(result.signals[0]!.physicalValues.length).toBe(10);
    });
  });
});
