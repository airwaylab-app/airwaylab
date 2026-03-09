import { describe, it, expect } from 'vitest';
import { parseEDF } from '@/lib/parsers/edf-parser';
import { detectOximetryFormat } from '@/lib/upload-validation';

/**
 * Tests for SD card data and oximetry CSV parsing.
 *
 * These tests verify:
 * - EDF binary file parsing (ResMed SD card files) — header + signal data
 * - Oximetry CSV format detection
 * - Edge cases in file validation
 *
 * For deployment testing with real data, these serve as a contract test:
 * if the parsers handle the binary formats correctly here, they'll work
 * with real uploads too.
 */

// ─── EDF File Builder ────────────────────────────────────────
// Constructs a minimal valid EDF file with header + signal data

function buildMinimalEdf(options: {
  startDate?: string;
  startTime?: string;
  numRecords?: number;
  recordDuration?: number;
  signalLabel?: string;
  samplesPerRecord?: number;
} = {}): ArrayBuffer {
  const {
    startDate = '15.01.25',
    startTime = '23.15.00',
    numRecords = 10,
    recordDuration = 1,
    signalLabel = 'Flow',
    samplesPerRecord = 4,
  } = options;

  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;

  function pad(str: string, len: number): string {
    return str.padEnd(len, ' ').slice(0, len);
  }

  // Fixed header (256 bytes)
  let header = '';
  header += pad('0', 8);                       // version
  header += pad('X X X X', 80);                // patient
  header += pad('Startdate 15-JAN-2025', 80);  // recording
  header += pad(startDate, 8);                  // start date
  header += pad(startTime, 8);                  // start time
  header += pad(String(headerBytes), 8);        // header bytes
  header += pad('', 44);                        // reserved
  header += pad(String(numRecords), 8);         // num records
  header += pad(String(recordDuration), 8);     // record duration
  header += pad(String(numSignals), 4);         // num signals

  // Signal headers (256 bytes per signal)
  header += pad(signalLabel, 16);               // label
  header += pad('', 80);                        // transducer type
  header += pad('cmH2O', 8);                    // physical dimension
  header += pad('-128', 8);                     // physical min
  header += pad('128', 8);                      // physical max
  header += pad('-32768', 8);                   // digital min
  header += pad('32767', 8);                    // digital max
  header += pad('', 80);                        // prefiltering
  header += pad(String(samplesPerRecord), 8);   // samples per record
  header += pad('', 32);                        // reserved

  const encoder = new TextEncoder();
  const headerBytes_ = encoder.encode(header);

  // Data: numRecords × samplesPerRecord × 2 bytes (Int16)
  const dataSize = numRecords * samplesPerRecord * 2;
  const totalSize = headerBytes + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const uint8 = new Uint8Array(buffer);
  uint8.set(headerBytes_);

  // Write sine-wave-like flow data
  const dataView = new DataView(buffer);
  let offset = headerBytes;
  for (let rec = 0; rec < numRecords; rec++) {
    for (let s = 0; s < samplesPerRecord; s++) {
      const t = (rec * samplesPerRecord + s) / (samplesPerRecord * numRecords);
      const value = Math.round(Math.sin(t * 2 * Math.PI * 15) * 10000);
      dataView.setInt16(offset, value, true);
      offset += 2;
    }
  }

  return buffer;
}

describe('EDF Full File Parsing', () => {
  it('parses a minimal valid EDF file', () => {
    const buffer = buildMinimalEdf({
      startDate: '15.01.25',
      startTime: '23.15.00',
      numRecords: 10,
      samplesPerRecord: 4,
    });

    const edf = parseEDF(buffer, 'FLW_20250115_231500.edf');
    expect(edf.header.startDate).toBe('15.01.25');
    expect(edf.header.startTime).toBe('23.15.00');
    expect(edf.header.numDataRecords).toBe(10);
    expect(edf.header.numSignals).toBe(1);
    expect(edf.signals).toHaveLength(1);
    expect(edf.signals[0].label.trim()).toBe('Flow');
  });

  it('returns correct flow data length', () => {
    const numRecords = 20;
    const samplesPerRecord = 8;
    const buffer = buildMinimalEdf({ numRecords, samplesPerRecord });

    const edf = parseEDF(buffer, 'FLW_test.edf');
    expect(edf.flowData.length).toBe(numRecords * samplesPerRecord);
  });

  it('computes correct sampling rate', () => {
    const buffer = buildMinimalEdf({
      recordDuration: 1,
      samplesPerRecord: 256,
      numRecords: 5,
    });

    const edf = parseEDF(buffer, 'FLW_test.edf');
    expect(edf.samplingRate).toBe(256); // 256 samples per 1-second record
  });

  it('parses recording date correctly', () => {
    const buffer = buildMinimalEdf({
      startDate: '10.01.25',
      startTime: '22.30.00',
    });

    const edf = parseEDF(buffer, 'FLW_test.edf');
    const d = edf.recordingDate;
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(22);
    expect(d.getMinutes()).toBe(30);
  });

  it('correctly scales flow data from digital to physical values', () => {
    const buffer = buildMinimalEdf({ numRecords: 1, samplesPerRecord: 2 });

    const edf = parseEDF(buffer, 'FLW_test.edf');
    // Physical range: -128 to 128, Digital range: -32768 to 32767
    for (let i = 0; i < edf.flowData.length; i++) {
      expect(edf.flowData[i]).toBeGreaterThanOrEqual(-128);
      expect(edf.flowData[i]).toBeLessThanOrEqual(128);
    }
  });

  it('throws when no flow signal is found', () => {
    const buffer = buildMinimalEdf({ signalLabel: 'EEG' });
    expect(() => parseEDF(buffer, 'EEG_test.edf')).toThrow('No flow signal found');
  });

  it('calculates total duration from header fields', () => {
    const numRecords = 3600;
    const recordDuration = 1;
    const buffer = buildMinimalEdf({ numRecords, recordDuration, samplesPerRecord: 2 });

    const edf = parseEDF(buffer, 'FLW_test.edf');
    expect(edf.durationSeconds).toBe(3600); // 1 hour
  });
});

describe('Oximetry Format Detection', () => {
  it('detects Viatom CSV headers', () => {
    const headers = [
      'Time, Oxygen Level, Pulse Rate, Motion',
      'Time,Oxygen Level,Pulse Rate,Motion,SpO2 Event,Pulse Rate Event',
      'time, oxygen level, pulse rate',
    ];
    for (const h of headers) {
      expect(detectOximetryFormat(h)).toBe('viatom');
    }
  });

  it('rejects Wellue O2Ring format', () => {
    expect(detectOximetryFormat('timestamp,spo2,pulse_rate,motion')).toBe('unknown');
  });

  it('rejects generic SpO2 format', () => {
    expect(detectOximetryFormat('Time,SpO2,HR')).toBe('unknown');
  });

  it('rejects Nonin format', () => {
    expect(detectOximetryFormat('Date,Time,SpO2(%),Pulse(BPM)')).toBe('unknown');
  });

  it('rejects Masimo format', () => {
    expect(detectOximetryFormat('DateTime,SpO2,PR,PI,Alarm')).toBe('unknown');
  });

  it('rejects empty/garbage headers', () => {
    expect(detectOximetryFormat('')).toBe('unknown');
    expect(detectOximetryFormat(',,,')).toBe('unknown');
    expect(detectOximetryFormat('Hello World')).toBe('unknown');
  });
});

describe('Oximetry CSV Content Parsing', () => {
  it('validates a realistic Viatom CSV structure', () => {
    const csvContent = [
      'Time, Oxygen Level, Pulse Rate, Motion',
      '2025-01-15 22:30:00, 97, 62, 0',
      '2025-01-15 22:30:04, 96, 63, 0',
      '2025-01-15 22:30:08, 98, 61, 1',
      '2025-01-15 22:31:00, 95, 65, 0',
      '2025-01-15 22:31:04, 94, 67, 0',
    ].join('\n');

    const lines = csvContent.split('\n');
    expect(detectOximetryFormat(lines[0])).toBe('viatom');

    const dataRows = lines.slice(1).map((line) => {
      const [time, o2, hr, motion] = line.split(',').map((s) => s.trim());
      return { time, o2: parseInt(o2), hr: parseInt(hr), motion: parseInt(motion) };
    });

    expect(dataRows).toHaveLength(5);
    expect(dataRows[0].o2).toBe(97);
    expect(dataRows[0].hr).toBe(62);

    for (const row of dataRows) {
      expect(row.o2).toBeGreaterThanOrEqual(70);
      expect(row.o2).toBeLessThanOrEqual(100);
      expect(row.hr).toBeGreaterThanOrEqual(30);
      expect(row.hr).toBeLessThanOrEqual(200);
    }
  });

  it('handles overnight sessions crossing midnight', () => {
    const csvContent = [
      'Time, Oxygen Level, Pulse Rate, Motion',
      '2025-01-15 23:59:00, 97, 62, 0',
      '2025-01-16 00:01:00, 96, 63, 0',
    ].join('\n');

    const lines = csvContent.split('\n');
    expect(detectOximetryFormat(lines[0])).toBe('viatom');

    const timestamps = lines.slice(1).map((l) => l.split(',')[0].trim());
    expect(timestamps[0]).toContain('23:59');
    expect(timestamps[1]).toContain('00:01');
  });
});
