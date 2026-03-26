import { describe, it, expect } from 'vitest';
import { parsePLD, computePLDSummary } from '@/lib/parsers/pld-parser';
import type { PLDData } from '@/lib/types';

// ── Helpers: build a minimal valid EDF buffer with PLD-typical channels ──

interface TestChannel {
  label: string;
  data: number[];
  physicalMin: number;
  physicalMax: number;
  unit?: string;
}

/**
 * Create a minimal EDF binary buffer with the given channels.
 * Each channel contributes 1 sample per data record (mimics 0.5 Hz with 2s records).
 */
function makePLDBuffer(channels: TestChannel[]): ArrayBuffer {
  const numSignals = channels.length;
  const numDataRecords = channels[0]?.data.length ?? 0;
  const samplesPerRecord = 1; // 1 sample per signal per record (PLD is low-res)
  const recordDuration = 2; // 2 seconds per record (0.5 Hz)
  const headerBytes = 256 + numSignals * 256;
  const dataBytes = numDataRecords * numSignals * samplesPerRecord * 2;
  const totalBytes = headerBytes + dataBytes;

  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);
  const encoder = new TextEncoder();

  // Write a fixed-width ASCII field into the buffer
  function writeField(offset: number, length: number, value: string): void {
    const padded = value.padEnd(length);
    const bytes = encoder.encode(padded.slice(0, length));
    new Uint8Array(buffer, offset, length).set(bytes);
  }

  // ── Fixed header (256 bytes) ──
  writeField(0, 8, '0');                             // version
  writeField(8, 80, 'test patient');                  // patient ID
  writeField(88, 80, 'test recording');               // recording ID
  writeField(168, 8, '01.01.25');                     // start date (dd.MM.yy)
  writeField(176, 8, '22.00.00');                     // start time (HH.mm.ss)
  writeField(184, 8, String(headerBytes));            // header bytes
  writeField(192, 44, '');                            // reserved
  writeField(236, 8, String(numDataRecords));         // num data records
  writeField(244, 8, String(recordDuration));         // record duration
  writeField(252, 4, String(numSignals));             // num signals

  // ── Per-signal headers ──
  let offset = 256;

  // Labels (16 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 16, 16, channels[i]!.label);
  }
  offset += numSignals * 16;

  // Transducer type (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 80, 80, '');
  }
  offset += numSignals * 80;

  // Physical dimension (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, channels[i]!.unit ?? '');
  }
  offset += numSignals * 8;

  // Physical min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(channels[i]!.physicalMin));
  }
  offset += numSignals * 8;

  // Physical max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(channels[i]!.physicalMax));
  }
  offset += numSignals * 8;

  // Digital min (8 bytes each) — use -32768
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, '-32768');
  }
  offset += numSignals * 8;

  // Digital max (8 bytes each) — use 32767
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, '32767');
  }
  offset += numSignals * 8;

  // Prefiltering (80 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 80, 80, '');
  }
  offset += numSignals * 80;

  // Number of samples per record (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 8, 8, String(samplesPerRecord));
  }
  offset += numSignals * 8;

  // Reserved (32 bytes each)
  for (let i = 0; i < numSignals; i++) {
    writeField(offset + i * 32, 32, '');
  }

  // ── Data records ──
  let dataPtr = headerBytes;
  for (let rec = 0; rec < numDataRecords; rec++) {
    for (let sig = 0; sig < numSignals; sig++) {
      const ch = channels[sig]!;
      const physValue = ch.data[rec] ?? 0;
      // Convert physical to digital: reverse of (dv - digMin) * scale + physMin
      const digRange = 32767 - (-32768); // 65535
      const physRange = ch.physicalMax - ch.physicalMin;
      const digitalValue = physRange === 0
        ? 0
        : Math.round(((physValue - ch.physicalMin) / physRange) * digRange + (-32768));
      const clamped = Math.max(-32768, Math.min(32767, digitalValue));
      view.setInt16(dataPtr, clamped, true);
      dataPtr += 2;
    }
  }

  return buffer;
}

// ── Test data generators ──

function makeFullPLDChannels(numRecords: number): TestChannel[] {
  const data = (min: number, max: number) =>
    Array.from({ length: numRecords }, (_, i) => min + (max - min) * (i / numRecords));

  return [
    { label: 'MaskPress', data: data(4, 12), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Therapy Pres', data: data(6, 14), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Exp Press', data: data(4, 8), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Insp Pres', data: data(8, 16), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Leak', data: data(0, 0.5), physicalMin: 0, physicalMax: 2, unit: 'L/s' },
    { label: 'RR', data: data(12, 18), physicalMin: 0, physicalMax: 30, unit: '/min' },
    { label: 'Vt', data: data(0.3, 0.6), physicalMin: 0, physicalMax: 2, unit: 'L' },
    { label: 'MV', data: data(5, 10), physicalMin: 0, physicalMax: 20, unit: 'L/min' },
    { label: 'Snore', data: data(0, 3), physicalMin: 0, physicalMax: 10 },
    { label: 'FFL Index', data: data(0, 1), physicalMin: 0, physicalMax: 1 },
    { label: 'I:E', data: Array.from({ length: numRecords }, () => 250), physicalMin: 0, physicalMax: 500 },
    { label: 'Ti', data: data(0.8, 1.2), physicalMin: 0, physicalMax: 3, unit: 's' },
    { label: 'Te', data: data(2.0, 3.0), physicalMin: 0, physicalMax: 5, unit: 's' },
    { label: 'TgMV', data: data(6, 8), physicalMin: 0, physicalMax: 20, unit: 'L/min' },
  ];
}

function makeCPAPOnlyChannels(numRecords: number): TestChannel[] {
  const data = (min: number, max: number) =>
    Array.from({ length: numRecords }, (_, i) => min + (max - min) * (i / numRecords));

  return [
    { label: 'MaskPress', data: data(8, 12), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Therapy Pres', data: data(10, 10), physicalMin: 0, physicalMax: 25, unit: 'cmH2O' },
    { label: 'Leak', data: data(0, 0.3), physicalMin: 0, physicalMax: 2, unit: 'L/s' },
    { label: 'RR', data: data(14, 16), physicalMin: 0, physicalMax: 30, unit: '/min' },
    { label: 'Vt', data: data(0.4, 0.5), physicalMin: 0, physicalMax: 2, unit: 'L' },
    { label: 'MV', data: data(6, 8), physicalMin: 0, physicalMax: 20, unit: 'L/min' },
    { label: 'Snore', data: Array.from({ length: numRecords }, () => 0), physicalMin: 0, physicalMax: 10 },
    { label: 'FFL Index', data: data(0, 0.5), physicalMin: 0, physicalMax: 1 },
  ];
}

// ── Tests ──

describe('PLD Parser', () => {
  describe('parsePLD', () => {
    it('parses a PLD with all channels present', () => {
      const numRecords = 100;
      const channels = makeFullPLDChannels(numRecords);
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'DATALOG/20250110/20250110_220000_PLD.edf');

      expect(result).not.toBeNull();
      expect(result!.samplingRate).toBe(0.5); // 1 sample per 2s record
      expect(result!.durationSeconds).toBe(200); // 100 records x 2s
      expect(result!.startTime).toBeInstanceOf(Date);

      // All channels should be present
      expect(result!.maskPressure).toBeInstanceOf(Float32Array);
      expect(result!.therapyPressure).toBeInstanceOf(Float32Array);
      expect(result!.expiratoryPressure).toBeInstanceOf(Float32Array);
      expect(result!.inspiratoryPressure).toBeInstanceOf(Float32Array);
      expect(result!.leak).toBeInstanceOf(Float32Array);
      expect(result!.respiratoryRate).toBeInstanceOf(Float32Array);
      expect(result!.tidalVolume).toBeInstanceOf(Float32Array);
      expect(result!.minuteVentilation).toBeInstanceOf(Float32Array);
      expect(result!.snore).toBeInstanceOf(Float32Array);
      expect(result!.fflIndex).toBeInstanceOf(Float32Array);
      expect(result!.ieRatio).toBeInstanceOf(Float32Array);
      expect(result!.ti).toBeInstanceOf(Float32Array);
      expect(result!.te).toBeInstanceOf(Float32Array);
      expect(result!.targetMV).toBeInstanceOf(Float32Array);

      // Each channel should have numRecords samples
      expect(result!.maskPressure!.length).toBe(numRecords);
      expect(result!.leak!.length).toBe(numRecords);
    });

    it('parses PLD with only CPAP channels (no BiPAP-specific)', () => {
      const numRecords = 50;
      const channels = makeCPAPOnlyChannels(numRecords);
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      expect(result!.maskPressure).toBeInstanceOf(Float32Array);
      expect(result!.therapyPressure).toBeInstanceOf(Float32Array);
      expect(result!.leak).toBeInstanceOf(Float32Array);
      expect(result!.respiratoryRate).toBeInstanceOf(Float32Array);

      // BiPAP-specific channels should be absent
      expect(result!.expiratoryPressure).toBeUndefined();
      expect(result!.inspiratoryPressure).toBeUndefined();
      expect(result!.ieRatio).toBeUndefined();
      expect(result!.ti).toBeUndefined();
      expect(result!.te).toBeUndefined();
      expect(result!.targetMV).toBeUndefined();
    });

    it('handles missing channels gracefully (null fields)', () => {
      // Only leak and snore
      const numRecords = 30;
      const channels: TestChannel[] = [
        { label: 'Leak', data: Array.from({ length: numRecords }, () => 0.2), physicalMin: 0, physicalMax: 2, unit: 'L/s' },
        { label: 'Snore', data: Array.from({ length: numRecords }, () => 1), physicalMin: 0, physicalMax: 10 },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      expect(result!.leak).toBeInstanceOf(Float32Array);
      expect(result!.snore).toBeInstanceOf(Float32Array);
      // Everything else should be undefined
      expect(result!.maskPressure).toBeUndefined();
      expect(result!.therapyPressure).toBeUndefined();
      expect(result!.respiratoryRate).toBeUndefined();
      expect(result!.fflIndex).toBeUndefined();
    });

    it('converts leak from L/s to L/min', () => {
      const numRecords = 10;
      const leakInLS = 0.5; // 0.5 L/s = 30 L/min
      const channels: TestChannel[] = [
        { label: 'Leak', data: Array.from({ length: numRecords }, () => leakInLS), physicalMin: 0, physicalMax: 2, unit: 'L/s' },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      // Should be converted to L/min
      for (let i = 0; i < numRecords; i++) {
        expect(result!.leak![i]).toBeCloseTo(leakInLS * 60, 0);
      }
    });

    it('converts tidal volume from L to mL', () => {
      const numRecords = 10;
      const vtInL = 0.5; // 0.5 L = 500 mL
      const channels: TestChannel[] = [
        { label: 'Vt', data: Array.from({ length: numRecords }, () => vtInL), physicalMin: 0, physicalMax: 2, unit: 'L' },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      for (let i = 0; i < numRecords; i++) {
        expect(result!.tidalVolume![i]).toBeCloseTo(vtInL * 1000, 0);
      }
    });

    it('converts I:E ratio by dividing by 100', () => {
      const numRecords = 10;
      const ieRawValue = 250; // Represents 2.50 ratio
      const channels: TestChannel[] = [
        { label: 'I:E', data: Array.from({ length: numRecords }, () => ieRawValue), physicalMin: 0, physicalMax: 500 },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      for (let i = 0; i < numRecords; i++) {
        expect(result!.ieRatio![i]).toBeCloseTo(ieRawValue * 0.01, 1);
      }
    });

    it('returns null for empty/malformed PLD', () => {
      // Buffer too small
      const tinyBuffer = new ArrayBuffer(100);
      expect(parsePLD(tinyBuffer, 'test.edf')).toBeNull();

      // Buffer with 0 signals — create manually since makePLDBuffer requires channels
      const emptyBuffer = new ArrayBuffer(256);
      const encoder = new TextEncoder();
      const writeField = (offset: number, length: number, value: string) => {
        const padded = value.padEnd(length);
        new Uint8Array(emptyBuffer, offset, length).set(encoder.encode(padded.slice(0, length)));
      };
      writeField(0, 8, '0');
      writeField(236, 8, '0'); // 0 data records
      writeField(252, 4, '0'); // 0 signals
      expect(parsePLD(emptyBuffer, 'test.edf')).toBeNull();
    });

    it('returns null when no recognizable channel labels found', () => {
      const numRecords = 10;
      const channels: TestChannel[] = [
        { label: 'UnknownChan1', data: Array.from({ length: numRecords }, () => 1), physicalMin: 0, physicalMax: 10 },
        { label: 'RandomLabel2', data: Array.from({ length: numRecords }, () => 2), physicalMin: 0, physicalMax: 10 },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).toBeNull();
    });

    it('handles alternative label variants (case-insensitive)', () => {
      const numRecords = 10;
      const channels: TestChannel[] = [
        { label: 'Leak.2s', data: Array.from({ length: numRecords }, () => 0.3), physicalMin: 0, physicalMax: 2, unit: 'L/s' },
        { label: 'RespRate.2s', data: Array.from({ length: numRecords }, () => 15), physicalMin: 0, physicalMax: 30, unit: '/min' },
        { label: 'FlowLim.2s', data: Array.from({ length: numRecords }, () => 0.5), physicalMin: 0, physicalMax: 1 },
        { label: 'TidVol.2s', data: Array.from({ length: numRecords }, () => 0.4), physicalMin: 0, physicalMax: 2, unit: 'L' },
        { label: 'MinVent.2s', data: Array.from({ length: numRecords }, () => 7), physicalMin: 0, physicalMax: 20, unit: 'L/min' },
        { label: 'Snore.2s', data: Array.from({ length: numRecords }, () => 0), physicalMin: 0, physicalMax: 10 },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      expect(result!.leak).toBeInstanceOf(Float32Array);
      expect(result!.respiratoryRate).toBeInstanceOf(Float32Array);
      expect(result!.fflIndex).toBeInstanceOf(Float32Array);
      expect(result!.tidalVolume).toBeInstanceOf(Float32Array);
      expect(result!.minuteVentilation).toBeInstanceOf(Float32Array);
      expect(result!.snore).toBeInstanceOf(Float32Array);
    });

    it('handles truncated buffer gracefully', () => {
      const numRecords = 100;
      const channels = makeCPAPOnlyChannels(numRecords);
      const fullBuffer = makePLDBuffer(channels);

      // Truncate to ~60% of the data section
      const headerBytes = 256 + channels.length * 256;
      const dataBytes = numRecords * channels.length * 2;
      const truncatedSize = headerBytes + Math.floor(dataBytes * 0.6);
      const truncatedBuffer = fullBuffer.slice(0, truncatedSize);

      const result = parsePLD(truncatedBuffer, 'test_PLD.edf');

      // Should still parse some records
      expect(result).not.toBeNull();
      expect(result!.leak!.length).toBeGreaterThan(0);
      expect(result!.leak!.length).toBeLessThan(numRecords);
    });

    it('parses correct recording date from EDF header', () => {
      const channels: TestChannel[] = [
        { label: 'Leak', data: [0.2], physicalMin: 0, physicalMax: 2, unit: 'L/s' },
      ];
      const buffer = makePLDBuffer(channels);

      const result = parsePLD(buffer, 'test_PLD.edf');

      expect(result).not.toBeNull();
      // Date header is '01.01.25' -> 2025-01-01, Time is '22.00.00'
      expect(result!.startTime.getFullYear()).toBe(2025);
      expect(result!.startTime.getMonth()).toBe(0); // January
      expect(result!.startTime.getDate()).toBe(1);
      expect(result!.startTime.getHours()).toBe(22);
    });
  });

  describe('computePLDSummary', () => {
    it('computes summary stats for all channels', () => {
      const numRecords = 100;
      const channels = makeFullPLDChannels(numRecords);
      const buffer = makePLDBuffer(channels);
      const pld = parsePLD(buffer, 'test_PLD.edf')!;

      const summary = computePLDSummary(pld);

      expect(summary.samplingRate).toBe(0.5);
      expect(summary.durationSeconds).toBe(200);
      expect(summary.sampleCount).toBe(numRecords);

      // Capability flags
      expect(summary.hasLeakData).toBe(true);
      expect(summary.hasSnoreData).toBe(true);
      expect(summary.hasFflData).toBe(true);
      expect(summary.hasPressureData).toBe(true);

      // Leak stats
      expect(summary.leak).toBeDefined();
      expect(summary.leak!.median).toBeGreaterThan(0);
      expect(summary.leak!.p95).toBeGreaterThan(summary.leak!.median);
      expect(summary.leak!.max).toBeGreaterThanOrEqual(summary.leak!.p95);

      // Pressure stats (with min)
      expect(summary.therapyPressure).toBeDefined();
      expect(summary.therapyPressure!.min).toBeLessThanOrEqual(summary.therapyPressure!.median);

      // Snore stats (with percentAboveZero)
      expect(summary.snore).toBeDefined();
      expect(summary.snore!.percentAboveZero).toBeGreaterThan(0);
      expect(summary.snore!.percentAboveZero).toBeLessThanOrEqual(100);

      // Median-only stats
      expect(summary.ieRatio).toBeDefined();
      expect(summary.ieRatio!.median).toBeGreaterThan(0);

      // Median+p95 stats
      expect(summary.respiratoryRate).toBeDefined();
      expect(summary.respiratoryRate!.median).toBeGreaterThan(0);
      expect(summary.respiratoryRate!.p95).toBeGreaterThanOrEqual(summary.respiratoryRate!.median);
    });

    it('handles PLD with only some channels', () => {
      const numRecords = 50;
      const channels = makeCPAPOnlyChannels(numRecords);
      const buffer = makePLDBuffer(channels);
      const pld = parsePLD(buffer, 'test_PLD.edf')!;

      const summary = computePLDSummary(pld);

      expect(summary.hasLeakData).toBe(true);
      expect(summary.hasSnoreData).toBe(true);
      expect(summary.hasFflData).toBe(true);
      expect(summary.hasPressureData).toBe(true); // therapyPressure is present

      // BiPAP channels should be absent
      expect(summary.expiratoryPressure).toBeUndefined();
      expect(summary.inspiratoryPressure).toBeUndefined();
      expect(summary.ieRatio).toBeUndefined();
      expect(summary.ti).toBeUndefined();
      expect(summary.te).toBeUndefined();
      expect(summary.targetMV).toBeUndefined();
    });

    it('computes correct median for known values', () => {
      // Create a simple PLD with known values
      const data = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const pld: PLDData = {
        samplingRate: 0.5,
        durationSeconds: 20,
        startTime: new Date(),
        leak: data,
      };

      const summary = computePLDSummary(pld);

      expect(summary.leak).toBeDefined();
      expect(summary.leak!.median).toBeCloseTo(5.5, 1); // median of 1-10
      expect(summary.leak!.max).toBe(10);
      expect(summary.leak!.p95).toBeCloseTo(9.55, 1); // 95th percentile
    });

    it('computes correct snore percentAboveZero', () => {
      // 3 out of 10 samples are above zero
      const snoreData = new Float32Array([0, 0, 0, 0, 0, 0, 0, 1, 2, 3]);
      const pld: PLDData = {
        samplingRate: 0.5,
        durationSeconds: 20,
        startTime: new Date(),
        snore: snoreData,
      };

      const summary = computePLDSummary(pld);

      expect(summary.snore).toBeDefined();
      expect(summary.snore!.percentAboveZero).toBeCloseTo(30, 0);
    });

    it('sets capability flags correctly when channels are missing', () => {
      const pld: PLDData = {
        samplingRate: 0.5,
        durationSeconds: 20,
        startTime: new Date(),
        respiratoryRate: new Float32Array([15, 16, 14]),
      };

      const summary = computePLDSummary(pld);

      expect(summary.hasLeakData).toBe(false);
      expect(summary.hasSnoreData).toBe(false);
      expect(summary.hasFflData).toBe(false);
      expect(summary.hasPressureData).toBe(false);
      expect(summary.respiratoryRate).toBeDefined();
    });
  });
});
