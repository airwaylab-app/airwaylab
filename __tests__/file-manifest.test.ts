import { describe, it, expect } from 'vitest';
import { buildManifest, diffAgainstManifest, extractNightDate } from '@/lib/file-manifest';

function makeFile(relativePath: string, size = 1024, lastModified = 1710000000000): File {
  return {
    name: relativePath.split('/').pop() ?? relativePath,
    size,
    lastModified,
    webkitRelativePath: relativePath,
  } as unknown as File;
}

describe('extractNightDate', () => {
  it('extracts YYYY-MM-DD from a DATALOG/YYYYMMDD/ path', () => {
    expect(extractNightDate('DATALOG/20250312/BRP.edf')).toBe('2025-03-12');
  });

  it('handles paths with no date folder', () => {
    expect(extractNightDate('STR.edf')).toBeNull();
    expect(extractNightDate('Identification.tgt')).toBeNull();
  });

  it('handles year boundaries correctly', () => {
    expect(extractNightDate('DATALOG/20241231/BRP.edf')).toBe('2024-12-31');
    expect(extractNightDate('DATALOG/20250101/BRP.edf')).toBe('2025-01-01');
  });

  it('handles nested paths', () => {
    expect(extractNightDate('SD_CARD/DATALOG/20250315/BRP.edf')).toBe('2025-03-15');
  });
});

describe('buildManifest', () => {
  it('returns empty array for empty file list', () => {
    expect(buildManifest([])).toEqual([]);
  });

  it('builds one entry per distinct night date', () => {
    const files = [
      makeFile('DATALOG/20250312/BRP.edf'),
      makeFile('DATALOG/20250312/PLD.edf'),
      makeFile('DATALOG/20250313/BRP.edf'),
    ];
    const result = buildManifest(files);
    expect(result).toHaveLength(2);
    const dates = result.map((m) => m.nightDate).sort();
    expect(dates).toEqual(['2025-03-12', '2025-03-13']);
  });

  it('excludes files with no recognisable date folder', () => {
    const files = [
      makeFile('STR.edf', 512),
      makeFile('Identification.tgt', 64),
      makeFile('DATALOG/20250312/BRP.edf', 1024),
    ];
    const result = buildManifest(files);
    expect(result).toHaveLength(1);
    expect(result[0]!.nightDate).toBe('2025-03-12');
  });

  it('stores correct fingerprints (path, size, lastModified)', () => {
    const files = [makeFile('DATALOG/20250312/BRP.edf', 2048, 1710500000000)];
    const result = buildManifest(files);
    expect(result).toHaveLength(1);
    expect(result[0]!.files).toHaveLength(1);
    expect(result[0]!.files[0]).toEqual({
      path: 'DATALOG/20250312/BRP.edf',
      size: 2048,
      lastModified: 1710500000000,
    });
  });

  it('groups multiple files under the same night', () => {
    const files = [
      makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000),
      makeFile('DATALOG/20250312/PLD.edf', 512, 1710000001000),
      makeFile('DATALOG/20250312/EVE.edf', 256, 1710000002000),
    ];
    const result = buildManifest(files);
    expect(result).toHaveLength(1);
    expect(result[0]!.files).toHaveLength(3);
  });
});

describe('diffAgainstManifest', () => {
  it('marks all nights unchanged when files exactly match manifest', () => {
    const files = [
      makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000),
      makeFile('DATALOG/20250312/PLD.edf', 512, 1710000001000),
    ];
    const manifest = buildManifest(files);
    const { unchanged, changedFiles, changedNights } = diffAgainstManifest(files, manifest);
    expect(unchanged).toEqual(['2025-03-12']);
    expect(changedFiles).toHaveLength(0);
    expect(changedNights.size).toBe(0);
  });

  it('marks a night changed when file size differs', () => {
    const original = [makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000)];
    const manifest = buildManifest(original);
    const modified = [makeFile('DATALOG/20250312/BRP.edf', 2048, 1710000000000)];
    const { unchanged, changedFiles, changedNights } = diffAgainstManifest(modified, manifest);
    expect(unchanged).toHaveLength(0);
    expect(changedNights.has('2025-03-12')).toBe(true);
    expect(changedFiles).toHaveLength(1);
  });

  it('marks a night changed when lastModified differs', () => {
    const original = [makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000)];
    const manifest = buildManifest(original);
    const modified = [makeFile('DATALOG/20250312/BRP.edf', 1024, 9999999999999)];
    const { unchanged, changedNights } = diffAgainstManifest(modified, manifest);
    expect(changedNights.has('2025-03-12')).toBe(true);
    expect(unchanged).toHaveLength(0);
  });

  it('marks a night changed when file count differs', () => {
    const original = [makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000)];
    const manifest = buildManifest(original);
    const withExtra = [
      makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000),
      makeFile('DATALOG/20250312/PLD.edf', 512, 1710000001000),
    ];
    const { changedNights, unchanged } = diffAgainstManifest(withExtra, manifest);
    expect(changedNights.has('2025-03-12')).toBe(true);
    expect(unchanged).toHaveLength(0);
  });

  it('marks a new night (not in manifest) as changed', () => {
    const files = [makeFile('DATALOG/20250313/BRP.edf', 1024, 1710000000000)];
    const { unchanged, changedNights } = diffAgainstManifest(files, []);
    expect(changedNights.has('2025-03-13')).toBe(true);
    expect(unchanged).toHaveLength(0);
  });

  it('handles mix of changed and unchanged nights', () => {
    const unchangedFiles = [makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000)];
    const changedFiles = [makeFile('DATALOG/20250313/BRP.edf', 1024, 1710000000000)];
    const manifest = buildManifest([...unchangedFiles, ...changedFiles]);

    // Simulate night 20250313 changing
    const modifiedNight = [makeFile('DATALOG/20250313/BRP.edf', 9999, 1710000000000)];
    const allFiles = [...unchangedFiles, ...modifiedNight];

    const result = diffAgainstManifest(allFiles, manifest);
    expect(result.unchanged).toEqual(['2025-03-12']);
    expect(result.changedNights.has('2025-03-13')).toBe(true);
    expect(result.changedFiles).toHaveLength(1);
  });

  it('includes non-date files in changedFiles when at least one night changed', () => {
    const strFile = makeFile('STR.edf', 256, 1710000000000);
    const nightFile = makeFile('DATALOG/20250312/BRP.edf', 9999, 1710000000000);
    const result = diffAgainstManifest([strFile, nightFile], []);
    expect(result.changedNights.size).toBe(1);
    // changedFiles should include both the night file and STR.edf
    const paths = result.changedFiles.map(
      (f) => (f as unknown as { webkitRelativePath: string }).webkitRelativePath
    );
    expect(paths).toContain('DATALOG/20250312/BRP.edf');
    expect(paths).toContain('STR.edf');
  });

  it('excludes non-date files from changedFiles when all nights are unchanged', () => {
    const nightFile = makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000);
    const strFile = makeFile('STR.edf', 256, 1710000000000);
    const manifest = buildManifest([nightFile]);
    const result = diffAgainstManifest([nightFile, strFile], manifest);
    expect(result.unchanged).toEqual(['2025-03-12']);
    expect(result.changedFiles).toHaveLength(0);
  });

  it('returns empty results for empty file list against empty manifest', () => {
    const { unchanged, changedFiles, changedNights } = diffAgainstManifest([], []);
    expect(unchanged).toHaveLength(0);
    expect(changedFiles).toHaveLength(0);
    expect(changedNights.size).toBe(0);
  });

  it('handles file without webkitRelativePath (falls back to name)', () => {
    const file = { name: 'BRP.edf', size: 1024, lastModified: 1710000000000 } as unknown as File;
    // No date in name → treated as __unknown__
    const { changedFiles, changedNights, unchanged } = diffAgainstManifest([file], []);
    expect(changedNights.size).toBe(0);
    expect(unchanged).toHaveLength(0);
    expect(changedFiles).toHaveLength(0);
  });
});

describe('nightMatchesManifest (via diffAgainstManifest)', () => {
  it('treats a night as unchanged only when all fingerprints match exactly', () => {
    const files = [
      makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000),
      makeFile('DATALOG/20250312/PLD.edf', 512, 1710000001000),
    ];
    const manifest = buildManifest(files);
    // Identical files → unchanged
    const { unchanged } = diffAgainstManifest(files, manifest);
    expect(unchanged).toContain('2025-03-12');
  });

  it('detects mismatch when path changes even if size and lastModified stay the same', () => {
    const original = [makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000)];
    const manifest = buildManifest(original);
    const renamed = [makeFile('DATALOG/20250312/BRP_COPY.edf', 1024, 1710000000000)];
    const { changedNights, unchanged } = diffAgainstManifest(renamed, manifest);
    expect(changedNights.has('2025-03-12')).toBe(true);
    expect(unchanged).toHaveLength(0);
  });
});
