import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  traverseDataTransferItems,
  toFilesWithPaths,
  isIOSDevice,
  supportsWebkitGetAsEntry,
} from '@/lib/directory-traversal';

// --- Mock helpers for FileSystem API ---

function mockFileEntry(name: string, path: string, content = 'x'): FileSystemFileEntry {
  const file = new File([content], name, { type: 'application/octet-stream' });
  return {
    isFile: true,
    isDirectory: false,
    name,
    fullPath: path,
    filesystem: {} as FileSystem,
    getParent: vi.fn(),
    file: (cb: (f: File) => void) => cb(file),
  } as unknown as FileSystemFileEntry;
}

function mockDirectoryEntry(
  name: string,
  path: string,
  children: FileSystemEntry[]
): FileSystemDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    fullPath: path,
    filesystem: {} as FileSystem,
    getParent: vi.fn(),
    createReader: () => {
      let called = false;
      return {
        readEntries: (cb: (entries: FileSystemEntry[]) => void) => {
          if (!called) {
            called = true;
            cb(children);
          } else {
            cb([]);
          }
        },
      } as unknown as FileSystemDirectoryReader;
    },
  } as unknown as FileSystemDirectoryEntry;
}

function mockDataTransferItems(
  entries: (FileSystemEntry | null)[]
): DataTransferItemList {
  const items = entries.map((entry) => ({
    kind: 'file' as const,
    type: '',
    webkitGetAsEntry: () => entry,
    getAsFile: () => null,
    getAsString: vi.fn(),
  }));

  return {
    length: items.length,
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    [Symbol.iterator]: function* () {
      for (const item of items) yield item;
    },
    ...Object.fromEntries(items.map((item, i) => [i, item])),
  } as unknown as DataTransferItemList;
}

// --- Tests ---

describe('supportsWebkitGetAsEntry', () => {
  it('returns true when webkitGetAsEntry is available', () => {
    const items = mockDataTransferItems([mockFileEntry('test.edf', '/test.edf')]);
    expect(supportsWebkitGetAsEntry(items)).toBe(true);
  });

  it('returns false for empty item list', () => {
    const items = mockDataTransferItems([]);
    expect(supportsWebkitGetAsEntry(items)).toBe(false);
  });

  it('returns false when webkitGetAsEntry is missing', () => {
    const items = {
      length: 1,
      0: { kind: 'file', type: '' },
    } as unknown as DataTransferItemList;
    expect(supportsWebkitGetAsEntry(items)).toBe(false);
  });
});

describe('traverseDataTransferItems', () => {
  it('collects files from a flat directory', async () => {
    const files = [
      mockFileEntry('BRP.edf', '/SD/BRP.edf'),
      mockFileEntry('STR.edf', '/SD/STR.edf'),
    ];
    const dir = mockDirectoryEntry('SD', '/SD', files);
    const items = mockDataTransferItems([dir]);

    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(2);
    expect(result[0]!.relativePath).toBe('SD/BRP.edf');
    expect(result[1]!.relativePath).toBe('SD/STR.edf');
  });

  it('recursively collects files from nested directories', async () => {
    const deepFile = mockFileEntry('20250110_BRP.edf', '/SD/DATALOG/20250110/20250110_BRP.edf');
    const innerDir = mockDirectoryEntry('20250110', '/SD/DATALOG/20250110', [deepFile]);
    const middleDir = mockDirectoryEntry('DATALOG', '/SD/DATALOG', [innerDir]);
    const rootFile = mockFileEntry('STR.edf', '/SD/STR.edf');
    const rootDir = mockDirectoryEntry('SD', '/SD', [rootFile, middleDir]);
    const items = mockDataTransferItems([rootDir]);

    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(2);

    const paths = result.map((r) => r.relativePath);
    expect(paths).toContain('SD/STR.edf');
    expect(paths).toContain('SD/DATALOG/20250110/20250110_BRP.edf');
  });

  it('handles plain files (not directories) in the drop', async () => {
    const file = mockFileEntry('report.csv', '/report.csv');
    const items = mockDataTransferItems([file]);

    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]!.relativePath).toBe('report.csv');
    expect(result[0]!.file.name).toBe('report.csv');
  });

  it('returns empty array when webkitGetAsEntry is not supported', async () => {
    const items = {
      length: 1,
      0: { kind: 'file', type: '' },
    } as unknown as DataTransferItemList;

    const result = await traverseDataTransferItems(items);
    expect(result).toEqual([]);
  });

  it('handles mixed files and directories', async () => {
    const looseFile = mockFileEntry('readme.txt', '/readme.txt');
    const dirFile = mockFileEntry('data.edf', '/folder/data.edf');
    const dir = mockDirectoryEntry('folder', '/folder', [dirFile]);
    const items = mockDataTransferItems([looseFile, dir]);

    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(2);
    const paths = result.map((r) => r.relativePath);
    expect(paths).toContain('readme.txt');
    expect(paths).toContain('folder/data.edf');
  });

  it('handles entries that are null (e.g. non-file items)', async () => {
    const file = mockFileEntry('test.edf', '/test.edf');
    const items = mockDataTransferItems([null, file]);

    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]!.file.name).toBe('test.edf');
  });

  it('handles readEntries returning results in multiple batches', async () => {
    const file1 = mockFileEntry('a.edf', '/dir/a.edf');
    const file2 = mockFileEntry('b.edf', '/dir/b.edf');

    // Override createReader to return files in two batches
    const dir: FileSystemDirectoryEntry = {
      isFile: false,
      isDirectory: true,
      name: 'dir',
      fullPath: '/dir',
      filesystem: {} as FileSystem,
      getParent: vi.fn(),
      createReader: () => {
        let callCount = 0;
        return {
          readEntries: (cb: (entries: FileSystemEntry[]) => void) => {
            callCount++;
            if (callCount === 1) cb([file1]);
            else if (callCount === 2) cb([file2]);
            else cb([]);
          },
        } as unknown as FileSystemDirectoryReader;
      },
    } as unknown as FileSystemDirectoryEntry;

    const items = mockDataTransferItems([dir]);
    const result = await traverseDataTransferItems(items);

    expect(result).toHaveLength(2);
    expect(result[0]!.relativePath).toBe('dir/a.edf');
    expect(result[1]!.relativePath).toBe('dir/b.edf');
  });
});

describe('toFilesWithPaths', () => {
  it('creates File objects with webkitRelativePath set', () => {
    const original = new File(['content'], 'test.edf', { type: 'application/octet-stream' });
    const traversed = [
      { file: original, relativePath: 'SD/DATALOG/test.edf' },
    ];

    const files = toFilesWithPaths(traversed);

    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe('test.edf');
    expect((files[0] as unknown as { webkitRelativePath: string }).webkitRelativePath).toBe(
      'SD/DATALOG/test.edf'
    );
  });

  it('preserves lastModified and type from original file', () => {
    const original = new File(['data'], 'brp.edf', {
      type: 'application/x-edf',
      lastModified: 1700000000000,
    });
    const files = toFilesWithPaths([{ file: original, relativePath: 'SD/brp.edf' }]);

    expect(files[0]!.type).toBe('application/x-edf');
    expect(files[0]!.lastModified).toBe(1700000000000);
  });
});

describe('isIOSDevice', () => {
  const originalNavigator = globalThis.navigator;

  function mockNavigator(ua: string, maxTouchPoints = 0) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: ua, maxTouchPoints },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('detects iPhone', () => {
    mockNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(isIOSDevice()).toBe(true);
  });

  it('detects iPad (classic UA)', () => {
    mockNavigator('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)');
    expect(isIOSDevice()).toBe(true);
  });

  it('detects iPadOS 13+ (Macintosh UA with touch)', () => {
    mockNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      5
    );
    expect(isIOSDevice()).toBe(true);
  });

  it('returns false for desktop Mac', () => {
    mockNavigator(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      0
    );
    expect(isIOSDevice()).toBe(false);
  });

  it('returns false for desktop Windows', () => {
    mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(isIOSDevice()).toBe(false);
  });

  it('returns false for Android', () => {
    mockNavigator('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36');
    expect(isIOSDevice()).toBe(false);
  });
});
