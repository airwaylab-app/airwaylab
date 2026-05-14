import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { persistResults, loadPersistedResults, clearPersistedResults, clearPersistedNights } from '@/lib/persistence';
import { filterNightsToTierWindow } from '@/lib/analysis-orchestrator';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';
import type { NightResult } from '@/lib/types';

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from '@sentry/nextjs';

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

    it('saves all nights when stripped data fits within limit', () => {
      // Create a large nights array — breaths are stripped so should still fit
      const manyNights = Array.from({ length: 500 }, (_, i) => ({
        ...SAMPLE_NIGHTS[0],
        dateStr: `2025-01-${String(i + 1).padStart(2, '0')}`,
        ned: {
          ...SAMPLE_NIGHTS[0]!.ned,
          breaths: new Array(5000).fill({ nedPct: 10, fi: 0.5, tpeak: 0.3 }),
        },
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

    it('strips ned.reras from persisted data', () => {
      const nightWithReras = {
        ...SAMPLE_NIGHTS[0]!,
        ned: {
          ...SAMPLE_NIGHTS[0]!.ned,
          reras: [
            { startBreathIdx: 0, endBreathIdx: 10, breathCount: 10, nedSlope: 1.2, hasRecovery: true, hasSigh: false, maxNED: 45, startSec: 100, durationSec: 30 },
            { startBreathIdx: 20, endBreathIdx: 28, breathCount: 8, nedSlope: 0.8, hasRecovery: false, hasSigh: true, maxNED: 38, startSec: 200, durationSec: 24 },
          ],
        },
      };
      persistResults([nightWithReras] as unknown as typeof SAMPLE_NIGHTS, null);
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      expect(parsed.nights[0].ned.reras).toBeUndefined();
    });

    it('strips csl.episodes from persisted data but keeps aggregate stats', () => {
      const nightWithCSL = {
        ...SAMPLE_NIGHTS[0]!,
        csl: {
          episodes: Array.from({ length: 50 }, (_, i) => ({
            startSec: i * 120,
            endSec: i * 120 + 90,
            durationSec: 90,
          })),
          totalCSRSeconds: 4500,
          csrPercentage: 15.6,
          episodeCount: 50,
        },
      };
      persistResults([nightWithCSL] as unknown as typeof SAMPLE_NIGHTS, null);
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      // Episode list stripped to save space
      expect(parsed.nights[0].csl.episodes).toEqual([]);
      // Aggregate stats preserved for dashboard display
      expect(parsed.nights[0].csl.csrPercentage).toBe(15.6);
      expect(parsed.nights[0].csl.episodeCount).toBe(50);
      expect(parsed.nights[0].csl.totalCSRSeconds).toBe(4500);
    });

    it('preserves null csl when night has no CSL data', () => {
      const nightWithoutCSL = { ...SAMPLE_NIGHTS[0]!, csl: null };
      persistResults([nightWithoutCSL] as unknown as typeof SAMPLE_NIGHTS, null);
      const saved = storage.get('airwaylab_results');
      const parsed = JSON.parse(saved!);
      expect(parsed.nights[0].csl).toBeNull();
    });

    describe('RangeError handling (AIR-1433)', () => {
      afterEach(() => { vi.restoreAllMocks(); });

      it('does not throw when JSON.stringify raises RangeError (V8 string-length overflow)', () => {
        // RangeError: Invalid string length fires inside JSON.stringify before any size guard runs.
        // The outer persistResults catch must handle it gracefully rather than crashing the page.
        vi.spyOn(JSON, 'stringify').mockImplementation(() => {
          throw new RangeError('Invalid string length');
        });

        let result: ReturnType<typeof persistResults>;
        expect(() => { result = persistResults(SAMPLE_NIGHTS, null); }).not.toThrow();
        expect(result!.saved).toBe(false);
        expect(result!.nightsSaved).toBe(0);
        expect(result!.nightsDropped).toBe(SAMPLE_NIGHTS.length);
      });

      it('falls back to binary-search subset when JSON.stringify throws RangeError for large payloads only (AIR-1433 regression)', () => {
        // Root cause of AIR-1433: trySerialise propagates RangeError instead of returning null,
        // which breaks out of the binary search and causes a total save failure even when a
        // smaller subset of nights would have fitted.
        // After the fix (try-catch inside trySerialise), binary search converges to 1 night.
        if (SAMPLE_NIGHTS.length < 2) return;

        const originalStringify = JSON.stringify;
        vi.spyOn(JSON, 'stringify').mockImplementation((...args: Parameters<typeof JSON.stringify>) => {
          const first = args[0];
          if (
            first !== null &&
            typeof first === 'object' &&
            'nights' in (first as object) &&
            Array.isArray((first as { nights: unknown }).nights) &&
            (first as { nights: unknown[] }).nights.length >= 2
          ) {
            throw new RangeError('Invalid string length');
          }
          return originalStringify(...args);
        });

        const result = persistResults(SAMPLE_NIGHTS, null);

        // Fixed behaviour: binary search saves the largest subset that serialises (1 night here).
        expect(result.saved).toBe(true);
        expect(result.nightsSaved).toBe(1);
        expect(result.nightsDropped).toBe(SAMPLE_NIGHTS.length - 1);
      });
    });

    it('reports size diagnostics in Sentry on total failure', () => {
      // Force total failure: override trySerialise by making the JSON size check fail.
      // We do this by making the first night have a field that JSON.stringify produces > 4MB.
      // Easiest: temporarily lower the cap by monkey-patching MAX_STORAGE_BYTES.
      // Instead, build a night where JSON is genuinely large — use a huge extendedSettings map.
      const hugeSettings = Object.fromEntries(
        Array.from({ length: 200_000 }, (_, i) => [`key${i}`, i])
      );
      const largeNight = {
        ...SAMPLE_NIGHTS[0]!,
        settings: { ...SAMPLE_NIGHTS[0]!.settings, extendedSettings: hugeSettings },
      };
      vi.mocked(Sentry.captureMessage).mockClear();
      persistResults([largeNight] as unknown as typeof SAMPLE_NIGHTS, null);

      const calls = vi.mocked(Sentry.captureMessage).mock.calls;
      const totalFailureCall = calls.find(
        (c) => c[0] === 'Persistence: total failure — cannot save any nights'
      );
      expect(totalFailureCall).toBeDefined();
      const extra = (totalFailureCall![1] as { extra?: Record<string, unknown> })?.extra;
      expect(extra).toBeDefined();
      expect(typeof extra!.singleNightApproxBytes).toBe('number');
      expect(extra!.singleNightApproxBytes).toBeGreaterThan(0);
      expect(extra!.singleNightSections).toBeDefined();
      expect(typeof extra!.totalNights).toBe('number');
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

    it('restores sessionStartTime as a Date after round-trip through localStorage', () => {
      const startTime = new Date('2025-03-15T22:31:00Z');
      const nightWithStartTime = {
        ...SAMPLE_NIGHTS[0]!,
        sessionStartTime: startTime,
      };
      persistResults([nightWithStartTime] as unknown as typeof SAMPLE_NIGHTS, null);
      const result = loadPersistedResults();
      expect(result!.nights[0]!.sessionStartTime).toBeInstanceOf(Date);
      expect(result!.nights[0]!.sessionStartTime!.toISOString()).toBe(startTime.toISOString());
    });

    it('tolerates nights without sessionStartTime (legacy data migration)', () => {
      const nightWithoutStartTime = { ...SAMPLE_NIGHTS[0]! };
      delete (nightWithoutStartTime as Partial<typeof SAMPLE_NIGHTS[0]>).sessionStartTime;
      persistResults([nightWithoutStartTime] as unknown as typeof SAMPLE_NIGHTS, null);
      const result = loadPersistedResults();
      expect(result!.nights[0]!.sessionStartTime).toBeUndefined();
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

  describe('clearPersistedNights', () => {
    it('removes airwaylab_results from localStorage', () => {
      localStorage.setItem('airwaylab_results', '{"nights":[],"therapyChangeDate":null,"savedAt":1}');
      clearPersistedNights();
      expect(localStorage.getItem('airwaylab_results')).toBeNull();
    });

    it('removes airwaylab_file_manifest from localStorage', () => {
      localStorage.setItem('airwaylab_file_manifest', '{"manifests":[],"savedAt":1}');
      clearPersistedNights();
      expect(localStorage.getItem('airwaylab_file_manifest')).toBeNull();
    });
  });
});

// ── filterNightsToTierWindow ────────────────────────────────────

function makeDatedNight(dateStr: string): NightResult {
  return { ...SAMPLE_NIGHTS[0]!, dateStr, date: new Date(dateStr) } as NightResult;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('filterNightsToTierWindow', () => {
  it('community tier keeps nights within 30 days and excludes older ones', () => {
    const nights = [
      makeDatedNight(daysAgo(1)),
      makeDatedNight(daysAgo(3)),
      makeDatedNight(daysAgo(5)),
      makeDatedNight(daysAgo(10)),  // inside 30-day window
      makeDatedNight(daysAgo(31)),  // outside 30-day window
    ];
    const result = filterNightsToTierWindow(nights, 'community');
    expect(result).toHaveLength(4);
    expect(result.map((n) => n.dateStr)).toEqual(
      expect.not.arrayContaining([daysAgo(31)])
    );
  });

  it('supporter tier keeps nights within 90 days and excludes older ones', () => {
    const nights = [
      makeDatedNight(daysAgo(1)),
      makeDatedNight(daysAgo(45)),
      makeDatedNight(daysAgo(80)),
      makeDatedNight(daysAgo(100)),  // outside window
    ];
    const result = filterNightsToTierWindow(nights, 'supporter');
    expect(result).toHaveLength(3);
  });

  it('champion tier keeps all nights regardless of age', () => {
    const nights = [
      makeDatedNight(daysAgo(1)),
      makeDatedNight(daysAgo(200)),
      makeDatedNight(daysAgo(500)),
    ];
    const result = filterNightsToTierWindow(nights, 'champion');
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no nights fall within community window', () => {
    const nights = [
      makeDatedNight(daysAgo(31)),
      makeDatedNight(daysAgo(60)),
    ];
    const result = filterNightsToTierWindow(nights, 'community');
    expect(result).toHaveLength(0);
  });
});
