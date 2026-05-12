import { describe, it, expect } from 'vitest';
import {
  extractFolderDate,
  extractPLDFilenameDate,
  groupByNight,
  filterBRPFiles,
  filterPLDFiles,
  filterSA2Files,
  filterCSLFiles,
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

  it('handles DATALOG path with nested subdirectories', () => {
    expect(extractFolderDate('CPAP/SD/DATALOG/20260101/subfolder/BRP.edf')).toBe('2026-01-01');
  });
});

// ---------------------------------------------------------------------------
// extractPLDFilenameDate
// ---------------------------------------------------------------------------

describe('extractPLDFilenameDate', () => {
  it('returns formatted date from valid PLD filename', () => {
    expect(extractPLDFilenameDate('20260315_220000_PLD.edf')).toBe('2026-03-15');
  });

  it('handles PLD filename with path prefix', () => {
    expect(extractPLDFilenameDate('SD/DATALOG/20260315/20260315_220000_PLD.edf')).toBe('2026-03-15');
  });

  it('is case insensitive', () => {
    expect(extractPLDFilenameDate('20260315_220000_pld.edf')).toBe('2026-03-15');
  });

  it('returns null for non-PLD filenames', () => {
    expect(extractPLDFilenameDate('20260315_220000_BRP.edf')).toBeNull();
    expect(extractPLDFilenameDate('STR.edf')).toBeNull();
    expect(extractPLDFilenameDate('random.txt')).toBeNull();
  });

  it('returns null for malformed date strings', () => {
    expect(extractPLDFilenameDate('2026031_220000_PLD.edf')).toBeNull();
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
    expect(result[0]!.nightDate).toBe('2026-03-15');
    expect(result[0]!.sessions).toHaveLength(1);
  });

  it('groups multiple sessions on the same night together, sorted by recording time', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260315/20260315_230000_BRP.edf', new Date(2026, 2, 15, 23, 0)),
      makeEDF('SD/DATALOG/20260315/20260315_210000_BRP.edf', new Date(2026, 2, 15, 21, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.sessions[0]!.recordingDate.getHours()).toBe(21);
    expect(result[0]!.sessions[1]!.recordingDate.getHours()).toBe(23);
  });

  it('sorts multiple nights most-recent-first', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260313/BRP.edf', new Date(2026, 2, 13, 22, 0)),
      makeEDF('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0)),
      makeEDF('SD/DATALOG/20260314/BRP.edf', new Date(2026, 2, 14, 22, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(3);
    expect(result[0]!.nightDate).toBe('2026-03-15');
    expect(result[1]!.nightDate).toBe('2026-03-14');
    expect(result[2]!.nightDate).toBe('2026-03-13');
  });

  it('attributes a pre-midnight session (22:00) to the current date', () => {
    // No DATALOG folder, no filename date -- uses time heuristic
    const edfs = [makeEDF('some/path/BRP.edf', new Date(2026, 2, 15, 22, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes a post-midnight session (02:00) with filename date to the previous night', () => {
    // Filename has a date, recording hour is before noon -> previous day
    const edfs = [makeEDF('some/path/20260316_020000_BRP.edf', new Date(2026, 2, 16, 2, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes a noon-6PM session to the current date', () => {
    // No DATALOG, no filename date, hour 14 -- falls through to current date
    const edfs = [makeEDF('some/path/BRP.edf', new Date(2026, 2, 15, 14, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('groups split sessions (two sessions same night with gap) into the same group', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260315/20260315_220000_BRP.edf', new Date(2026, 2, 15, 22, 0)),
      makeEDF('SD/DATALOG/20260315/20260316_030000_BRP.edf', new Date(2026, 2, 16, 3, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
    expect(result[0]!.sessions).toHaveLength(2);
  });

  it('separates sessions on different nights (days apart)', () => {
    const edfs = [
      makeEDF('SD/DATALOG/20260310/BRP.edf', new Date(2026, 2, 10, 22, 0)),
      makeEDF('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0)),
      makeEDF('SD/DATALOG/20260320/BRP.edf', new Date(2026, 2, 20, 22, 0)),
    ];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(3);
    expect(result[0]!.nightDate).toBe('2026-03-20');
    expect(result[1]!.nightDate).toBe('2026-03-15');
    expect(result[2]!.nightDate).toBe('2026-03-10');
  });

  it('attributes post-midnight session to previous day via time heuristic (no folder, no filename date)', () => {
    // No DATALOG folder, no BRP filename -- pure time heuristic
    const edfs = [makeEDF('some/path/flow.edf', new Date(2026, 2, 16, 3, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes 11:59 AM session to previous day via time heuristic', () => {
    // Hour 11 < 12 -- should map to previous day
    const edfs = [makeEDF('some/path/flow.edf', new Date(2026, 2, 16, 11, 59))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes exactly noon session to current date via time heuristic', () => {
    // Hour 12, no folder, no filename date -- >= 12 and < 18 falls through to current date
    const edfs = [makeEDF('some/path/flow.edf', new Date(2026, 2, 15, 12, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes 5:59 PM session to current date via time heuristic', () => {
    // Hour 17 (5 PM), still in noon-to-6PM window
    const edfs = [makeEDF('some/path/flow.edf', new Date(2026, 2, 15, 17, 59))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('attributes exactly 6 PM session to current date (>= 18 branch)', () => {
    const edfs = [makeEDF('some/path/flow.edf', new Date(2026, 2, 15, 18, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('uses filename date for afternoon recording when filename date exists', () => {
    // Filename date exists, hour >= 12 -- uses filename date directly
    const edfs = [makeEDF('some/path/20260315_140000_BRP.edf', new Date(2026, 2, 15, 14, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('DATALOG folder takes priority over filename date', () => {
    // Folder says 20260315 but filename says 20260316 -- folder wins
    const edfs = [makeEDF('SD/DATALOG/20260315/20260316_030000_BRP.edf', new Date(2026, 2, 16, 3, 0))];
    const result = groupByNight(edfs);

    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2026-03-15');
  });

  it('handles many sessions across many nights', () => {
    const edfs: EDFFile[] = [];
    for (let day = 1; day <= 14; day++) {
      const dd = String(day).padStart(2, '0');
      // Two sessions per night
      edfs.push(makeEDF(`SD/DATALOG/202603${dd}/BRP.edf`, new Date(2026, 2, day, 22, 0)));
      edfs.push(makeEDF(`SD/DATALOG/202603${dd}/BRP2.edf`, new Date(2026, 2, day, 23, 30)));
    }
    const result = groupByNight(edfs);

    expect(result).toHaveLength(14);
    // Each night should have 2 sessions
    for (const group of result) {
      expect(group.sessions).toHaveLength(2);
    }
    // Sorted most-recent-first
    expect(result[0]!.nightDate).toBe('2026-03-14');
    expect(result[13]!.nightDate).toBe('2026-03-01');
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

  it('includes FLW.edf files for bilevel devices', () => {
    const files = [
      makeFile('FLW.edf', '/a/FLW.edf', 100_000),
      makeFile('flw.edf', '/a/flw.edf', 100_000),
      makeFile('20260315_220000_FLW.edf', '/a/20260315_220000_FLW.edf', 100_000),
    ];
    expect(filterBRPFiles(files)).toHaveLength(3);
  });

  it('excludes FLW.edf files at or below 50KB', () => {
    const files = [makeFile('FLW.edf', '/a/FLW.edf', 50 * 1024)];
    expect(filterBRPFiles(files)).toHaveLength(0);
  });

  it('handles empty file list', () => {
    expect(filterBRPFiles([])).toHaveLength(0);
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
// filterPLDFiles
// ---------------------------------------------------------------------------

describe('filterPLDFiles', () => {
  it('includes PLD.edf files (case insensitive)', () => {
    const files = [
      makeFile('PLD.edf', '/a/PLD.edf', 5000),
      makeFile('pld.edf', '/a/pld.edf', 5000),
      makeFile('20260315_220000_PLD.edf', '/a/20260315_220000_PLD.edf', 5000),
    ];
    expect(filterPLDFiles(files)).toHaveLength(3);
  });

  it('includes PLD files of any size (no minimum)', () => {
    const files = [makeFile('PLD.edf', '/a/PLD.edf', 1)];
    expect(filterPLDFiles(files)).toHaveLength(1);
  });

  it('excludes non-PLD files', () => {
    const files = [
      makeFile('BRP.edf', '/a/BRP.edf', 5000),
      makeFile('STR.edf', '/a/STR.edf', 5000),
      makeFile('EVE.edf', '/a/EVE.edf', 5000),
    ];
    expect(filterPLDFiles(files)).toHaveLength(0);
  });

  it('handles empty file list', () => {
    expect(filterPLDFiles([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterCSLFiles
// ---------------------------------------------------------------------------

describe('filterCSLFiles', () => {
  it('includes standalone CSL.edf', () => {
    const files = [makeFile('CSL.edf', '/a/CSL.edf', 1000)];
    expect(filterCSLFiles(files)).toHaveLength(1);
  });

  it('includes files with underscore before CSL.edf', () => {
    const files = [makeFile('20260315_CSL.edf', '/a/20260315_CSL.edf', 1000)];
    expect(filterCSLFiles(files)).toHaveLength(1);
  });

  it('excludes files ending with CSL.edf without underscore separator', () => {
    const files = [makeFile('BOGUSCSL.edf', '/a/BOGUSCSL.edf', 1000)];
    expect(filterCSLFiles(files)).toHaveLength(0);
  });

  it('is case insensitive', () => {
    const files = [makeFile('csl.edf', '/a/csl.edf', 1000)];
    expect(filterCSLFiles(files)).toHaveLength(1);
  });

  it('handles empty file list', () => {
    expect(filterCSLFiles([])).toHaveLength(0);
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

  it('finds CurrentSettings.json in SETTINGS/ path (AirSense 11)', () => {
    const files = [
      { name: 'BRP.edf', path: 'DATALOG/20260315/BRP.edf' },
      { name: 'CurrentSettings.json', path: 'SETTINGS/CurrentSettings.json' },
    ];
    expect(findIdentificationFile(files)).toEqual({
      name: 'CurrentSettings.json',
      path: 'SETTINGS/CurrentSettings.json',
    });
  });

  it('does not match CurrentSettings.json outside a settings/ path', () => {
    const files = [
      { name: 'CurrentSettings.json', path: 'DATALOG/CurrentSettings.json' },
    ];
    expect(findIdentificationFile(files)).toBeNull();
  });

  it('is case-insensitive for currentsettings.json filename and settings/ path', () => {
    const files = [
      { name: 'currentsettings.json', path: 'Settings/currentsettings.json' },
    ];
    expect(findIdentificationFile(files)).toEqual({
      name: 'currentsettings.json',
      path: 'Settings/currentsettings.json',
    });
  });

  it('prefers identification.tgt over currentsettings.json when both present', () => {
    const files = [
      { name: 'Identification.tgt', path: '/a/Identification.tgt' },
      { name: 'CurrentSettings.json', path: 'SETTINGS/CurrentSettings.json' },
    ];
    expect(findIdentificationFile(files)).toEqual({
      name: 'Identification.tgt',
      path: '/a/Identification.tgt',
    });
  });
});
