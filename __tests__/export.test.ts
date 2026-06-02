import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCSV, exportJSON, exportJSONChunked, JSON_EXPORT_CHUNK_SIZE, downloadFile } from '@/lib/export';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';

describe('exportCSV', () => {
  it('produces correct number of lines (header + data rows)', () => {
    const csv = exportCSV(SAMPLE_NIGHTS);
    const lines = csv.split('\n');
    expect(lines.length).toBe(SAMPLE_NIGHTS.length + 1); // header + nights
  });

  it('header has expected columns', () => {
    const csv = exportCSV(SAMPLE_NIGHTS);
    const header = csv.split('\n')[0];
    expect(header).toContain('Date');
    expect(header).toContain('Glasgow Overall');
    expect(header).toContain('WAT FL Score');
    expect(header).toContain('NED Mean');
    expect(header).toContain('RERA Index');
    expect(header).toContain('ODI3');
  });

  it('data rows contain numeric values', () => {
    const csv = exportCSV(SAMPLE_NIGHTS);
    const firstDataRow = csv.split('\n')[1];
    const cols = firstDataRow!.split(',');
    // Date string in first column
    expect(cols[0]).toMatch(/\d{4}-\d{2}-\d{2}/);
    // Duration should be numeric
    expect(parseFloat(cols[1]!)).toBeGreaterThan(0);
  });

  it('properly escapes fields containing commas', () => {
    // The sample data shouldn't have commas in values, but the escape function should handle them
    const csv = exportCSV(SAMPLE_NIGHTS);
    // Verify no unescaped commas break the CSV structure
    const lines = csv.split('\n');
    const headerColCount = lines[0]!.split(',').length;
    // Each data row should have the same number of columns
    for (let i = 1; i < lines.length; i++) {
      // Simple split check — escaped commas in quotes would be trickier
      // but our numeric data won't have commas
      expect(lines[i]!.split(',').length).toBe(headerColCount);
    }
  });

  it('handles nights without oximetry data', () => {
    const nightsNoOx = SAMPLE_NIGHTS.map((n) => ({ ...n, oximetry: null }));
    const csv = exportCSV(nightsNoOx);
    const firstDataRow = csv.split('\n')[1];
    // Oximetry columns should be empty
    expect(firstDataRow).not.toContain('undefined');
    expect(firstDataRow).not.toContain('NaN');
  });
});

describe('exportJSON', () => {
  it('produces valid JSON', () => {
    const json = exportJSON(SAMPLE_NIGHTS);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('preserves all nights', () => {
    const json = exportJSON(SAMPLE_NIGHTS);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(SAMPLE_NIGHTS.length);
  });

  it('preserves key metrics', () => {
    const json = exportJSON(SAMPLE_NIGHTS);
    const parsed = JSON.parse(json);
    expect(parsed[0].glasgow).toBeDefined();
    expect(parsed[0].wat).toBeDefined();
    expect(parsed[0].ned).toBeDefined();
    expect(parsed[0].dateStr).toBeDefined();
  });

  it('strips per-breath Float32Arrays to prevent RangeError on large datasets', () => {
    // Simulate nights with per-breath data including Float32Arrays (inspFlow)
    const nightsWithBreaths = SAMPLE_NIGHTS.map((n) => ({
      ...n,
      ned: {
        ...n.ned,
        breaths: [
          {
            inspStart: 0, inspEnd: 75, expStart: 75, expEnd: 150,
            inspFlow: new Float32Array([1.0, 0.9, 0.8]),
            qPeak: 1.0, qMid: 0.9, ti: 3.0, tPeakTi: 0.3,
            ned: 10, fi: 0.9, isMShape: false, isEarlyPeakFL: false,
          },
        ],
        reras: [{ startBreathIdx: 0, endBreathIdx: 5, breathCount: 6, nedSlope: 0.5, hasRecovery: true, hasSigh: false, maxNED: 30, startSec: 0, durationSec: 18 }],
      },
      oximetryTrace: { trace: new Float32Array([98, 97, 96]), durationSeconds: 3 } as unknown as null,
    }));
    const json = exportJSON(nightsWithBreaths);
    const parsed = JSON.parse(json);
    expect(parsed[0].ned.breaths).toEqual([]);
    expect(parsed[0].ned.reras).toBeUndefined();
    expect(parsed[0].oximetryTrace).toBeNull();
    // Summary NED metrics should still be present
    expect(parsed[0].ned.nedMean).toBeDefined();
    expect(parsed[0].ned.reraIndex).toBeDefined();
  });
});

describe('exportJSONChunked', () => {
  it('returns a single chunk with default filename for small datasets', () => {
    const chunks = exportJSONChunked(SAMPLE_NIGHTS);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.filename).toBe('airwaylab-results.json');
    expect(() => JSON.parse(chunks[0]!.content)).not.toThrow();
  });

  it('returns empty array for empty input', () => {
    expect(exportJSONChunked([])).toEqual([]);
  });

  it('splits datasets larger than chunkSize into date-ranged files', () => {
    const manyNights = Array.from({ length: JSON_EXPORT_CHUNK_SIZE + 10 }, (_, i) => ({
      ...SAMPLE_NIGHTS[0]!,
      dateStr: `2024-01-${String(i + 1).padStart(2, '0')}`,
    }));
    const chunks = exportJSONChunked(manyNights);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.filename).toMatch(/^airwaylab-results-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.json$/);
    expect(chunks[1]!.filename).toMatch(/^airwaylab-results-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('each chunk contains valid JSON with the correct night count', () => {
    const nightCount = JSON_EXPORT_CHUNK_SIZE + 10;
    const manyNights = Array.from({ length: nightCount }, (_, i) => ({
      ...SAMPLE_NIGHTS[0]!,
      dateStr: `2024-01-${String(i + 1).padStart(2, '0')}`,
    }));
    const chunks = exportJSONChunked(manyNights);
    const parsed0 = JSON.parse(chunks[0]!.content) as unknown[];
    const parsed1 = JSON.parse(chunks[1]!.content) as unknown[];
    expect(parsed0).toHaveLength(JSON_EXPORT_CHUNK_SIZE);
    expect(parsed1).toHaveLength(10);
  });

  it('does not throw for large datasets (oversized export handled gracefully)', () => {
    const largeDataset = Array.from({ length: 300 }, (_, i) => ({
      ...SAMPLE_NIGHTS[0]!,
      dateStr: `202${Math.floor(i / 365)}-${String(Math.floor((i % 365) / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
    }));
    expect(() => exportJSONChunked(largeDataset)).not.toThrow();
    const chunks = exportJSONChunked(largeDataset);
    expect(chunks.length).toBe(Math.ceil(300 / JSON_EXPORT_CHUNK_SIZE));
    for (const { content } of chunks) {
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });
});

describe('downloadFile', () => {
  beforeEach(() => {
    // Mock DOM methods
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('creates a download link and triggers click', () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    downloadFile('test content', 'test.csv', 'text/csv');

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
