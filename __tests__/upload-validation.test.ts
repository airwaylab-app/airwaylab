import { describe, it, expect } from 'vitest';
import {
  validateSDFiles,
  validateOximetryFiles,
  detectOximetryFormat,
  checkOximetryFormats,
} from '@/lib/upload-validation';

// Helper to create mock File objects
function mockFile(name: string, size = 1024, webkitRelativePath = ''): File {
  const file = new File(['x'.repeat(size)], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'webkitRelativePath', { value: webkitRelativePath });
  return file;
}

describe('validateSDFiles', () => {
  it('returns error when no files are provided', () => {
    const result = validateSDFiles([]);
    expect(result.valid).toBe(false);
    expect(result.edfCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('No files selected');
  });

  it('returns error when no EDF files exist', () => {
    const files = [mockFile('readme.txt'), mockFile('data.csv')];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(false);
    expect(result.edfCount).toBe(0);
    expect(result.errors[0]).toContain('No EDF files found');
  });

  it('validates basic EDF files successfully', () => {
    const files = [
      mockFile('BRP_20250110_001234.edf', 5000, 'SD/DATALOG/20250110/BRP_20250110_001234.edf'),
      mockFile('FLW_20250110_001234.edf', 5000, 'SD/DATALOG/20250110/FLW_20250110_001234.edf'),
      mockFile('STR.edf', 2000, 'SD/STR.edf'),
      mockFile('some_other.edf', 1000, 'SD/DATALOG/20250110/some_other.edf'),
      mockFile('another.edf', 1000, 'SD/DATALOG/20250110/another.edf'),
      mockFile('more.edf', 1000, 'SD/DATALOG/20250110/more.edf'),
    ];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.edfCount).toBe(6);
    expect(result.errors).toHaveLength(0);
  });

  it('warns when no STR.edf is found', () => {
    const files = [
      mockFile('BRP_20250110.edf', 5000, 'SD/DATALOG/20250110/BRP_20250110.edf'),
      mockFile('FLW_20250110.edf', 5000, 'SD/DATALOG/20250110/FLW_20250110.edf'),
      mockFile('other1.edf', 1000, 'SD/DATALOG/20250110/other1.edf'),
      mockFile('other2.edf', 1000, 'SD/DATALOG/20250110/other2.edf'),
      mockFile('other3.edf', 1000, 'SD/DATALOG/20250110/other3.edf'),
    ];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('STR.edf'))).toBe(true);
  });

  it('warns when no flow data files found', () => {
    const files = [
      mockFile('EVE_20250110.edf', 5000, 'SD/DATALOG/20250110/EVE_20250110.edf'),
      mockFile('STR.edf', 2000, 'SD/STR.edf'),
      mockFile('other1.edf', 1000, 'SD/DATALOG/20250110/other1.edf'),
      mockFile('other2.edf', 1000, 'SD/DATALOG/20250110/other2.edf'),
      mockFile('other3.edf', 1000, 'SD/DATALOG/20250110/other3.edf'),
    ];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('flow data'))).toBe(true);
  });

  it('warns when many non-EDF files are included', () => {
    const files: File[] = [];
    // Add some EDF files
    for (let i = 0; i < 5; i++) {
      files.push(mockFile(`file${i}.edf`, 1000, `SD/DATALOG/20250110/file${i}.edf`));
    }
    // Add >100 non-EDF files
    for (let i = 0; i < 105; i++) {
      files.push(mockFile(`photo${i}.jpg`, 500, `SD/photos/photo${i}.jpg`));
    }
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('non-EDF files'))).toBe(true);
  });

  it('warns about missing DATALOG structure when few EDFs and no DATALOG path', () => {
    const files = [
      mockFile('BRP.edf'),
      mockFile('FLW.edf'),
      mockFile('STR.edf'),
    ];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('DATALOG folder'))).toBe(true);
  });

  it('handles case-insensitive EDF extension', () => {
    const files = [
      mockFile('BRP_20250110.EDF', 5000, 'SD/DATALOG/20250110/BRP_20250110.EDF'),
      mockFile('FLW_20250110.Edf', 5000, 'SD/DATALOG/20250110/FLW_20250110.Edf'),
      mockFile('str.edf', 2000, 'SD/str.edf'),
      mockFile('other1.edf', 1000, 'SD/DATALOG/20250110/other1.edf'),
      mockFile('other2.edf', 1000, 'SD/DATALOG/20250110/other2.edf'),
    ];
    const result = validateSDFiles(files);
    expect(result.valid).toBe(true);
    expect(result.edfCount).toBe(5);
  });
});

describe('validateOximetryFiles', () => {
  it('returns error when no CSV files exist', () => {
    const files = [mockFile('data.txt')];
    const result = validateOximetryFiles(files);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('No CSV files found');
  });

  it('validates CSV files successfully', () => {
    const files = [mockFile('oximetry_2025-01-10.csv', 5000)];
    const result = validateOximetryFiles(files);
    expect(result.valid).toBe(true);
    expect(result.edfCount).toBe(1); // edfCount is reused for CSV count
  });

  it('warns about very large files', () => {
    const files = [mockFile('huge.csv', 60 * 1024 * 1024)]; // 60MB
    const result = validateOximetryFiles(files);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('50MB'))).toBe(true);
  });

  it('handles multiple CSV files', () => {
    const files = [
      mockFile('night1.csv', 5000),
      mockFile('night2.csv', 5000),
      mockFile('night3.csv', 5000),
    ];
    const result = validateOximetryFiles(files);
    expect(result.valid).toBe(true);
    expect(result.edfCount).toBe(3);
  });
});

describe('detectOximetryFormat', () => {
  it('detects Viatom format', () => {
    expect(detectOximetryFormat('Time, Oxygen Level, Pulse Rate, Motion')).toBe('viatom');
  });

  it('detects Viatom format case-insensitively', () => {
    expect(detectOximetryFormat('time,OXYGEN LEVEL,PULSE RATE')).toBe('viatom');
  });

  it('returns unknown for unrecognized format', () => {
    expect(detectOximetryFormat('timestamp,spo2,hr,movement')).toBe('unknown');
  });

  it('returns unknown for empty header', () => {
    expect(detectOximetryFormat('')).toBe('unknown');
  });

  it('returns unknown for non-oximetry CSV', () => {
    expect(detectOximetryFormat('Name,Age,City')).toBe('unknown');
  });
});

describe('checkOximetryFormats', () => {
  it('returns empty array for supported files', async () => {
    const content = 'Time, Oxygen Level, Pulse Rate, Motion\n12:00,98,65,0';
    const file = new File([content], 'oximetry.csv', { type: 'text/csv' });
    const result = await checkOximetryFormats([file]);
    expect(result).toHaveLength(0);
  });

  it('returns unsupported files with header samples', async () => {
    const content = 'timestamp,spo2,hr\n1234567890,97,62\n1234567891,96,63';
    const file = new File([content], 'wellue.csv', { type: 'text/csv' });
    const result = await checkOximetryFormats([file]);
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('wellue.csv');
    expect(result[0].headerSample).toContain('timestamp,spo2,hr');
  });

  it('skips non-CSV files', async () => {
    const file = new File(['binary data'], 'data.edf', { type: '' });
    const result = await checkOximetryFormats([file]);
    expect(result).toHaveLength(0);
  });

  it('handles mixed supported and unsupported files', async () => {
    const supported = new File(['Time, Oxygen Level, Pulse Rate\n12:00,98,65'], 'good.csv');
    const unsupported = new File(['ts,o2,hr\n1,97,62'], 'bad.csv');
    const result = await checkOximetryFormats([supported, unsupported]);
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('bad.csv');
  });
});
