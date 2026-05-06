import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractNightDate,
  buildManifest,
  diffAgainstManifest,
  saveManifest,
  loadManifest,
} from '@/lib/file-manifest';

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
  get length() { return storage.size; },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

function mockFile(
  name: string,
  webkitRelativePath: string,
  size = 1024,
  lastModified = 1_700_000_000_000
): File {
  const file = new File(['x'.repeat(size)], name, { type: 'application/octet-stream', lastModified });
  Object.defineProperty(file, 'webkitRelativePath', { value: webkitRelativePath });
  return file;
}

function makeFile(relativePath: string, size = 1024, lastModified = 1710000000000): File {
  const name = relativePath.split('/').pop() ?? relativePath;
  return mockFile(name, relativePath, size, lastModified);
}

describe('extractNightDate', () => {
  it('returns YYYY-MM-DD from a standard DATALOG path', () => {
    expect(extractNightDate('SD/DATALOG/20250115/20250115_001234_BRP.edf')).toBe('2025-01-15');
  });

  it('returns null for a path with no date folder', () => {
    expect(extractNightDate('SD/STR.edf')).toBeNull();
  });

  it('returns null for a filename-only path', () => {
    expect(extractNightDate('STR.edf')).toBeNull();
  });

  it('handles 8-digit folder with non-YYYYMMDD-looking content', () => {
    expect(extractNightDate('SD/DATALOG/20260301/file.edf')).toBe('2026-03-01');
  });
});

describe('buildManifest', () => {
  it('returns empty array when no files have date paths', () => {
    const files = [mockFile('STR.edf', 'SD/STR.edf')];
    expect(buildManifest(files)).toEqual([]);
  });

  it('builds one manifest entry for one night', () => {
    const files = [
      mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf'),
      mockFile('FLW.edf', 'SD/DATALOG/20250115/FLW.edf'),
    ];
    const manifest = buildManifest(files);
    expect(manifest).toHaveLength(1);
    expect(manifest[0]!.nightDate).toBe('2025-01-15');
    expect(manifest[0]!.files).toHaveLength(2);
  });

  it('builds separate entries for multiple nights', () => {
    const files = [
      mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf'),
      mockFile('BRP.edf', 'SD/DATALOG/20250116/BRP.edf'),
    ];
    const manifest = buildManifest(files);
    expect(manifest).toHaveLength(2);
    const dates = manifest.map((m) => m.nightDate);
    expect(dates).toContain('2025-01-15');
    expect(dates).toContain('2025-01-16');
  });

  it('excludes __unknown__ files (no date folder)', () => {
    const files = [
      mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf'),
      mockFile('STR.edf', 'SD/STR.edf'),
    ];
    const manifest = buildManifest(files);
    expect(manifest).toHaveLength(1);
    expect(manifest[0]!.files.every((f) => f.path !== 'SD/STR.edf')).toBe(true);
  });

  it('fingerprints include path, size, and lastModified', () => {
    const files = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 2048, 1_700_000_000_000)];
    const manifest = buildManifest(files);
    expect(manifest[0]!.files[0]!.size).toBe(2048);
    expect(manifest[0]!.files[0]!.lastModified).toBe(1_700_000_000_000);
  });

  it('uses webkitRelativePath as the fingerprint path when present', () => {
    const files = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf')];
    const manifest = buildManifest(files);
    expect(manifest[0]!.files[0]!.path).toBe('SD/DATALOG/20250115/BRP.edf');
  });
});

describe('diffAgainstManifest', () => {
  it('unchanged detection: all files match → unchanged list filled, no changedFiles', () => {
    const files = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf')];
    const manifest = buildManifest(files);
    const result = diffAgainstManifest(files, manifest);
    expect(result.unchanged).toHaveLength(1);
    expect(result.changedFiles).toHaveLength(0);
    expect(result.changedNights.size).toBe(0);
  });

  it('new night: not in manifest → changedNights has it, changedFiles includes it', () => {
    const nightA = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf')];
    const nightB = [mockFile('BRP.edf', 'SD/DATALOG/20250116/BRP.edf')];
    const manifest = buildManifest(nightA);
    const result = diffAgainstManifest([...nightA, ...nightB], manifest);
    expect(result.unchanged).toContain('2025-01-15');
    expect(result.changedNights.has('2025-01-16')).toBe(true);
    expect(result.changedFiles).toHaveLength(1);
  });

  it('all changed: all files have different lastModified → no unchanged', () => {
    const storedManifest = [{
      nightDate: '2025-01-15',
      files: [{ path: 'SD/DATALOG/20250115/BRP.edf', size: 1024, lastModified: 100 }],
    }];
    const uploadFiles = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, 999)];
    const result = diffAgainstManifest(uploadFiles, storedManifest);
    expect(result.unchanged).toHaveLength(0);
    expect(result.changedNights.size).toBe(1);
  });

  it('partial change: one night unchanged, one night changed', () => {
    const lm = 1_700_000_000_000;
    const fileA = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, lm);
    const fileB = mockFile('BRP.edf', 'SD/DATALOG/20250116/BRP.edf', 1024, lm);
    const manifest = buildManifest([fileA, fileB]);
    const changedFileB = mockFile('BRP.edf', 'SD/DATALOG/20250116/BRP.edf', 1024, lm + 1);
    const result = diffAgainstManifest([fileA, changedFileB], manifest);
    expect(result.unchanged).toHaveLength(1);
    expect(result.unchanged).toContain('2025-01-15');
    expect(result.changedNights.size).toBe(1);
    expect(result.changedNights.has('2025-01-16')).toBe(true);
  });

  it('__unknown__ files included in changedFiles when any night changed', () => {
    const strFile = mockFile('STR.edf', 'SD/STR.edf');
    const storedManifest = [{
      nightDate: '2025-01-15',
      files: [{ path: 'SD/DATALOG/20250115/BRP.edf', size: 1024, lastModified: 100 }],
    }];
    const uploadFiles = [strFile, mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, 999)];
    const result = diffAgainstManifest(uploadFiles, storedManifest);
    expect(result.changedFiles.some((f) => f.name === 'STR.edf')).toBe(true);
  });

  it('__unknown__ files NOT included when no nights changed', () => {
    const lm = 1_700_000_000_000;
    const nightFile = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, lm);
    const manifest = buildManifest([nightFile]);
    const strFile = mockFile('STR.edf', 'SD/STR.edf');
    const result = diffAgainstManifest([nightFile, strFile], manifest);
    expect(result.changedFiles).toHaveLength(0);
  });

  it('empty manifest → all nights treated as changed', () => {
    const files = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf')];
    const result = diffAgainstManifest(files, []);
    expect(result.unchanged).toHaveLength(0);
    expect(result.changedNights.size).toBeGreaterThan(0);
  });

  it('file count mismatch in a night → triggers change', () => {
    const lm = 1_700_000_000_000;
    const fileA = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, lm);
    const fileB = mockFile('FLW.edf', 'SD/DATALOG/20250115/FLW.edf', 1024, lm);
    const manifest = buildManifest([fileA, fileB]);
    const extra = mockFile('EVE.edf', 'SD/DATALOG/20250115/EVE.edf', 1024, lm);
    const result = diffAgainstManifest([fileA, fileB, extra], manifest);
    expect(result.changedNights.has('2025-01-15')).toBe(true);
  });

  it('size change triggers change', () => {
    const lm = 1_700_000_000_000;
    const original = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, lm);
    const manifest = buildManifest([original]);
    const resized = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 2048, lm);
    const result = diffAgainstManifest([resized], manifest);
    expect(result.changedNights.has('2025-01-15')).toBe(true);
  });

  it('lastModified change triggers change (AIR-963 regression guard)', () => {
    // This is the exact failure mode AIR-963 fixed
    const original = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, 1_700_000_000_000);
    const manifest = buildManifest([original]);
    const reuploaded = mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, 1_700_000_999_999);
    const result = diffAgainstManifest([reuploaded], manifest);
    expect(result.changedNights.has('2025-01-15')).toBe(true);
  });
});

describe('saveManifest / loadManifest', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('saves and loads manifest round-trip', () => {
    const files = [mockFile('BRP.edf', 'SD/DATALOG/20250115/BRP.edf', 1024, 1_700_000_000_000)];
    const manifests = buildManifest(files);
    saveManifest(manifests);
    const loaded = loadManifest();
    expect(loaded).not.toBeNull();
    expect(loaded![0]!.nightDate).toBe('2025-01-15');
    expect(loaded![0]!.files[0]!.path).toBe('SD/DATALOG/20250115/BRP.edf');
  });

  it('loadManifest returns null when nothing saved', () => {
    expect(loadManifest()).toBeNull();
  });

  it('loadManifest returns null for expired manifest (> 30 days)', () => {
    const expired = Date.now() - (31 * 24 * 60 * 60 * 1000);
    storage.set('airwaylab_file_manifest', JSON.stringify({ manifests: [], savedAt: expired }));
    expect(loadManifest()).toBeNull();
  });

  it('loadManifest returns manifest within TTL', () => {
    const recent = Date.now() - (29 * 24 * 60 * 60 * 1000);
    storage.set('airwaylab_file_manifest', JSON.stringify({ manifests: [], savedAt: recent }));
    expect(loadManifest()).not.toBeNull();
  });

  it('loadManifest returns null for malformed JSON', () => {
    storage.set('airwaylab_file_manifest', 'not-json');
    expect(loadManifest()).toBeNull();
  });

  it('loadManifest clears malformed entry from localStorage', () => {
    storage.set('airwaylab_file_manifest', JSON.stringify({ savedAt: Date.now() }));
    expect(loadManifest()).toBeNull();
    expect(storage.has('airwaylab_file_manifest')).toBe(false);
  });
});

describe('nightMatchesManifest (via diffAgainstManifest)', () => {
  it('treats a night as unchanged only when all fingerprints match exactly', () => {
    const files = [
      makeFile('DATALOG/20250312/BRP.edf', 1024, 1710000000000),
      makeFile('DATALOG/20250312/PLD.edf', 512, 1710000001000),
    ];
    const manifest = buildManifest(files);
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
