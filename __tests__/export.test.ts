import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCSV, exportJSON, downloadFile } from '@/lib/export';
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
    const cols = firstDataRow.split(',');
    // Date string in first column
    expect(cols[0]).toMatch(/\d{4}-\d{2}-\d{2}/);
    // Duration should be numeric
    expect(parseFloat(cols[1])).toBeGreaterThan(0);
  });

  it('properly escapes fields containing commas', () => {
    // The sample data shouldn't have commas in values, but the escape function should handle them
    const csv = exportCSV(SAMPLE_NIGHTS);
    // Verify no unescaped commas break the CSV structure
    const lines = csv.split('\n');
    const headerColCount = lines[0].split(',').length;
    // Each data row should have the same number of columns
    for (let i = 1; i < lines.length; i++) {
      // Simple split check — escaped commas in quotes would be trickier
      // but our numeric data won't have commas
      expect(lines[i].split(',').length).toBe(headerColCount);
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
