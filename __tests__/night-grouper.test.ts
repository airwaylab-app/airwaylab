import { describe, it, expect } from 'vitest';
import {
  extractFolderDate,
  groupByNight,
  filterBRPFiles,
  filterSA2Files,
  findSTRFile,
  filterEVEFiles,
  findIdentificationFile,
} from '@/lib/parsers/night-grouper';
import type { EDFFile } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEDF(filePath: string, recordingDate: Date): EDFFile {
  return { filePath, recordingDate } as EDFFile;
}

function makeFile(name: string, path: string, size: number) {
  return { name, path, size };
}

// ---------------------------------------------------------------------------
// extractFolderDate
// ---------------------------------------------------------------------------

describe('extractFolderDate', () => {
  it('returns formatted date from valid DATALOG path', () => {
    expect(extractFolderDate('SD/DATALOG/20260315/BRP.edf')).toBe('2026-03-15');
  });

  it('returns null when no DATALOG folder', () => {
    expect(extractFolderDate('SD/OTHER/20260315/BRP.edf')).toBeNull();
  });

  it('returns null for non-8-digit folder name', () => {
    expect(extractFolderDate('SD/DATALOG/2026031/BRP.edf')).toBeNull();
    expect(extractFolderDate('SD/DATALOG/202603155/BRP.edf')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// groupByNight
// ---------------------------------------------------------------------------

describe('groupByNight', () => {
  it('returns empty array for empty input', () => {
    expect(groupByNight([])).toEqual([]);
  });

  it('groups a single session using DATALOG folder date', () => {
    const edfs = [makeEDF('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 30))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].nightDate).toBe('2026-03-15');
    expect(result[0].sessions).toHaveLength(1);
  });

  it('groups multiple sessions on the same night together, sorted by recording time', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260315/20260315_230000_BRP.edf', new Date(2026, 2, 15, 23, 0)),
      makeEDF('SD/DATALOG/20260315/20260315_210000_BRP.edf', new Date(2026, 2, 15, 21, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].sessions[0].recordingDate.getHours()).toBe(21);
    expect(result[0].sessions[1].recordingDate.getHours()).toBe(23);
  });

  it('sorts multiple nights most-recent-first', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260313/BRP.edf', new Date(2026, 2, 13, 22, 0)),
      makeEDF('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0)),
      makeEDF('SD/DATALOG/20260314/BRP.edf', new Date(2026, 2, 14, 22, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(3);
    expect(result[0].nightDate).toBe('2026-03-15');
    expect(result[1].nightDate).toBe('2026-03-14');
    expect(result[2].nightDate).toBe('2026-03-13');
  });

  it('attributes a pre-midnight session (22:00) to the current date', () => {
    // No DATALOG folder, no filename date -- uses time heuristic
    const edfs = [makeEDF('some/path/BRP.edf', new Date(2026, 2, 15, 22, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].nightDate).toBe('2026-03-15');
  });

  it('attributes a post-midnight session (02:00) with filename date to the previous night', () => {
    // Filename has a date, recording hour is before noon -> previous day
    const edfs = [makeEDF('some/path/20260316_020000_BRP.edf', new Date(2026, 2, 16, 2, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].nightDate).toBe('2026-03-15');
  });

  it('attributes a noon-6PM session to the current date', () => {
    // No DATALOG, no filename date, hour 14 -- falls through to current date
    const edfs = [makeEDF('some/path/BRP.edf', new Date(2026, 2, 15, 14, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].nightDate).toBe('2026-03-15');
  });

  it('groups split sessions (two sessions same night with gap) into the same group', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260315/20260315_220000_BRP.edf', new Date(2026, 2, 15, 22, 0)),
      makeEDF('SD/DATALOG/20260315/20260316_030000_BRP.edf', new Date(2026, 2, 16, 3, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0].nightDate).toBe('2026-03-15');
    expect(result[0].sessions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// filterBRPFiles
// ---------------------------------------------------------------------------

describe('filterBRPFiles', () => {
  it('includes files ending with brp.edf (case insensitive)', () => {
    const files = [
      makeFile('BRP.edf', '/a/BRP.edf', 100_000),
      makeFile('brp.edf', '/a/brp.edf', 100_000),
      makeFile('20260315_220000_BRP.edf', '/a/20260315_220000_BRP.edf', 100_000),
    ];
    expect(filterBRPFiles(files)).toHaveLength(3);
  });

  it('excludes files with exactly 50KB (50 * 1024 bytes)', () => {
    const files = [makeFile('BRP.edf', '/a/BRP.edf', 50 * 1024)];
    expect(filterBRPFiles(files)).toHaveLength(0);
  });

  it('includes files larger than 50KB', () => {
    const files = [makeFile('BRP.edf', '/a/BRP.edf', 50 * 1024 + 1)];
    expect(filterBRPFiles(files)).toHaveLength(1);
  });

  it('excludes non-BRP files', () => {
    const files = [
      makeFile('STR.edf', '/a/STR.edf', 100_000),
      makeFile('EVE.edf', '/a/EVE.edf', 100_000),
      makeFile('data.csv', '/a/data.csv', 100_000),
    ];
    expect(filterBRPFiles(files)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterSA2Files
// ---------------------------------------------------------------------------

describe('filterSA2Files', () => {
  it('includes sa2.edf files (case insensitive)', () => {
    const files = [
      makeFile('SA2.edf', '/a/SA2.edf', 5000),
      makeFile('sa2.edf', '/a/sa2.edf', 5000),
      makeFile('20260315_SA2.edf', '/a/20260315_SA2.edf', 5000),
    ];
    expect(filterSA2Files(files)).toHaveLength(3);
  });

  it('excludes non-SA2 files', () => {
    const files = [
      makeFile('BRP.edf', '/a/BRP.edf', 5000),
      makeFile('STR.edf', '/a/STR.edf', 5000),
    ];
    expect(filterSA2Files(files)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findSTRFile
// ---------------------------------------------------------------------------

describe('findSTRFile', () => {
  it('finds STR.edf (case insensitive)', () => {
    const files = [
      { name: 'BRP.edf', path: '/a/BRP.edf' },
      { name: 'STR.edf', path: '/a/STR.edf' },
    ];
    expect(findSTRFile(files)).toEqual({ name: 'STR.edf', path: '/a/STR.edf' });
  });

  it('finds str.edf lowercase', () => {
    const files = [{ name: 'str.edf', path: '/a/str.edf' }];
    expect(findSTRFile(files)).toEqual({ name: 'str.edf', path: '/a/str.edf' });
  });

  it('returns null when STR.edf is not present', () => {
    const files = [{ name: 'BRP.edf', path: '/a/BRP.edf' }];
    expect(findSTRFile(files)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// filterEVEFiles
// ---------------------------------------------------------------------------

describe('filterEVEFiles', () => {
  it('includes EVE.edf (standalone)', () => {
    const files = [makeFile('EVE.edf', '/a/EVE.edf', 1000)];
    expect(filterEVEFiles(files)).toHaveLength(1);
  });

  it('includes files with underscore before EVE.edf', () => {
    const files = [makeFile('20260315_EVE.edf', '/a/20260315_EVE.edf', 1000)];
    expect(filterEVEFiles(files)).toHaveLength(1);
  });

  it('excludes files ending with EVE.edf without underscore separator', () => {
    const files = [makeFile('BOGUSEVE.edf', '/a/BOGUSEVE.edf', 1000)];
    expect(filterEVEFiles(files)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findIdentificationFile
// ---------------------------------------------------------------------------

describe('findIdentificationFile', () => {
  it('finds Identification.tgt', () => {
    const files = [
      { name: 'BRP.edf', path: '/a/BRP.edf' },
      { name: 'Identification.tgt', path: '/a/Identification.tgt' },
    ];
    expect(findIdentificationFile(files)).toEqual({
      name: 'Identification.tgt',
      path: '/a/Identification.tgt',
    });
  });

  it('finds Identification.json', () => {
    const files = [{ name: 'Identification.json', path: '/a/Identification.json' }];
    expect(findIdentificationFile(files)).toEqual({
      name: 'Identification.json',
      path: '/a/Identification.json',
    });
  });

  it('returns null when no identification file is present', () => {
    const files = [
      { name: 'BRP.edf', path: '/a/BRP.edf' },
      { name: 'STR.edf', path: '/a/STR.edf' },
    ];
    expect(findIdentificationFile(files)).toBeNull();
  });
});
