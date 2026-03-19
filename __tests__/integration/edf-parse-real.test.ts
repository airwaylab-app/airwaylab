/**
 * Integration tests: Real EDF file parsing (AC-2)
 *
 * Parses actual BRP.edf and STR.edf files from test fixtures
 * to verify the parser produces correct structures with real binary data.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEDF, parseSTR } from '@/lib/parsers/edf-parser';
import { extractSettings, parseIdentification, getSettingsForDate } from '@/lib/parsers/settings-extractor';

const FIXTURES = path.resolve(__dirname, '../fixtures/sd-card');

function readFixture(relativePath: string): ArrayBuffer {
  const buf = fs.readFileSync(path.join(FIXTURES, relativePath));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// ── Test Case 1: Parse BRP.edf header ─────────────────────────

describe('Real EDF parsing', () => {
  describe('single-session BRP (20260309)', () => {
    const brpPath = 'DATALOG/20260309/20260310_000159_BRP.edf';

    it('returns valid EDF header with startDate, sampleRate > 0, and signals', () => {
      const buffer = readFixture(brpPath);
      const edf = parseEDF(buffer, brpPath);

      expect(edf.header).toBeDefined();
      expect(edf.header.startDate).toBeTruthy();
      expect(edf.header.startTime).toBeTruthy();
      expect(edf.header.numSignals).toBeGreaterThan(0);
      expect(edf.header.numDataRecords).toBeGreaterThan(0);
      expect(edf.signals.length).toBeGreaterThan(0);
      expect(edf.samplingRate).toBeGreaterThan(0);
      expect(edf.durationSeconds).toBeGreaterThan(0);
      expect(edf.filePath).toBe(brpPath);
    });

    // ── Test Case 2: Extract flow signal → valid Float32Array ──

    it('extracts flow data as a non-empty Float32Array within valid range', () => {
      const buffer = readFixture(brpPath);
      const edf = parseEDF(buffer, brpPath);

      expect(edf.flowData).toBeInstanceOf(Float32Array);
      expect(edf.flowData.length).toBeGreaterThan(0);

      // Flow values should be within physiological range for BiPAP
      // (Can't use Math.min(...spread) — stack overflow on large arrays)
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < edf.flowData.length; i++) {
        if (edf.flowData[i]! < min) min = edf.flowData[i]!;
        if (edf.flowData[i]! > max) max = edf.flowData[i]!;
      }
      expect(min).toBeGreaterThanOrEqual(-200);
      expect(max).toBeLessThanOrEqual(200);
    });

    it('has a physiologically reasonable duration', () => {
      const buffer = readFixture(brpPath);
      const edf = parseEDF(buffer, brpPath);

      // A night session should be between 1 minute and 14 hours
      expect(edf.durationSeconds).toBeGreaterThan(60);
      expect(edf.durationSeconds).toBeLessThan(14 * 3600);
    });

    it('has a valid recording date in 2026', () => {
      const buffer = readFixture(brpPath);
      const edf = parseEDF(buffer, brpPath);

      expect(edf.recordingDate).toBeInstanceOf(Date);
      expect(edf.recordingDate.getFullYear()).toBe(2026);
    });
  });

  describe('multi-session BRP (20260111)', () => {
    const brpFiles = [
      'DATALOG/20260111/20260111_210649_BRP.edf',
      'DATALOG/20260111/20260111_220919_BRP.edf',
      'DATALOG/20260111/20260112_023425_BRP.edf',
    ];

    it('parses all three BRP files without error', () => {
      for (const brpPath of brpFiles) {
        const buffer = readFixture(brpPath);
        const edf = parseEDF(buffer, brpPath);
        expect(edf.header).toBeDefined();
        expect(edf.flowData).toBeInstanceOf(Float32Array);
      }
    });

    it('extracts flow data from each session with consistent sample rate', () => {
      const rates = brpFiles.map((brpPath) => {
        const buffer = readFixture(brpPath);
        return parseEDF(buffer, brpPath).samplingRate;
      });

      // All sessions from the same device should have the same sample rate
      expect(new Set(rates).size).toBe(1);
      expect(rates[0]).toBeGreaterThan(0);
    });
  });

  // ── Test Case 3: Parse STR.edf → machine settings ───────────

  describe('STR.edf settings extraction', () => {
    it('parses STR.edf without error', () => {
      const buffer = readFixture('STR.edf');
      const str = parseSTR(buffer);

      expect(str.header).toBeDefined();
      expect(str.signals.length).toBeGreaterThan(0);
      expect(str.startDateTime).toBeInstanceOf(Date);
    });

    it('extracts machine settings with valid mode and pressures', () => {
      const strBuffer = readFixture('STR.edf');
      const idText = fs.readFileSync(
        path.join(FIXTURES, 'Identification.tgt'),
        'utf-8'
      );
      const deviceModel = parseIdentification(idText);

      expect(deviceModel).toBeTruthy();
      expect(typeof deviceModel).toBe('string');

      const dailySettings = extractSettings(strBuffer, deviceModel);
      expect(dailySettings).toBeDefined();

      // Should have settings for at least one date
      const dates = Object.keys(dailySettings);
      expect(dates.length).toBeGreaterThan(0);

      // Check settings for a known date
      const settings = getSettingsForDate(dailySettings, '2026-03-09');
      if (settings) {
        expect(settings.papMode).toBeTruthy();
        expect(settings.epap).toBeGreaterThan(0);
        expect(settings.ipap).toBeGreaterThanOrEqual(settings.epap);
        expect(typeof settings.trigger).toBe('string');
        expect(typeof settings.cycle).toBe('string');
      }
    });
  });

  // ── Edge case: tiny BRP file (should parse but produce minimal data) ──

  describe('tiny BRP file (20260207)', () => {
    const tinyBrp = 'DATALOG/20260207/20260208_043817_BRP.edf';

    it('throws or produces minimal output for a near-empty EDF file', () => {
      const buffer = readFixture(tinyBrp);

      // The tiny file may be too small for the parser to handle —
      // either it throws (valid: corrupt/insufficient data) or
      // it returns minimal/zero data
      try {
        const edf = parseEDF(buffer, tinyBrp);
        // If it doesn't throw, it should have minimal data
        expect(edf.durationSeconds).toBeLessThan(300);
      } catch (err) {
        // Parser throwing on malformed data is expected behaviour
        expect(err).toBeDefined();
      }
    });
  });
});
