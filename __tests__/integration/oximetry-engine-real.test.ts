/**
 * Integration tests: Oximetry engine with real CSV data
 *
 * Runs the full 17-metric oximetry pipeline on real Checkme O2 Max
 * recordings to verify metric ranges and cleaning behaviour.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseOximetryCSV } from '@/lib/parsers/oximetry-csv-parser';
import { computeOximetry } from '@/lib/analyzers/oximetry-engine';

const FIXTURES = path.resolve(__dirname, '../fixtures/oximetry');

function readFixture(filename: string): string {
  return fs.readFileSync(path.join(FIXTURES, filename), 'utf-8');
}

function parseAndCompute(filename: string) {
  const csv = readFixture(filename);
  const parsed = parseOximetryCSV(csv);
  return computeOximetry(parsed.samples);
}

// ── Full pipeline on a normal night ──────────────────────────────

describe('Oximetry engine with real data', () => {
  describe('full-night recording (20260310)', () => {
    it('produces non-empty results with all 17 metrics', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      // SpO2 metrics
      expect(result.odi3).toBeGreaterThanOrEqual(0);
      expect(result.odi4).toBeGreaterThanOrEqual(0);
      expect(result.tBelow90).toBeGreaterThanOrEqual(0);
      expect(result.tBelow90).toBeLessThanOrEqual(100);
      expect(result.tBelow94).toBeGreaterThanOrEqual(0);
      expect(result.tBelow94).toBeLessThanOrEqual(100);

      // HR Clinical
      expect(result.hrClin8).toBeGreaterThanOrEqual(0);
      expect(result.hrClin10).toBeGreaterThanOrEqual(0);
      expect(result.hrClin12).toBeGreaterThanOrEqual(0);
      expect(result.hrClin15).toBeGreaterThanOrEqual(0);

      // HR Rolling Mean
      expect(result.hrMean10).toBeGreaterThanOrEqual(0);
      expect(result.hrMean15).toBeGreaterThanOrEqual(0);

      // Coupled events
      expect(result.coupled3_6).toBeGreaterThanOrEqual(0);
      expect(result.coupled3_10).toBeGreaterThanOrEqual(0);
      expect(result.coupledHRRatio).toBeGreaterThanOrEqual(0);
      expect(result.coupledHRRatio).toBeLessThanOrEqual(1);

      // Summary stats
      expect(result.spo2Mean).toBeGreaterThan(80);
      expect(result.spo2Mean).toBeLessThanOrEqual(100);
      expect(result.spo2Min).toBeGreaterThanOrEqual(50);
      expect(result.spo2Min).toBeLessThanOrEqual(100);
      expect(result.hrMean).toBeGreaterThan(30);
      expect(result.hrMean).toBeLessThan(150);
      expect(result.hrSD).toBeGreaterThanOrEqual(0);
    });

    it('retains a reasonable proportion of samples after cleaning', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      expect(result.totalSamples).toBeGreaterThan(0);
      expect(result.retainedSamples).toBeGreaterThan(0);
      // After buffer trimming + filtering, should retain >50% of samples
      const retentionRate = result.retainedSamples / result.totalSamples;
      expect(retentionRate).toBeGreaterThan(0.5);
    });

    it('ODI-4 is less than or equal to ODI-3', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      // A 4% drop is a stricter threshold, so ODI-4 ≤ ODI-3
      expect(result.odi4).toBeLessThanOrEqual(result.odi3);
    });

    it('HR surge counts decrease with higher thresholds', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      // Higher threshold → fewer surges
      expect(result.hrClin15).toBeLessThanOrEqual(result.hrClin12);
      expect(result.hrClin12).toBeLessThanOrEqual(result.hrClin10);
      expect(result.hrClin10).toBeLessThanOrEqual(result.hrClin8);
    });
  });

  // ── H1/H2 splits ──────────────────────────────────────────────

  describe('H1/H2 splits', () => {
    it('produces valid H1 and H2 halves', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      expect(result.h1).toBeDefined();
      expect(result.h2).toBeDefined();
      expect(result.h1.odi3).toBeGreaterThanOrEqual(0);
      expect(result.h2.odi3).toBeGreaterThanOrEqual(0);
      expect(result.h1.hrClin10).toBeGreaterThanOrEqual(0);
      expect(result.h2.hrClin10).toBeGreaterThanOrEqual(0);
      expect(result.h1.tBelow94).toBeGreaterThanOrEqual(0);
      expect(result.h2.tBelow94).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Cleaning pipeline ─────────────────────────────────────────

  describe('cleaning pipeline on real data', () => {
    it('corrects double-tracking if present', () => {
      const result = parseAndCompute('checkme-o2-max-20260310.csv');

      // doubleTrackingCorrected should be a non-negative count
      expect(result.doubleTrackingCorrected).toBeGreaterThanOrEqual(0);
    });

    it('handles motion-heavy samples', () => {
      // The recording should have some motion-filtered samples
      const csv = readFixture('checkme-o2-max-20260310.csv');
      const parsed = parseOximetryCSV(csv);
      const highMotion = parsed.samples.filter((s) => s.motion > 5);
      const result = computeOximetry(parsed.samples);

      // If there are high-motion samples, retained should be less than total
      if (highMotion.length > 0) {
        expect(result.retainedSamples).toBeLessThan(result.totalSamples);
      }
    });
  });

  // ── Short recording edge case ─────────────────────────────────

  describe('short recording (20260220)', () => {
    it('handles short recording without crashing', () => {
      const result = parseAndCompute('checkme-o2-max-20260220-short.csv');

      // Short recording may not survive buffer trimming
      // Should either produce valid results or empty results
      expect(result.totalSamples).toBeGreaterThan(0);
      expect(result.spo2Mean).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Cross-recording consistency ────────────────────────────────

  describe('cross-recording consistency', () => {
    it('produces consistent metric shapes across different nights', () => {
      const night1 = parseAndCompute('checkme-o2-max-20260309.csv');
      const night2 = parseAndCompute('checkme-o2-max-20260310.csv');

      // Both should have valid SpO2 means in the same general range
      expect(night1.spo2Mean).toBeGreaterThan(80);
      expect(night2.spo2Mean).toBeGreaterThan(80);

      // Both should have valid HR
      expect(night1.hrMean).toBeGreaterThan(30);
      expect(night2.hrMean).toBeGreaterThan(30);
    });
  });
});
