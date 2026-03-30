import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractNightDate,
  diffAgainstManifest,
  buildManifest,
  saveManifest,
  loadManifest,
} from '@/lib/file-manifest';

// Mock localStorage with a Map-backed implementation
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

// ── Helpers ─────────────────────────────────────────────────

/** Create a mock File with webkitRelativePath */
function makeFile(
  path: string,
  size: number,
  lastModified: number
): File {
  const file = new File([''], path.split('/').pop() || 'file', {
    lastModified,
  });
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/** Create a set of files for a given night date */
function makeNightFiles(
  dateStr: string,
  fileSpecs: Array<{ name: string; size: number; lastModified: number }>
): File[] {
  const yyyymmdd = dateStr.replace(/-/g, '');
  return fileSpecs.map(({ name, size, lastModified }) =>
    makeFile(`DATALOG/${yyyymmdd}/${name}`, size, lastModified)
  );
}

// ── extractNightDate ────────────────────────────────────────

describe('extractNightDate', () => {
  it('extracts YYYY-MM-DD from DATALOG/YYYYMMDD/ path', () => {
    expect(extractNightDate('DATALOG/20260315/BRP.edf')).toBe('2026-03-15');
  });

  it('extracts date from nested paths', () => {
    expect(extractNightDate('SD_CARD/DATALOG/20260101/flow.edf')).toBe('2026-01-01');
  });

  it('returns null for paths without date folders', () => {
    expect(extractNightDate('STR.edf')).toBeNull();
    expect(extractNightDate('Identification.tgt')).toBeNull();
    expect(extractNightDate('DATALOG/settings.json')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractNightDate('')).toBeNull();
  });

  it('extracts the first 8-digit folder match', () => {
    // If multiple 8-digit sequences exist, regex finds the first
    expect(extractNightDate('12345678/20260315/BRP.edf')).toBe('1234-56-78');
  });

  it('handles paths with only the date folder', () => {
    expect(extractNightDate('20260315/file.edf')).toBe('2026-03-15');
  });
});

// ── buildManifest ───────────────────────────────────────────

describe('buildManifest', () => {
  it('groups files by night date', () => {
    const files = [
      ...makeNightFiles('2026-03-15', [
        { name: 'BRP.edf', size: 1000, lastModified: 100 },
        { name: 'EVE.edf', size: 500, lastModified: 100 },
      ]),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];

    const manifest = buildManifest(files);
    expect(manifest).toHaveLength(2);

    const night15 = manifest.find((m) => m.nightDate === '2026-03-15');
    const night16 = manifest.find((m) => m.nightDate === '2026-03-16');
    expect(night15).toBeDefined();
    expect(night15!.files).toHaveLength(2);
    expect(night16).toBeDefined();
    expect(night16!.files).toHaveLength(1);
  });

  it('excludes files without a date folder (__unknown__)', () => {
    const files = [
      makeFile('STR.edf', 800, 100),
      makeFile('Identification.tgt', 200, 100),
      ...makeNightFiles('2026-03-15', [
        { name: 'BRP.edf', size: 1000, lastModified: 100 },
      ]),
    ];

    const manifest = buildManifest(files);
    expect(manifest).toHaveLength(1);
    expect(manifest[0]!.nightDate).toBe('2026-03-15');
  });

  it('returns empty manifest for no files', () => {
    expect(buildManifest([])).toEqual([]);
  });

  it('returns empty manifest when all files are __unknown__', () => {
    const files = [
      makeFile('STR.edf', 800, 100),
      makeFile('settings.json', 400, 100),
    ];
    expect(buildManifest(files)).toEqual([]);
  });

  it('stores correct fingerprint data (path, size, lastModified)', () => {
    const files = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 12345, lastModified: 1711111111 },
    ]);

    const manifest = buildManifest(files);
    expect(manifest[0]!.files[0]).toEqual({
      path: 'DATALOG/20260315/BRP.edf',
      size: 12345,
      lastModified: 1711111111,
    });
  });
});

// ── diffAgainstManifest ─────────────────────────────────────

describe('diffAgainstManifest', () => {
  const baseFiles = [
    { name: 'BRP.edf', size: 1000, lastModified: 100 },
    { name: 'EVE.edf', size: 500, lastModified: 100 },
  ];

  it('detects unchanged nights', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    // Same files again
    const result = diffAgainstManifest(files, manifest);
    expect(result.unchanged).toContain('2026-03-15');
    expect(result.changedNights.size).toBe(0);
    expect(result.changedFiles).toHaveLength(0);
  });

  it('detects new nights (not in manifest)', () => {
    const oldFiles = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(oldFiles);

    // Upload includes a new night
    const newFiles = [
      ...makeNightFiles('2026-03-15', baseFiles),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];

    const result = diffAgainstManifest(newFiles, manifest);
    expect(result.unchanged).toContain('2026-03-15');
    expect(result.changedNights.has('2026-03-16')).toBe(true);
    expect(result.changedFiles.length).toBeGreaterThan(0);
  });

  it('detects changed nights when file size differs', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    // Same night, different file size
    const modifiedFiles = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 9999, lastModified: 100 }, // different size
      { name: 'EVE.edf', size: 500, lastModified: 100 },
    ]);

    const result = diffAgainstManifest(modifiedFiles, manifest);
    expect(result.unchanged).not.toContain('2026-03-15');
    expect(result.changedNights.has('2026-03-15')).toBe(true);
  });

  it('detects changed nights when lastModified differs', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    const modifiedFiles = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 999 }, // different timestamp
      { name: 'EVE.edf', size: 500, lastModified: 100 },
    ]);

    const result = diffAgainstManifest(modifiedFiles, manifest);
    expect(result.changedNights.has('2026-03-15')).toBe(true);
  });

  it('detects changed nights when file count differs', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    // Extra file added to the night
    const modifiedFiles = makeNightFiles('2026-03-15', [
      ...baseFiles,
      { name: 'CSL.edf', size: 300, lastModified: 100 },
    ]);

    const result = diffAgainstManifest(modifiedFiles, manifest);
    expect(result.changedNights.has('2026-03-15')).toBe(true);
  });

  it('includes __unknown__ files when any night has changed', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    // New upload: new night + STR.edf (no date)
    const newFiles = [
      makeFile('STR.edf', 800, 100),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];

    const result = diffAgainstManifest(newFiles, manifest);
    expect(result.changedNights.has('2026-03-16')).toBe(true);
    // STR.edf should be included in changedFiles since a night changed
    const strFile = result.changedFiles.find(
      (f) =>
        ((f as unknown as { webkitRelativePath?: string }).webkitRelativePath ||
          f.name) === 'STR.edf'
    );
    expect(strFile).toBeDefined();
  });

  it('does not include __unknown__ files when all nights are unchanged', () => {
    const files = makeNightFiles('2026-03-15', baseFiles);
    const manifest = buildManifest(files);

    // Upload same night + STR.edf
    const uploadFiles = [
      makeFile('STR.edf', 800, 100),
      ...makeNightFiles('2026-03-15', baseFiles),
    ];

    const result = diffAgainstManifest(uploadFiles, manifest);
    expect(result.changedNights.size).toBe(0);
    expect(result.changedFiles).toHaveLength(0);
  });

  it('handles empty manifest (all nights are new)', () => {
    const files = [
      ...makeNightFiles('2026-03-15', baseFiles),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];

    const result = diffAgainstManifest(files, []);
    expect(result.unchanged).toHaveLength(0);
    expect(result.changedNights.size).toBe(2);
  });

  it('handles empty file list', () => {
    const manifest = buildManifest(
      makeNightFiles('2026-03-15', baseFiles)
    );

    const result = diffAgainstManifest([], manifest);
    expect(result.unchanged).toHaveLength(0);
    expect(result.changedNights.size).toBe(0);
    expect(result.changedFiles).toHaveLength(0);
  });

  it('handles identical manifests (nothing changed)', () => {
    const files = [
      ...makeNightFiles('2026-03-15', baseFiles),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];
    const manifest = buildManifest(files);

    const result = diffAgainstManifest(files, manifest);
    expect(result.unchanged).toHaveLength(2);
    expect(result.changedNights.size).toBe(0);
    expect(result.changedFiles).toHaveLength(0);
  });
});

// ── saveManifest / loadManifest (localStorage) ──────────────

describe('saveManifest and loadManifest', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('round-trips manifest through localStorage', () => {
    const files = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
    ]);
    const manifest = buildManifest(files);

    saveManifest(manifest);
    const loaded = loadManifest();

    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
    expect(loaded![0]!.nightDate).toBe('2026-03-15');
    expect(loaded![0]!.files[0]).toEqual({
      path: 'DATALOG/20260315/BRP.edf',
      size: 1000,
      lastModified: 100,
    });
  });

  it('returns null when no manifest is saved', () => {
    expect(loadManifest()).toBeNull();
  });

  it('returns null for expired manifest (>30 days old)', () => {
    const files = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
    ]);
    const manifest = buildManifest(files);

    // Save with a timestamp 31 days in the past
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    storage.set(
      'airwaylab_file_manifest',
      JSON.stringify({ manifests: manifest, savedAt: thirtyOneDaysAgo })
    );

    expect(loadManifest()).toBeNull();
    // Should also clean up the expired entry
    expect(storage.has('airwaylab_file_manifest')).toBe(false);
  });

  it('returns manifest that is not yet expired (<30 days)', () => {
    const files = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
    ]);
    const manifest = buildManifest(files);

    // Save with a timestamp 29 days in the past
    const twentyNineDaysAgo = Date.now() - 29 * 24 * 60 * 60 * 1000;
    storage.set(
      'airwaylab_file_manifest',
      JSON.stringify({ manifests: manifest, savedAt: twentyNineDaysAgo })
    );

    const loaded = loadManifest();
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(1);
  });

  it('returns null and cleans up for malformed JSON', () => {
    storage.set('airwaylab_file_manifest', 'not valid json!!!');
    expect(loadManifest()).toBeNull();
  });

  it('returns null for missing savedAt field', () => {
    storage.set(
      'airwaylab_file_manifest',
      JSON.stringify({ manifests: [] })
    );
    expect(loadManifest()).toBeNull();
  });

  it('returns null for missing manifests array', () => {
    storage.set(
      'airwaylab_file_manifest',
      JSON.stringify({ savedAt: Date.now() })
    );
    expect(loadManifest()).toBeNull();
  });

  it('saveManifest does not throw on quota errors', () => {
    // Mock setItem to throw
    localStorageMock.setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError');
    });

    const files = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
    ]);
    const manifest = buildManifest(files);

    // Should not throw
    expect(() => saveManifest(manifest)).not.toThrow();

    // Restore
    localStorageMock.setItem = vi.fn((key: string, value: string) => { storage.set(key, value); });
  });
});

// ── Multiple nights diffing ─────────────────────────────────

describe('multi-night diffing scenarios', () => {
  it('correctly identifies mix of unchanged, changed, and new nights', () => {
    const night15Files = [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
      { name: 'EVE.edf', size: 500, lastModified: 100 },
    ];
    const night16Files = [
      { name: 'BRP.edf', size: 1200, lastModified: 200 },
    ];

    const oldFiles = [
      ...makeNightFiles('2026-03-15', night15Files),
      ...makeNightFiles('2026-03-16', night16Files),
    ];
    const manifest = buildManifest(oldFiles);

    const newFiles = [
      // 2026-03-15: unchanged
      ...makeNightFiles('2026-03-15', night15Files),
      // 2026-03-16: changed (different size)
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 9999, lastModified: 200 },
      ]),
      // 2026-03-17: brand new
      ...makeNightFiles('2026-03-17', [
        { name: 'BRP.edf', size: 1500, lastModified: 300 },
      ]),
    ];

    const result = diffAgainstManifest(newFiles, manifest);

    expect(result.unchanged).toContain('2026-03-15');
    expect(result.unchanged).not.toContain('2026-03-16');
    expect(result.unchanged).not.toContain('2026-03-17');

    expect(result.changedNights.has('2026-03-16')).toBe(true);
    expect(result.changedNights.has('2026-03-17')).toBe(true);
    expect(result.changedNights.size).toBe(2);
  });

  it('deleted nights are not reported (they simply are not in the upload)', () => {
    const oldFiles = [
      ...makeNightFiles('2026-03-15', [
        { name: 'BRP.edf', size: 1000, lastModified: 100 },
      ]),
      ...makeNightFiles('2026-03-16', [
        { name: 'BRP.edf', size: 1200, lastModified: 200 },
      ]),
    ];
    const manifest = buildManifest(oldFiles);

    // Only upload one night (the other is "deleted")
    const newFiles = makeNightFiles('2026-03-15', [
      { name: 'BRP.edf', size: 1000, lastModified: 100 },
    ]);

    const result = diffAgainstManifest(newFiles, manifest);
    expect(result.unchanged).toContain('2026-03-15');
    // 2026-03-16 is not mentioned at all -- not unchanged, not changed
    expect(result.changedNights.has('2026-03-16')).toBe(false);
  });
});
