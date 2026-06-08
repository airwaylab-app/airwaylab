// ============================================================
// AirwayLab — persistence IndexedDB-primary behaviour
// Proves the localStorage 4 MB cap is removed: with IndexedDB available, the
// FULL history persists (no nights dropped) and loads back from IDB-first.
// summary-idb is mocked (in-memory) and a minimal indexedDB stub makes
// idbAvailable() true; no real IDB driver is needed.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

const h = vi.hoisted(() => {
  let stored: { json: string; savedAt: number } | null = null;
  const saveSummaryRecord = vi.fn((json: string, savedAt: number) => {
    stored = { json, savedAt };
    return Promise.resolve();
  });
  const readSummaryRecord = vi.fn(() => Promise.resolve(stored));
  const clearSummaryRecord = vi.fn(() => {
    stored = null;
    return Promise.resolve();
  });
  return { saveSummaryRecord, readSummaryRecord, clearSummaryRecord, reset: () => { stored = null; } };
});

vi.mock('@/lib/summary-idb', () => ({
  saveSummaryRecord: h.saveSummaryRecord,
  readSummaryRecord: h.readSummaryRecord,
  clearSummaryRecord: h.clearSummaryRecord,
}));

// Make idbAvailable() true (it checks typeof indexedDB.open === 'function').
(globalThis as unknown as { indexedDB: unknown }).indexedDB = { open: () => ({}) };

import { persistResults, loadPersistedResults } from '@/lib/persistence';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';
import type { NightResult } from '@/lib/types';

describe('persistence — IndexedDB primary (no 4 MB cap)', () => {
  beforeEach(() => {
    h.reset();
    h.saveSummaryRecord.mockClear();
    h.readSummaryRecord.mockClear();
    localStorage.clear();
  });

  it('persists the FULL history to IndexedDB and drops nothing, even for a large dataset', async () => {
    // 800 nights with heavy breath arrays — far beyond the 4 MB localStorage cap.
    const manyNights = Array.from({ length: 800 }, (_, i) => ({
      ...SAMPLE_NIGHTS[0]!,
      dateStr: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}-${i}`,
      ned: {
        ...SAMPLE_NIGHTS[0]!.ned,
        breaths: new Array(5000).fill({ nedPct: 10, fi: 0.5, tpeak: 0.3 }),
      },
    })) as unknown as NightResult[];

    const result = await persistResults(manyNights, null);

    expect(result.saved).toBe(true);
    expect(result.nightsDropped).toBe(0);
    expect(result.nightsSaved).toBe(800);
    expect(h.saveSummaryRecord).toHaveBeenCalledTimes(1);

    // The blob written to IDB carries all 800 nights (bulk-stripped).
    const writtenJson = h.saveSummaryRecord.mock.calls[0]![0] as string;
    const parsed = JSON.parse(writtenJson);
    expect(parsed.nights).toHaveLength(800);
  });

  it('loads back from IndexedDB first (full history round-trips)', async () => {
    const nights = SAMPLE_NIGHTS;
    await persistResults(nights, '2025-02-02');

    const loaded = await loadPersistedResults();
    expect(h.readSummaryRecord).toHaveBeenCalled();
    expect(loaded).not.toBeNull();
    expect(loaded!.nights).toHaveLength(nights.length);
    expect(loaded!.therapyChangeDate).toBe('2025-02-02');
  });

  it('clears the IndexedDB record on engine-version mismatch', async () => {
    await persistResults(SAMPLE_NIGHTS, null);
    // Tamper the stored blob to an old engine version.
    const rec = await h.readSummaryRecord();
    const data = JSON.parse(rec!.json);
    data.engineVersion = '0.0.0-old';
    h.saveSummaryRecord(JSON.stringify(data), data.savedAt);
    h.clearSummaryRecord.mockClear();

    const loaded = await loadPersistedResults();
    expect(loaded).toEqual({ nights: [], therapyChangeDate: null, engineUpgraded: true });
    expect(h.clearSummaryRecord).toHaveBeenCalled();
  });
});
