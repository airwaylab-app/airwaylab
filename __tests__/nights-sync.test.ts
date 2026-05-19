import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncAnalysisToCloud } from '@/lib/storage/nights-sync';
import type { NightResult } from '@/lib/types';

// ── Mock fetch ──────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ────────────────────────────────────────────────────

function makeNight(dateStr: string): NightResult {
  return {
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: { papMode: 'CPAP', epap: 8 } as NightResult['settings'],
    glasgow: { overall: 3 } as NightResult['glasgow'],
    wat: { flScore: 20, regularityScore: 1, periodicityIndex: 0.04 } as NightResult['wat'],
    ned: {
      nedMean: 10,
      breathCount: 300,
      breaths: [{ ned: 10 }] as unknown as NightResult['ned']['breaths'],
      reras: [{ start: 0, end: 1 }] as unknown as NightResult['ned']['reras'],
    } as NightResult['ned'],
    oximetry: null,
  } as unknown as NightResult;
}

function okResponse(synced: number, skipped = 0) {
  return Promise.resolve(
    new Response(JSON.stringify({ synced, skipped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function errorResponse(status = 500) {
  return Promise.resolve(new Response('{}', { status }));
}

// ── Tests ──────────────────────────────────────────────────────

describe('syncAnalysisToCloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a single batch for ≤50 nights', async () => {
    mockFetch.mockReturnValueOnce(okResponse(5));

    const nights = Array.from({ length: 5 }, (_, i) =>
      makeNight(`2024-01-${String(i + 1).padStart(2, '0')}`)
    );
    const result = await syncAnalysisToCloud(nights);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ synced: 5, skipped: 0, failed: 0 });
  });

  it('sends two batches for 51 nights', async () => {
    mockFetch
      .mockReturnValueOnce(okResponse(50))
      .mockReturnValueOnce(okResponse(1));

    const nights = Array.from({ length: 51 }, (_, i) =>
      makeNight(`2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`)
    );
    const result = await syncAnalysisToCloud(nights);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.synced).toBe(51);

    // First batch has 50 nights
    const firstCall = mockFetch.mock.calls[0]?.[1] as { body: string };
    const firstBatch = JSON.parse(firstCall.body) as { nights: unknown[] };
    expect(firstBatch.nights).toHaveLength(50);

    // Second batch has 1 night
    const secondCall = mockFetch.mock.calls[1]?.[1] as { body: string };
    const secondBatch = JSON.parse(secondCall.body) as { nights: unknown[] };
    expect(secondBatch.nights).toHaveLength(1);
  });

  it('strips bulk data (breaths, reras) before sending', async () => {
    mockFetch.mockReturnValueOnce(okResponse(1));

    await syncAnalysisToCloud([makeNight('2024-03-01')]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string };
    const payload = JSON.parse(call.body) as { nights: Array<{ ned: Record<string, unknown> }> };
    const sentNed = payload.nights[0]?.ned;

    expect(sentNed?.breaths).toBeUndefined();
    expect(sentNed?.reras).toBeUndefined();
    expect(sentNed?.nedMean).toBe(10);
  });

  it('strips oximetryTrace before sending', async () => {
    mockFetch.mockReturnValueOnce(okResponse(1));

    const nightWithTrace = {
      ...makeNight('2024-03-01'),
      oximetryTrace: new Float32Array([1, 2, 3]),
    } as unknown as NightResult;

    await syncAnalysisToCloud([nightWithTrace]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string };
    const payload = JSON.parse(call.body) as { nights: Array<Record<string, unknown>> };
    expect(payload.nights[0]?.oximetryTrace).toBeUndefined();
  });

  it('marks failed count on HTTP error but does not throw', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(500));

    const nights = [makeNight('2024-03-01'), makeNight('2024-03-02')];
    const result = await syncAnalysisToCloud(nights);

    expect(result.failed).toBe(2);
    expect(result.synced).toBe(0);
  });

  it('marks failed count on network error but does not throw', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await syncAnalysisToCloud([makeNight('2024-03-01')]);

    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
  });

  it('aggregates synced/skipped across multiple batches', async () => {
    mockFetch
      .mockReturnValueOnce(okResponse(48, 2))
      .mockReturnValueOnce(okResponse(1));

    const nights = Array.from({ length: 51 }, (_, i) =>
      makeNight(`2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`)
    );
    const result = await syncAnalysisToCloud(nights);

    expect(result.synced).toBe(49);
    expect(result.skipped).toBe(2);
    expect(result.failed).toBe(0);
  });
});
