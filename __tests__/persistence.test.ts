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
      expect(result.saved).toBe(true);
      expect(result.nightsSaved).toBe(SAMPLE_NIGHTS.length);
      expect(result.nightsDropped).toBe(0);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('strips bulk data (breath arrays, reras, csl episodes) before saving', () => {
      const nights = SAMPLE_NIGHTS.map((n) => ({
        ...n,
        ned: {
          ...n.ned,
          breaths: [{ inspStart: 0, inspEnd: 10, expStart: 10, expEnd: 20, qPeak: 1, qMid: 0.5, ti: 1, tPeakTi: 0.3, ned: 5, fi: 0.8, isMShape: false, isEarlyPeakFL: false }],
          reras: [{ startBreathIdx: 0, endBreathIdx: 5, breathCount: 5, nedSlope: 0.1, hasRecovery: true, hasSigh: false, maxNED: 30, startSec: 0, durationSec: 30 }],
        },
        csl: { episodes: [{ startSec: 0, endSec: 60, durationSec: 60 }], totalCSRSeconds: 60, csrPercentage: 2, episodeCount: 1 },
      }));
      persistResults(nights as unknown as typeof SAMPLE_NIGHTS, null);
      const saved = storage.get('airwaylab_results');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      for (const night of parsed.nights) {
        expect(night.ned.breaths).toEqual([]);
        expect(night.ned.reras).toEqual([]);
        expect(night.csl.episodes).toEqual([]);
        // Aggregate fields are preserved
        expect(night.csl.totalCSRSeconds).toBe(60);
        expect(night.csl.csrPercentage).toBe(2);
        expect(night.csl.episodeCount).toBe(1);
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

    it('saves all nights when stripped data fits within limit', () => {
      // Create a large nights array — breaths and reras are stripped so should still fit
      const manyNights = Array.from({ length: 500 }, (_, i) => ({
        ...SAMPLE_NIGHTS[0],
        dateStr: `2025-01-${String(i + 1).padStart(2, '0')}`,
        ned: {
          ...SAMPLE_NIGHTS[0]!.ned,
          breaths: new Array(5000).fill({ nedPct: 10, fi: 0.5, tpeak: 0.3 }),
          reras: new Array(500).fill({ startBreathIdx: 0, endBreathIdx: 5, breathCount: 5, nedSlope: 0.1, hasRecovery: true, hasSigh: false, maxNED: 30, startSec: 0, durationSec: 30 }),
        },
        csl: { episodes: new Array(200).fill({ startSec: 0, endSec: 60, durationSec: 60 }), totalCSRSeconds: 3600, csrPercentage: 25, episodeCount: 200 },
      }));
      const result = persistResults(manyNights as unknown as typeof SAMPLE_NIGHTS, null);
      // With stripped data, 500 nights should still be within 4MB
      expect(result.saved).toBe(true);
      expect(result.nightsSaved).toBe(500);
      expect(result.nightsDropped).toBe(0);
    });

    it('returns failure when localStorage throws', () => {
      // Simulate QuotaExceededError — must persist across all setItem calls
      // so the progressive fallback also fails
      const originalSetItem = localStorageMock.setItem;
      (localStorageMock as { setItem: typeof localStorageMock.setItem }).setItem = vi.fn(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });
      const result = persistResults(SAMPLE_NIGHTS, null);
      expect(result.saved).toBe(false);
      expect(result.nightsSaved).toBe(0);
      expect(result.nightsDropped).toBe(SAMPLE_NIGHTS.length);
      expect(result.reason).toBeDefined();
      // Restore original mock
      (localStorageMock as { setItem: typeof localStorageMock.setItem }).setItem = originalSetItem;
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
      expect(first!.dateStr).toBe(SAMPLE_NIGHTS[0]!.dateStr);
      expect(first!.durationHours).toBe(SAMPLE_NIGHTS[0]!.durationHours);
      expect(first!.glasgow.overall).toBe(SAMPLE_NIGHTS[0]!.glasgow.overall);
      expect(first!.wat.flScore).toBe(SAMPLE_NIGHTS[0]!.wat.flScore);
      expect(first!.ned.nedMean).toBe(SAMPLE_NIGHTS[0]!.ned.nedMean);
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
      expect(result!.nights[0]!.date).toBeInstanceOf(Date);
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
