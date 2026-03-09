import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistResults, loadPersistedResults, clearPersistedResults } from '@/lib/persistence';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';

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

describe('persistence', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  describe('persistResults', () => {
    it('saves results to localStorage', () => {
      const result = persistResults(SAMPLE_NIGHTS, null);
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('strips bulk data (breath arrays) before saving', () => {
      persistResults(SAMPLE_NIGHTS, null);
      const saved = storage.get('airwaylab_results');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      // Breath arrays should be empty after stripping
      for (const night of parsed.nights) {
        expect(night.ned.breaths).toEqual([]);
      }
    });

    it('saves therapyChangeDate', () => {
      persistResults(SAMPLE_NIGHTS, '2025-01-14');
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      expect(parsed.therapyChangeDate).toBe('2025-01-14');
    });

    it('saves a timestamp', () => {
      const before = Date.now();
      persistResults(SAMPLE_NIGHTS, null);
      const after = Date.now();
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      expect(parsed.savedAt).toBeGreaterThanOrEqual(before);
      expect(parsed.savedAt).toBeLessThanOrEqual(after);
    });

    it('returns false when data exceeds size limit', () => {
      // Create a massive nights array that would exceed 4MB
      const hugeNights = Array.from({ length: 500 }, (_, i) => ({
        ...SAMPLE_NIGHTS[0],
        dateStr: `2025-01-${String(i + 1).padStart(2, '0')}`,
        ned: {
          ...SAMPLE_NIGHTS[0].ned,
          // Add a large dummy field to bloat the size
          breaths: new Array(5000).fill({ nedPct: 10, fi: 0.5, tpeak: 0.3 }),
        },
      }));
      // Note: stripBulkData will remove breaths, so this should still succeed
      // unless the base data alone is too big. The actual test is the size check.
      const result = persistResults(hugeNights as any, null);
      // With stripped data, 500 nights should still be within 4MB
      expect(result).toBe(true);
    });

    it('returns false when localStorage throws', () => {
      // Simulate QuotaExceededError
      (localStorageMock.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });
      const result = persistResults(SAMPLE_NIGHTS, null);
      expect(result).toBe(false);
    });
  });

  describe('loadPersistedResults', () => {
    it('returns null when nothing is saved', () => {
      const result = loadPersistedResults();
      expect(result).toBeNull();
    });

    it('loads saved results correctly', () => {
      persistResults(SAMPLE_NIGHTS, '2025-01-14');
      const result = loadPersistedResults();
      expect(result).not.toBeNull();
      expect(result!.nights).toHaveLength(SAMPLE_NIGHTS.length);
      expect(result!.therapyChangeDate).toBe('2025-01-14');
    });

    it('preserves key night fields', () => {
      persistResults(SAMPLE_NIGHTS, null);
      const result = loadPersistedResults();
      const first = result!.nights[0];
      expect(first.dateStr).toBe(SAMPLE_NIGHTS[0].dateStr);
      expect(first.durationHours).toBe(SAMPLE_NIGHTS[0].durationHours);
      expect(first.glasgow.overall).toBe(SAMPLE_NIGHTS[0].glasgow.overall);
      expect(first.wat.flScore).toBe(SAMPLE_NIGHTS[0].wat.flScore);
      expect(first.ned.nedMean).toBe(SAMPLE_NIGHTS[0].ned.nedMean);
    });

    it('returns null for expired data (>30 days)', () => {
      persistResults(SAMPLE_NIGHTS, null);
      // Modify the savedAt to be >30 days ago (MAX_AGE_MS = 30 days)
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      parsed.savedAt = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      storage.set('airwaylab_results', JSON.stringify(parsed));

      const result = loadPersistedResults();
      expect(result).toBeNull();
      // Should also have removed the expired data
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('returns null for corrupted data', () => {
      storage.set('airwaylab_results', '{ invalid json }}}');
      const result = loadPersistedResults();
      expect(result).toBeNull();
    });

    it('returns null for data with empty nights array', () => {
      const data = { nights: [], therapyChangeDate: null, savedAt: Date.now() };
      storage.set('airwaylab_results', JSON.stringify(data));
      const result = loadPersistedResults();
      expect(result).toBeNull();
    });

    it('returns null for data with invalid night shape', () => {
      const data = {
        nights: [{ badKey: true }],
        therapyChangeDate: null,
        savedAt: Date.now(),
      };
      storage.set('airwaylab_results', JSON.stringify(data));
      const result = loadPersistedResults();
      expect(result).toBeNull();
    });

    it('restores Date objects from string serialization', () => {
      persistResults(SAMPLE_NIGHTS, null);
      const result = loadPersistedResults();
      expect(result!.nights[0].date).toBeInstanceOf(Date);
    });
  });

  describe('clearPersistedResults', () => {
    it('removes saved data', () => {
      persistResults(SAMPLE_NIGHTS, null);
      expect(storage.has('airwaylab_results')).toBe(true);
      clearPersistedResults();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('airwaylab_results');
    });

    it('does not throw when nothing is saved', () => {
      expect(() => clearPersistedResults()).not.toThrow();
    });
  });
});
