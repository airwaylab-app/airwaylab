/**
 * Integration tests: Chart downsampling with real data volumes (AC-5)
 *
 * Verifies downsampleForChart correctly reduces large datasets
 * and sanitizeNumber handles edge cases.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEDF } from '@/lib/parsers/edf-parser';
import {
  downsampleForChart,
  sanitizeNumber,
  MAX_CHART_POINTS,
} from '@/lib/chart-downsample';

const FIXTURES = path.resolve(__dirname, '../fixtures/sd-card');

function readFixture(relativePath: string): ArrayBuffer {
  const buf = fs.readFileSync(path.join(FIXTURES, relativePath));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// ── Test Case 12: Downsample real flow data to ≤ 1500 ─────────

describe('downsampleForChart — real data', () => {
  it('reduces large flow data array to ≤ MAX_CHART_POINTS', () => {
    const edf = parseEDF(
      readFixture('DATALOG/20260309/20260310_000159_BRP.edf'),
      'test.edf'
    );

    // Convert Float32Array to a chart-like array of objects
    const chartData = Array.from(edf.flowData).map((v, i) => ({
      t: i / edf.samplingRate,
      value: v,
    }));

    // Verify the original data is large enough to need downsampling
    expect(chartData.length).toBeGreaterThan(MAX_CHART_POINTS);

    const downsampled = downsampleForChart(chartData);

    expect(downsampled.length).toBeLessThanOrEqual(MAX_CHART_POINTS);
    expect(downsampled.length).toBe(MAX_CHART_POINTS);
  });

  // ── Test Case 13: First and last elements preserved ───────────

  it('preserves first and last elements', () => {
    const edf = parseEDF(
      readFixture('DATALOG/20260309/20260310_000159_BRP.edf'),
      'test.edf'
    );

    const chartData = Array.from(edf.flowData).map((v, i) => ({
      t: i / edf.samplingRate,
      value: v,
    }));

    const downsampled = downsampleForChart(chartData);

    expect(downsampled[0]).toEqual(chartData[0]);
    expect(downsampled[downsampled.length - 1]).toEqual(
      chartData[chartData.length - 1]
    );
  });

  it('returns original array when already under the limit', () => {
    const smallData = Array.from({ length: 100 }, (_, i) => ({
      t: i,
      value: Math.sin(i),
    }));

    const result = downsampleForChart(smallData);
    expect(result).toBe(smallData); // same reference
    expect(result.length).toBe(100);
  });

  it('handles empty array', () => {
    const result = downsampleForChart([]);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });
});

// ── Test Case 14: sanitizeNumber edge cases ─────────────────

describe('sanitizeNumber', () => {
  it('returns fallback for NaN', () => {
    expect(sanitizeNumber(NaN)).toBe(0);
    expect(sanitizeNumber(NaN, -1)).toBe(-1);
  });

  it('returns fallback for Infinity', () => {
    expect(sanitizeNumber(Infinity)).toBe(0);
    expect(sanitizeNumber(-Infinity)).toBe(0);
  });

  it('returns the value for valid numbers', () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(-3.14)).toBe(-3.14);
    expect(sanitizeNumber(0)).toBe(0);
  });
});
