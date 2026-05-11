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

import { contributeNights, trackContributedDates, RateLimitError } from '@/lib/contribute';

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
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('{}'), headers: { get: () => 'application/json' } })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('{"error":"Server error"}'), headers: { get: () => 'application/json' } });

    const nights = makeNights(1500);
    await expect(contributeNights(nights)).rejects.toThrow('Contribution failed (batch 2): Server error');

    // First chunk was still sent
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws with HTTP status when server returns non-JSON response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('<html>Internal Server Error</html>'),
      headers: { get: () => 'text/html' },
    });

    const nights = makeNights(1);
    await expect(contributeNights(nights)).rejects.toThrow(
      'Contribution failed (batch 1): HTTP 500 (non-JSON)'
    );
  });

  it('throws with HTTP status when server returns empty body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(''),
      headers: { get: () => null },
    });

    const nights = makeNights(1);
    await expect(contributeNights(nights)).rejects.toThrow(
      'Contribution failed (batch 1): HTTP 503 (non-JSON)'
    );
  });

  it('throws RateLimitError (not a generic Error) when server returns 429', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
    });

    const err = await contributeNights(makeNights(1)).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.message).toBe('Too many contributions. Please try again later.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses Retry-After header into retryAfterMs', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'Retry-After' ? '3600' : null) },
    });

    const err = await contributeNights(makeNights(1)).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterMs).toBe(3_600_000);
  });

  it('sets retryAfterMs to undefined when no Retry-After header', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
    });

    const err = await contributeNights(makeNights(1)).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterMs).toBeUndefined();
  });

  it('propagates RateLimitError mid-batch without wrapping', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
      });

    const err = await contributeNights(makeNights(1500)).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
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

// ── Bulk data stripping tests ──────────────────────────────

describe('contribution strips bulk data before sending', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.clearAllMocks();
  });

  function makeNightWithBulkData(dateStr: string): NightResult {
    const base = makeNight(dateStr);
    // Simulate real-world bulk data: breaths with Float32Array, reras, oximetryTrace, csl episodes
    const breaths = Array.from({ length: 6000 }, (_, i) => ({
      inspStart: i * 4,
      inspEnd: i * 4 + 1.5,
      expStart: i * 4 + 1.5,
      expEnd: i * 4 + 4,
      inspFlow: new Float32Array(100).fill(0.5),
      qPeak: 30,
      qMid: 20,
      ti: 1.5,
      tPeakTi: 0.35,
      ned: 15,
      fi: 0.7,
      isMShape: false,
      isEarlyPeakFL: false,
    }));
    const reras = Array.from({ length: 20 }, (_, i) => ({
      startBreathIdx: i * 10,
      endBreathIdx: i * 10 + 5,
      breathCount: 5,
      nedSlope: 3.5,
      hasRecovery: true,
      hasSigh: false,
      maxNED: 45,
      startSec: i * 40,
      durationSec: 20,
    }));
    return {
      ...base,
      ned: {
        ...base.ned,
        breaths,
        reras,
      },
      oximetryTrace: {
        trace: Array.from({ length: 10000 }, (_, i) => ({ t: i, spo2: 95, hr: 70 })),
        durationSeconds: 25200,
        odi3Events: [100, 200],
        odi4Events: [300],
      },
      csl: {
        episodes: Array.from({ length: 50 }, (_, i) => ({
          startSec: i * 600,
          endSec: i * 600 + 120,
          durationSec: 120,
        })),
        totalCSRSeconds: 6000,
        csrPercentage: 24,
        episodeCount: 50,
      },
    } as unknown as NightResult;
  }

  it('strips ned.breaths to empty array in the payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].ned.breaths).toEqual([]);
  });

  it('strips ned.reras to empty array in the payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].ned.reras).toEqual([]);
  });

  it('strips oximetryTrace to null in the payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].oximetryTrace).toBeNull();
  });

  it('strips csl.episodes but preserves scalar CSL fields', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].csl.episodes).toEqual([]);
    expect(body.nights[0].csl.totalCSRSeconds).toBe(6000);
    expect(body.nights[0].csl.csrPercentage).toBe(24);
    expect(body.nights[0].csl.episodeCount).toBe(50);
  });

  it('preserves scalar NED summary fields in the payload', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    await contributeNights(nights);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.nights[0].ned.nedMean).toBe(25);
    expect(body.nights[0].ned.breathCount).toBe(500);
    expect(body.nights[0].ned.estimatedArousalIndex).toBe(12);
    expect(body.nights[0].ned.reraIndex).toBe(5);
  });

  it('does NOT mutate original NightResult objects', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];
    const originalBreathCount = (nights[0]!.ned.breaths as unknown[]).length;
    const originalReraCount = (nights[0]!.ned.reras as unknown[]).length;
    const originalTraceLength = (nights[0]!.oximetryTrace as { trace: unknown[] }).trace.length;
    const originalEpisodeCount = nights[0]!.csl!.episodes.length;

    await contributeNights(nights);

    // Originals must still have their full bulk data intact
    expect((nights[0]!.ned.breaths as unknown[]).length).toBe(originalBreathCount);
    expect(originalBreathCount).toBe(6000);
    expect((nights[0]!.ned.reras as unknown[]).length).toBe(originalReraCount);
    expect(originalReraCount).toBe(20);
    expect((nights[0]!.oximetryTrace as { trace: unknown[] }).trace.length).toBe(originalTraceLength);
    expect(originalTraceLength).toBe(10000);
    expect(nights[0]!.csl!.episodes.length).toBe(originalEpisodeCount);
    expect(originalEpisodeCount).toBe(50);
  });

  it('produces a significantly smaller payload than raw data', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const nights = [makeNightWithBulkData('2025-01-01')];

    // Measure raw size (what was sent before this fix)
    const rawSize = JSON.stringify(nights).length;

    await contributeNights(nights);

    const sentBody = (fetchMock.mock.calls[0]![1] as RequestInit).body as string;
    const sentSize = sentBody.length;

    // The stripped payload should be dramatically smaller (raw with 6000 breaths
    // each containing Float32Array is tens of MB, stripped is ~2-3 KB)
    expect(sentSize).toBeLessThan(rawSize * 0.1);
  });
});
