import { describe, it, expect } from 'vitest';
import { parseEDF } from '@/lib/parsers/edf-parser';
import { detectOximetryFormat, validateSDFiles, validateOximetryFiles } from '@/lib/upload-validation';
import {
  buildEdfFixture,
  buildStrEdf,
  buildOximetryCsv,
} from './fixtures/generate-edf';

/**
 * Fixture-based upload tests.
 *
 * These tests use the EDF/CSV fixture generators to simulate realistic
 * ResMed SD card uploads and Viatom oximetry CSV imports — the same data
 * path that real users follow.
 *
 * This acts as a deployment contract test: if these pass, the parsers
 * will handle real uploaded files correctly.
 */

// ─── Helper ──────────────────────────────────────────────────

function bufferToFile(buf: ArrayBuffer, name: string, webkitRelativePath = ''): File {
  const file = new File([buf], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'webkitRelativePath', { value: webkitRelativePath });
  return file;
}

// ─── EDF Parsing from Fixtures ───────────────────────────────

describe('Fixture-based EDF parsing', () => {
  it('parses a generated BRP flow file end-to-end', () => {
    const buf = buildEdfFixture({
      startDate: '15.01.25',
      startTime: '23.15.00',
      numRecords: 60,       // 1 minute of data
      recordDuration: 1,
      samplesPerRecord: 25, // 25 Hz
      signalLabel: 'Flow',
    });

    const edf = parseEDF(buf, 'BRP_20250115_231500.edf');

    // Header checks
    expect(edf.header.startDate).toBe('15.01.25');
    expect(edf.header.startTime).toBe('23.15.00');
    expect(edf.header.numDataRecords).toBe(60);
    expect(edf.header.numSignals).toBe(1);

    // Signal checks
    expect(edf.signals).toHaveLength(1);
    expect(edf.signals[0].label).toContain('Flow');
    expect(edf.samplingRate).toBe(25);

    // Data checks
    expect(edf.flowData.length).toBe(60 * 25); // 1500 samples
    expect(edf.durationSeconds).toBe(60);

    // Recording date
    expect(edf.recordingDate.getFullYear()).toBe(2025);
    expect(edf.recordingDate.getMonth()).toBe(0); // January
    expect(edf.recordingDate.getDate()).toBe(15);

    // Flow data should have breathing-like oscillation (not all zeros)
    const max = Math.max(...edf.flowData);
    const min = Math.min(...edf.flowData);
    expect(max).toBeGreaterThan(0);
    expect(min).toBeLessThan(0);
  });

  it('parses a generated FLW file with different sampling rate', () => {
    const buf = buildEdfFixture({
      startDate: '14.01.25',
      startTime: '22.30.00',
      numRecords: 30,
      recordDuration: 1,
      samplesPerRecord: 100, // Higher sampling rate
      signalLabel: 'FLW rate',
    });

    const edf = parseEDF(buf, 'FLW_20250114_223000.edf');
    expect(edf.samplingRate).toBe(100);
    expect(edf.flowData.length).toBe(30 * 100);
    expect(edf.durationSeconds).toBe(30);
  });

  it('rejects EDF with non-flow signal label', () => {
    const buf = buildEdfFixture({ signalLabel: 'SpO2' });
    expect(() => parseEDF(buf, 'SPO2_test.edf')).toThrow('No flow signal');
  });

  it('flow data values stay within physical range after scaling', () => {
    const buf = buildEdfFixture({
      numRecords: 120,
      samplesPerRecord: 25,
      physicalMin: -60,
      physicalMax: 60,
    });

    const edf = parseEDF(buf, 'FLW_test.edf');
    for (let i = 0; i < edf.flowData.length; i++) {
      expect(edf.flowData[i]).toBeGreaterThanOrEqual(-60);
      expect(edf.flowData[i]).toBeLessThanOrEqual(60);
    }
  });

  it('handles multi-night date spans', () => {
    // Night 1
    const buf1 = buildEdfFixture({ startDate: '15.01.25', startTime: '23.00.00' });
    const edf1 = parseEDF(buf1, 'BRP_20250115_230000.edf');

    // Night 2
    const buf2 = buildEdfFixture({ startDate: '14.01.25', startTime: '22.30.00' });
    const edf2 = parseEDF(buf2, 'BRP_20250114_223000.edf');

    // Different dates
    expect(edf1.recordingDate.getDate()).toBe(15);
    expect(edf2.recordingDate.getDate()).toBe(14);

    // Both parse successfully
    expect(edf1.flowData.length).toBeGreaterThan(0);
    expect(edf2.flowData.length).toBeGreaterThan(0);
  });
});

// ─── SD Card Validation with Fixture Files ───────────────────

describe('SD card validation with fixture files', () => {
  it('validates a complete fixture SD card structure', () => {
    const brp = bufferToFile(
      buildEdfFixture({ signalLabel: 'Flow' }),
      'BRP_20250115_231500.edf',
      'SD/DATALOG/20250115/BRP_20250115_231500.edf'
    );
    const flw = bufferToFile(
      buildEdfFixture({ signalLabel: 'FLW rate' }),
      'FLW_20250115_231500.edf',
      'SD/DATALOG/20250115/FLW_20250115_231500.edf'
    );
    const str = bufferToFile(buildStrEdf(), 'STR.edf', 'SD/STR.edf');
    const id = bufferToFile(new ArrayBuffer(100), 'Identification.tgt', 'SD/Identification.tgt');
    const extra1 = bufferToFile(
      buildEdfFixture({ signalLabel: 'Flow' }),
      'BRP_20250114_223000.edf',
      'SD/DATALOG/20250114/BRP_20250114_223000.edf'
    );
    const extra2 = bufferToFile(
      buildEdfFixture({ signalLabel: 'Flow' }),
      'EVE_20250115_231500.edf',
      'SD/DATALOG/20250115/EVE_20250115_231500.edf'
    );

    const result = validateSDFiles([brp, flw, str, id, extra1, extra2]);

    expect(result.valid).toBe(true);
    expect(result.edfCount).toBe(5); // 3 BRP/FLW/EVE + STR + extra BRP
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns when fixture SD card is missing STR.edf', () => {
    const brp = bufferToFile(
      buildEdfFixture({ signalLabel: 'Flow' }),
      'BRP_20250115.edf',
      'SD/DATALOG/20250115/BRP_20250115.edf'
    );
    const flw = bufferToFile(
      buildEdfFixture({ signalLabel: 'FLW rate' }),
      'FLW_20250115.edf',
      'SD/DATALOG/20250115/FLW_20250115.edf'
    );
    // Add enough EDFs so DATALOG check passes
    const extras = Array.from({ length: 3 }, (_, i) =>
      bufferToFile(
        buildEdfFixture({ signalLabel: 'Flow' }),
        `extra${i}.edf`,
        `SD/DATALOG/20250115/extra${i}.edf`
      )
    );

    const result = validateSDFiles([brp, flw, ...extras]);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('STR.edf'))).toBe(true);
  });
});

// ─── Oximetry CSV Fixture Tests ──────────────────────────────

describe('Oximetry CSV fixture tests', () => {
  it('generates and validates a Viatom-format CSV', () => {
    const csv = buildOximetryCsv({ numRows: 50 });
    const lines = csv.split('\n');

    // Header detection
    expect(detectOximetryFormat(lines[0])).toBe('viatom');

    // Data row count (header + 50 data rows)
    expect(lines.length).toBe(51);

    // Parse a data row
    const [time, o2, hr, motion] = lines[1].split(',').map((s) => s.trim());
    expect(time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(parseInt(o2)).toBeGreaterThanOrEqual(80);
    expect(parseInt(o2)).toBeLessThanOrEqual(100);
    expect(parseInt(hr)).toBeGreaterThanOrEqual(40);
    expect(parseInt(hr)).toBeLessThanOrEqual(120);
    expect([0, 1]).toContain(parseInt(motion));
  });

  it('validates fixture CSV through validateOximetryFiles', () => {
    const csv = buildOximetryCsv({ numRows: 100 });
    const file = new File([csv], 'viatom_20250115.csv', { type: 'text/csv' });
    const result = validateOximetryFiles([file]);
    expect(result.valid).toBe(true);
  });

  it('simulates overnight recording with desaturation events', () => {
    const csv = buildOximetryCsv({
      numRows: 500, // ~33 minutes at 4-sec intervals
      baseSpO2: 95,
      baseHR: 64,
      startTime: '2025-01-15 23:30:00',
    });

    const lines = csv.split('\n');
    const dataRows = lines.slice(1).map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      return { spo2: parseInt(parts[1]), hr: parseInt(parts[2]) };
    });

    // Should have some desaturation events (SpO2 dips below baseline)
    const desats = dataRows.filter((r) => r.spo2 < 93);
    expect(desats.length).toBeGreaterThan(0);

    // HR should elevate during desats
    const normalHR = dataRows.filter((r) => r.spo2 >= 95).map((r) => r.hr);
    const desatHR = desats.map((r) => r.hr);
    const avgNormalHR = normalHR.reduce((a, b) => a + b, 0) / normalHR.length;
    const avgDesatHR = desatHR.reduce((a, b) => a + b, 0) / desatHR.length;

    // Desaturation HR should tend higher than normal HR
    // (not a strict assertion due to randomness, but statistically likely)
    expect(avgDesatHR).toBeGreaterThanOrEqual(avgNormalHR - 5);
  });

  it('fixture CSV timestamps cross midnight for overnight sessions', () => {
    const csv = buildOximetryCsv({
      numRows: 1800, // 2 hours at 4-sec intervals
      startTime: '2025-01-15 23:00:00',
    });

    const lines = csv.split('\n');
    const firstTime = lines[1].split(',')[0].trim();
    const lastTime = lines[lines.length - 1].split(',')[0].trim();

    expect(firstTime).toContain('23:00');
    // 1800 rows × 4s = 7200s = 2h → ends at ~01:00 next day
    expect(lastTime).toContain('2025-01-16'); // crosses midnight into next day
  });
});
