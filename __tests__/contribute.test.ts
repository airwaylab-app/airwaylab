import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NightResult, SettingsMetrics } from '@/lib/types';

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
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null, machineSummary: null, settingsFingerprint: null, csl: null,
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
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Server error' }) });

    const nights = makeNights(1500);
    await expect(contributeNights(nights)).rejects.toThrow('Contribution failed (batch 2): Server error');

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

// ── Enriched payload tests (Spec: enhanced-contribution-schema) ──

describe('enriched contribution payload', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.clearAllMocks();
  });

  function makeNightWithHypopnea(dateStr: string): NightResult {
    const base = makeNight(dateStr);
    return {
      ...base,
      ned: {
        ...base.ned,
        hypopneaCount: 12,
        hypopneaIndex: 1.8,
        hypopneaSource: 'algorithm' as const,
        hypopneaNedInvisibleCount: 3,
        hypopneaNedInvisiblePct: 25,
        hypopneaMeanDropPct: 45,
        hypopneaMeanDurationS: 18.5,
        hypopneaH1Index: 2.1,
        hypopneaH2Index: 1.5,
        briefObstructionCount: 5,
        briefObstructionIndex: 0.7,
        briefObstructionH1Index: 0.9,
        briefObstructionH2Index: 0.5,
        amplitudeCvOverall: 32.1,
        amplitudeCvMedianEpoch: 28.5,
        unstableEpochPct: 15,
      },
    } as unknown as NightResult;
  }

  function makeNightWithSettings(dateStr: string): NightResult {
    const night = makeNightWithHypopnea(dateStr);
    const settingsMetrics: SettingsMetrics = {
      breathCount: 480,
      epapDetected: 10,
      ipapDetected: 14,
      psDetected: 4,
      triggerDelayMedianMs: 85,
      triggerDelayP10Ms: 50,
      triggerDelayP90Ms: 150,
      autoTriggerPct: 2.5,
      tiMedianMs: 1200,
      tiP25Ms: 1000,
      tiP75Ms: 1400,
      teMedianMs: 2800,
      ieRatio: 0.43,
      timeAtIpapMedianMs: 900,
      timeAtIpapP25Ms: 750,
      ipapDwellMedianPct: 75,
      ipapDwellP10Pct: 60,
      prematureCyclePct: 3.2,
      lateCyclePct: 1.8,
      endExpPressureMean: 10.1,
      endExpPressureSd: 0.3,
      tidalVolumeMedianMl: 450,
      tidalVolumeP25Ml: 380,
      tidalVolumeP75Ml: 520,
      tidalVolumeCv: 18.5,
      minuteVentProxy: 7.2,
    };
    return { ...night, settingsMetrics } as unknown as NightResult;
  }

  it('contribution payload includes NED nights with EAI', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNight('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    // The payload sends raw NightResult — the server does anonymisation.
    // Verify the night has estimatedArousalIndex available.
    expect(body.nights[0]!.ned.estimatedArousalIndex).toBe(12);
  });

  it('contribution payload includes hypopnea fields when present', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithHypopnea('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0]!.ned.hypopneaCount).toBe(12);
    expect(body.nights[0]!.ned.hypopneaIndex).toBe(1.8);
    expect(body.nights[0]!.ned.amplitudeCvOverall).toBe(32.1);
    expect(body.nights[0]!.ned.briefObstructionCount).toBe(5);
  });

  it('contribution payload includes settingsMetrics when available', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithSettings('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0]!.settingsMetrics).toBeDefined();
    expect(body.nights[0]!.settingsMetrics.tidalVolumeCv).toBe(18.5);
    expect(body.nights[0]!.settingsMetrics.triggerDelayMedianMs).toBe(85);
    expect(body.nights[0]!.settingsMetrics.ieRatio).toBe(0.43);
  });

  it('contribution payload has settingsMetrics null when not available', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNight('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].settingsMetrics).toBeNull();
  });
});
