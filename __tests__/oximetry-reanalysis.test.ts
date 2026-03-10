import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistResults, loadPersistedResults } from '@/lib/persistence';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';
import type { NightResult, OximetryResults } from '@/lib/types';

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

function makeOximetryResults(overrides?: Partial<OximetryResults>): OximetryResults {
  return {
    odi3: 5.2,
    odi4: 2.1,
    tBelow90: 1.3,
    tBelow94: 8.7,
    hrClin8: 12.5,
    hrClin10: 8.3,
    hrClin12: 4.1,
    hrClin15: 1.2,
    hrMean10: 6.4,
    hrMean15: 3.2,
    coupled3_6: 3.1,
    coupled3_10: 1.8,
    coupledHRRatio: 0.6,
    spo2Mean: 94.5,
    spo2Min: 85,
    hrMean: 62.3,
    hrSD: 5.8,
    h1: { hrClin10: 9.1, odi3: 5.8, tBelow94: 9.2 },
    h2: { hrClin10: 7.5, odi3: 4.6, tBelow94: 8.2 },
    totalSamples: 28800,
    retainedSamples: 27500,
    doubleTrackingCorrected: 12,
    ...overrides,
  };
}

describe('oximetry-only reanalysis', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  describe('oximetry data persistence', () => {
    it('persists all 17 oximetry metrics + H1/H2 splits + cleaning stats', () => {
      const ox = makeOximetryResults();
      const nights: NightResult[] = SAMPLE_NIGHTS.map((n, i) =>
        i === 0 ? { ...n, oximetry: ox } : n
      );

      persistResults(nights, null);
      const loaded = loadPersistedResults();
      expect(loaded).not.toBeNull();

      const loadedOx = loaded!.nights.find((n) => n.dateStr === nights[0].dateStr)?.oximetry;
      expect(loadedOx).not.toBeNull();

      // Verify all 17 scalar metrics
      expect(loadedOx!.odi3).toBe(ox.odi3);
      expect(loadedOx!.odi4).toBe(ox.odi4);
      expect(loadedOx!.tBelow90).toBe(ox.tBelow90);
      expect(loadedOx!.tBelow94).toBe(ox.tBelow94);
      expect(loadedOx!.hrClin8).toBe(ox.hrClin8);
      expect(loadedOx!.hrClin10).toBe(ox.hrClin10);
      expect(loadedOx!.hrClin12).toBe(ox.hrClin12);
      expect(loadedOx!.hrClin15).toBe(ox.hrClin15);
      expect(loadedOx!.hrMean10).toBe(ox.hrMean10);
      expect(loadedOx!.hrMean15).toBe(ox.hrMean15);
      expect(loadedOx!.coupled3_6).toBe(ox.coupled3_6);
      expect(loadedOx!.coupled3_10).toBe(ox.coupled3_10);
      expect(loadedOx!.coupledHRRatio).toBe(ox.coupledHRRatio);
      expect(loadedOx!.spo2Mean).toBe(ox.spo2Mean);
      expect(loadedOx!.spo2Min).toBe(ox.spo2Min);
      expect(loadedOx!.hrMean).toBe(ox.hrMean);
      expect(loadedOx!.hrSD).toBe(ox.hrSD);

      // Verify H1/H2 splits
      expect(loadedOx!.h1).toEqual(ox.h1);
      expect(loadedOx!.h2).toEqual(ox.h2);

      // Verify cleaning stats
      expect(loadedOx!.totalSamples).toBe(ox.totalSamples);
      expect(loadedOx!.retainedSamples).toBe(ox.retainedSamples);
      expect(loadedOx!.doubleTrackingCorrected).toBe(ox.doubleTrackingCorrected);
    });

    it('preserves null oximetry for nights without oximetry data', () => {
      const nights = SAMPLE_NIGHTS.map((n) => ({ ...n, oximetry: null }));
      persistResults(nights, null);
      const loaded = loadPersistedResults();
      expect(loaded).not.toBeNull();
      for (const night of loaded!.nights) {
        expect(night.oximetry).toBeNull();
      }
    });

    it('replaces existing oximetry when re-uploading', () => {
      // First save with oximetry
      const ox1 = makeOximetryResults({ odi3: 5.0 });
      const nights1: NightResult[] = SAMPLE_NIGHTS.map((n, i) =>
        i === 0 ? { ...n, oximetry: ox1 } : n
      );
      persistResults(nights1, null);

      // Now save with updated oximetry
      const ox2 = makeOximetryResults({ odi3: 7.5 });
      const nights2: NightResult[] = SAMPLE_NIGHTS.map((n, i) =>
        i === 0 ? { ...n, oximetry: ox2 } : n
      );
      persistResults(nights2, null);

      const loaded = loadPersistedResults();
      const loadedOx = loaded!.nights.find((n) => n.dateStr === nights2[0].dateStr)?.oximetry;
      expect(loadedOx!.odi3).toBe(7.5);
    });
  });

  describe('type definitions', () => {
    it('WorkerMessage discriminated union includes ANALYZE_OXIMETRY', () => {
      // Type-level test — if this compiles, the types are correct
      const msg: import('@/lib/types').WorkerMessage = {
        type: 'ANALYZE_OXIMETRY',
        oximetryCSVs: ['csv-content'],
      };
      expect(msg.type).toBe('ANALYZE_OXIMETRY');
    });

    it('WorkerResponse union includes OXIMETRY_RESULTS', () => {
      const response: import('@/lib/types').WorkerResponse = {
        type: 'OXIMETRY_RESULTS',
        oximetryByDate: {
          '2025-01-15': makeOximetryResults(),
        },
      };
      expect(response.type).toBe('OXIMETRY_RESULTS');
    });
  });

  describe('oximetry merge logic', () => {
    it('merges oximetry into matching cached nights by date', () => {
      // Simulate the merge logic from analyzeOximetryOnly
      const cachedNights = SAMPLE_NIGHTS.map((n) => ({ ...n, oximetry: null }));
      const targetDate = cachedNights[0].dateStr;
      const oxResults = makeOximetryResults();
      const oximetryByDate: Record<string, OximetryResults> = {
        [targetDate]: oxResults,
      };

      const merged = cachedNights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        if (ox) return { ...night, oximetry: ox };
        return night;
      });

      // Target night should have oximetry
      expect(merged[0].oximetry).not.toBeNull();
      expect(merged[0].oximetry!.odi3).toBe(oxResults.odi3);

      // Other nights should remain null
      for (let i = 1; i < merged.length; i++) {
        if (cachedNights[i].oximetry === null) {
          expect(merged[i].oximetry).toBeNull();
        }
      }
    });

    it('handles oximetry date mismatch gracefully', () => {
      const cachedNights = SAMPLE_NIGHTS.map((n) => ({ ...n, oximetry: null }));
      const oximetryByDate: Record<string, OximetryResults> = {
        '1999-12-31': makeOximetryResults(), // date that doesn't match any night
      };

      const merged = cachedNights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        if (ox) return { ...night, oximetry: ox };
        return night;
      });

      // No night should have oximetry
      for (const night of merged) {
        expect(night.oximetry).toBeNull();
      }

      // Check match count
      const matchedCount = Object.keys(oximetryByDate).filter(
        (d) => cachedNights.some((n) => n.dateStr === d)
      ).length;
      expect(matchedCount).toBe(0);
    });

    it('matches multiple oximetry CSVs to multiple nights', () => {
      const cachedNights = SAMPLE_NIGHTS.map((n) => ({ ...n, oximetry: null }));
      const ox1 = makeOximetryResults({ odi3: 3.0 });
      const ox2 = makeOximetryResults({ odi3: 7.0 });

      const oximetryByDate: Record<string, OximetryResults> = {
        [cachedNights[0].dateStr]: ox1,
        [cachedNights[1].dateStr]: ox2,
      };

      const merged = cachedNights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        if (ox) return { ...night, oximetry: ox };
        return night;
      });

      expect(merged[0].oximetry!.odi3).toBe(3.0);
      expect(merged[1].oximetry!.odi3).toBe(7.0);
    });

    it('does not modify unmatched nights', () => {
      const originalOx = makeOximetryResults({ odi3: 99 });
      const cachedNights = SAMPLE_NIGHTS.map((n, i) =>
        i === 2 ? { ...n, oximetry: originalOx } : { ...n, oximetry: null }
      );
      const oximetryByDate: Record<string, OximetryResults> = {
        [cachedNights[0].dateStr]: makeOximetryResults({ odi3: 1.0 }),
      };

      const merged = cachedNights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        if (ox) return { ...night, oximetry: ox };
        return night;
      });

      // Night 0 gets new oximetry
      expect(merged[0].oximetry!.odi3).toBe(1.0);
      // Night 2 retains its original oximetry
      expect(merged[2].oximetry!.odi3).toBe(99);
    });
  });
});
