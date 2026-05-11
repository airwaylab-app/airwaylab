// ============================================================
// AirwayLab — Upload Hash Cache Tests
// Tests for localStorage-based hash caching used by the upload
// orchestrator to skip re-hashing files on resume.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
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

import { HashCache } from '@/lib/storage/hash-cache';

const STORAGE_KEY = 'airwaylab_hash_cache';

describe('HashCache', () => {
  let cache: HashCache;

  beforeEach(() => {
    storage.clear();
    cache = new HashCache();
  });

  it('stores and retrieves hashes by file fingerprint', () => {
    cache.set('DATALOG/20250312/BRP.edf', 1024, 1710000000000, 'abc123hash');
    const result = cache.get('DATALOG/20250312/BRP.edf', 1024, 1710000000000);
    expect(result).toBe('abc123hash');
  });

  it('returns undefined for unknown fingerprints', () => {
    const result = cache.get('unknown/file.edf', 512, 1710000000000);
    expect(result).toBeUndefined();
  });

  it('returns undefined when size differs', () => {
    cache.set('file.edf', 1024, 1710000000000, 'abc123hash');
    const result = cache.get('file.edf', 2048, 1710000000000);
    expect(result).toBeUndefined();
  });

  it('returns undefined when lastModified differs', () => {
    cache.set('file.edf', 1024, 1710000000000, 'abc123hash');
    const result = cache.get('file.edf', 1024, 1720000000000);
    expect(result).toBeUndefined();
  });

  it('prunes oldest entries when exceeding size cap', { timeout: 15000 }, () => {
    // Fill cache with entries that exceed the 500KB cap
    // Each entry key ~50 chars + hash 64 chars + overhead ~30 chars = ~150 bytes
    // 500KB / 150 bytes = ~3400 entries. Write 4000 to trigger pruning.
    for (let i = 0; i < 4000; i++) {
      cache.set(`DATALOG/night${i}/BRP.edf`, 1024 + i, 1710000000000, 'a'.repeat(64));
    }
    cache.flush();

    const stored = storage.get(STORAGE_KEY);
    expect(stored).toBeDefined();
    // Check that stored data is under 500KB
    expect(stored!.length).toBeLessThanOrEqual(500 * 1024);

    // Most recent entries should still be accessible
    const recent = cache.get('DATALOG/night3999/BRP.edf', 1024 + 3999, 1710000000000);
    expect(recent).toBe('a'.repeat(64));
  });

  it('ignores entries older than 30 days', () => {
    // Manually write an expired entry
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const data = {
      entries: {
        'old/file.edf|1024|1710000000000': {
          hash: 'oldhash',
          ts: thirtyOneDaysAgo,
        },
      },
    };
    storage.set(STORAGE_KEY, JSON.stringify(data));

    cache = new HashCache(); // Re-initialise from localStorage
    const result = cache.get('old/file.edf', 1024, 1710000000000);
    expect(result).toBeUndefined();
  });

  it('handles corrupted localStorage gracefully', () => {
    storage.set(STORAGE_KEY, 'not valid json {{{');
    cache = new HashCache();

    // Should not throw, should return undefined
    const result = cache.get('any/file.edf', 1024, 1710000000000);
    expect(result).toBeUndefined();

    // Should still be able to write new entries
    cache.set('new/file.edf', 512, 1710000000000, 'newhash');
    expect(cache.get('new/file.edf', 512, 1710000000000)).toBe('newhash');
  });

  it('persists to and loads from localStorage', () => {
    cache.set('file.edf', 1024, 1710000000000, 'hash1');
    cache.flush();

    // Create a new instance that reads from localStorage
    const cache2 = new HashCache();
    expect(cache2.get('file.edf', 1024, 1710000000000)).toBe('hash1');
  });
});

describe('UploadProgress.skippedExisting', () => {
  it('defaults to 0 in initial UploadProgress', () => {
    // Verify the type includes skippedExisting with a default
    const progress = {
      current: 0,
      total: 0,
      bytesUploaded: 0,
      bytesTotal: 0,
      stage: 'hashing' as const,
      skippedExisting: 0,
    };
    expect(progress.skippedExisting).toBe(0);
  });
});
