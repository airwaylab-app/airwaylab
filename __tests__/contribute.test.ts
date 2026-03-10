import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NightResult } from '@/lib/types';

// ── Mock fetch ──────────────────────────────────────────────
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

// ── Mock localStorage ───────────────────────────────────────
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

// ── Mock crypto.randomUUID ──────────────────────────────────
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });

import { contributeNights, trackContributedDates } from '@/lib/contribute';

// ── Helpers ─────────────────────────────────────────────────
function makeNight(dateStr: string): NightResult {
  return {
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      papMode: 'CPAP',
      epap: 10,
      ipap: 10,
      pressureSupport: 0,
      riseTime: 1,
      trigger: 'Med',
      cycle: 'Med',
      easyBreathe: 'On',
    },
    glasgow: {
      overall: 3.5,
      skew: 0.5,
      spike: 0.3,
      flatTop: 0.4,
      topHeavy: 0.2,
      multiPeak: 0.3,
      noPause: 0.5,
      inspirRate: 0.4,
      multiBreath: 0.6,
      variableAmp: 0.5,
    },
    wat: {
      flScore: 45,
      regularityScore: 1.2,
      periodicityIndex: 0.05,
    },
    ned: {
      breathCount: 500,
      nedMean: 25,
      nedMedian: 22,
      nedP95: 55,
      nedClearFLPct: 30,
      nedBorderlinePct: 20,
      fiMean: 0.6,
      fiFL85Pct: 15,
      tpeakMean: 0.35,
      mShapePct: 8,
      reraIndex: 5,
      reraCount: 35,
      h1NedMean: 28,
      h2NedMean: 22,
      combinedFLPct: 50,
      estimatedArousalIndex: 12,
    },
    oximetry: null,
  } as unknown as NightResult;
}

function makeNights(count: number): NightResult[] {
  return Array.from({ length: count }, (_, i) =>
    makeNight(`2025-01-${String(i + 1).padStart(2, '0')}`)
  );
}

describe('contributeNights', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    storage.clear();
    vi.clearAllMocks();
  });

  it('sends all nights in one request when ≤ 1000', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const nights = makeNights(500);
    const result = await contributeNights(nights);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.totalSent).toBe(500);
  });

  it('chunks 2500 nights into 3 requests (1000+1000+500)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const nights = makeNights(2500);
    const result = await contributeNights(nights);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.totalSent).toBe(2500);

    // Verify chunk sizes via request bodies
    const bodies = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).nights.length
    );
    expect(bodies).toEqual([1000, 1000, 500]);
  });

  it('all chunks share the same contributionId', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const nights = makeNights(2500);
    const result = await contributeNights(nights);

    const ids = fetchMock.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).contributionId
    );
    expect(ids.every((id: string) => id === ids[0])).toBe(true);
    expect(result.contributionId).toBe(ids[0]);
  });

  it('fires onProgress callback after each chunk', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const nights = makeNights(2500);
    const progress: Array<[number, number]> = [];
    await contributeNights(nights, (sent, total) => progress.push([sent, total]));

    expect(progress).toEqual([
      [1000, 2500],
      [2000, 2500],
      [2500, 2500],
    ]);
  });

  it('throws on chunk failure but previous chunks were sent', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const nights = makeNights(1500);
    await expect(contributeNights(nights)).rejects.toThrow('Contribution failed (batch 2)');

    // First chunk was still sent
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('trackContributedDates', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('stores date strings in localStorage', () => {
    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];
    trackContributedDates(nights);

    const stored = JSON.parse(storage.get('airwaylab_contributed_dates') || '[]');
    expect(stored).toContain('2025-01-01');
    expect(stored).toContain('2025-01-02');
    expect(storage.get('airwaylab_contributed_nights')).toBe('2');
  });

  it('deduplicates dates across calls', () => {
    trackContributedDates([makeNight('2025-01-01')]);
    trackContributedDates([makeNight('2025-01-01'), makeNight('2025-01-02')]);

    const stored = JSON.parse(storage.get('airwaylab_contributed_dates') || '[]');
    expect(stored).toHaveLength(2);
    expect(storage.get('airwaylab_contributed_nights')).toBe('2');
  });
});
