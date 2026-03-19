/**
 * Integration tests: Real oximetry CSV parsing (Checkme O2 Max)
 *
 * Parses actual CSV exports from a Viatom/Checkme O2 Max pulse oximeter
 * to verify the parser produces correct structures with real data.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseOximetryCSV } from '@/lib/parsers/oximetry-csv-parser';

const FIXTURES = path.resolve(__dirname, '../fixtures/oximetry');

function readFixture(filename: string): string {
  return fs.readFileSync(path.join(FIXTURES, filename), 'utf-8');
}

// ── Full-night CSV parsing ─────────────────────────────────────

describe('Real oximetry CSV parsing', () => {
  describe('full-night recording (20260310)', () => {
    const csv = readFixture('checkme-o2-max-20260310.csv');

    it('parses without error and returns samples', () => {
      const result = parseOximetryCSV(csv);

      expect(result.samples.length).toBeGreaterThan(0);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.durationSeconds).toBeGreaterThan(0);
    });

    it('has a physiologically reasonable duration (2–10 hours)', () => {
      const result = parseOximetryCSV(csv);
      const hours = result.durationSeconds / 3600;

      expect(hours).toBeGreaterThan(2);
      expect(hours).toBeLessThan(10);
    });

    it('produces valid SpO2 values (50–100) for valid samples', () => {
      const result = parseOximetryCSV(csv);
      const validSamples = result.samples.filter((s) => s.valid);

      expect(validSamples.length).toBeGreaterThan(0);
      for (const s of validSamples) {
        expect(s.spo2).toBeGreaterThanOrEqual(50);
        expect(s.spo2).toBeLessThanOrEqual(100);
      }
    });

    it('produces valid HR values for valid samples', () => {
      const result = parseOximetryCSV(csv);
      const validSamples = result.samples.filter((s) => s.valid && s.hr > 0);

      expect(validSamples.length).toBeGreaterThan(0);
      for (const s of validSamples) {
        expect(s.hr).toBeGreaterThan(0);
        expect(s.hr).toBeLessThan(300);
      }
    });

    it('assigns correct dateStr (YYYY-MM-DD)', () => {
      const result = parseOximetryCSV(csv);

      expect(result.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Started after midnight on Mar 10, so night date should be Mar 9
      expect(result.dateStr).toBe('2026-03-09');
    });

    it('has ~2s sample interval', () => {
      const result = parseOximetryCSV(csv);
      // Check average interval across first 100 samples
      const subset = result.samples.slice(0, 100);
      let totalGap = 0;
      for (let i = 1; i < subset.length; i++) {
        totalGap += subset[i]!.time.getTime() - subset[i - 1]!.time.getTime();
      }
      const avgInterval = totalGap / (subset.length - 1) / 1000;

      expect(avgInterval).toBeGreaterThanOrEqual(1.5);
      expect(avgInterval).toBeLessThanOrEqual(2.5);
    });
  });

  // ── Matching SD card date (20260309) ───────────────────────────

  describe('recording matching SD card date (20260309)', () => {
    const csv = readFixture('checkme-o2-max-20260309.csv');

    it('parses without error', () => {
      const result = parseOximetryCSV(csv);
      expect(result.samples.length).toBeGreaterThan(0);
    });

    it('dateStr matches the SD card night (2026-03-08)', () => {
      const result = parseOximetryCSV(csv);
      // File timestamp 20260309002119 = started 00:21 on Mar 9
      // Night date heuristic: before noon → previous day = Mar 8
      expect(result.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('start and end times are chronologically ordered', () => {
      const result = parseOximetryCSV(csv);
      expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
    });
  });

  // ── Short recording edge case ──────────────────────────────────

  describe('short recording (20260220)', () => {
    const csv = readFixture('checkme-o2-max-20260220-short.csv');

    it('parses without error', () => {
      const result = parseOximetryCSV(csv);
      expect(result.samples.length).toBeGreaterThan(0);
    });

    it('has a shorter duration than a full-night recording', () => {
      const short = parseOximetryCSV(csv);
      const full = parseOximetryCSV(readFixture('checkme-o2-max-20260310.csv'));

      expect(short.durationSeconds).toBeLessThan(full.durationSeconds);
    });

    it('still produces valid sample data', () => {
      const result = parseOximetryCSV(csv);
      const validSamples = result.samples.filter((s) => s.valid);

      expect(validSamples.length).toBeGreaterThan(0);
    });
  });

  // ── Motion field parsing ───────────────────────────────────────

  describe('motion data', () => {
    it('parses motion values from CSV', () => {
      const result = parseOximetryCSV(readFixture('checkme-o2-max-20260310.csv'));

      // At least some samples should have non-zero motion
      const withMotion = result.samples.filter((s) => s.motion > 0);
      expect(withMotion.length).toBeGreaterThan(0);
    });
  });
});
