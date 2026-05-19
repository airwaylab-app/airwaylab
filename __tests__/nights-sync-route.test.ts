import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────

const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateOrigin: (...args: any[]) => mockValidateOrigin(...(args as [])),
}));

const mockIsLimited = vi.fn(() => Promise.resolve(false));
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  RateLimiter: class {
    isLimited() { return mockIsLimited(); }
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn((_table: string) => ({ upsert: mockUpsert }));
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() =>
    Promise.resolve({ auth: { getUser: () => mockGetUser() } })
  ),
  getSupabaseServiceRole: vi.fn(() => ({ from: (table: string) => mockFrom(table) })),
}));

// ── Helpers ────────────────────────────────────────────────────

function makeNight(dateStr = '2024-01-15') {
  return {
    dateStr,
    durationHours: 7.5,
    sessionCount: 1,
    settings: { papMode: 'CPAP', epap: 8 },
    glasgow: { overall: 3.2, skew: 0.4 },
    wat: { flScore: 22, regularityScore: 1.1, periodicityIndex: 0.05 },
    ned: { nedMean: 12, fiMean: 0.8, breathCount: 400 },
    oximetry: null,
  };
}

function makeRequest(body: unknown): NextRequest {
  return {
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

// ── Tests ──────────────────────────────────────────────────────

describe('POST /api/nights/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid-1234' } }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights: [makeNight()] }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when origin invalid', async () => {
    mockValidateOrigin.mockReturnValue(false);

    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights: [makeNight()] }));

    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockResolvedValue(true);

    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights: [makeNight()] }));

    expect(res.status).toBe(429);
  });

  it('returns 400 when nights array is empty', async () => {
    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights: [] }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when more than 50 nights provided', async () => {
    const nights = Array.from({ length: 51 }, (_, i) =>
      makeNight(`2024-01-${String(i + 1).padStart(2, '0')}`)
    );
    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights }));

    expect(res.status).toBe(400);
  });

  it('upserts with correct fields and returns synced count', async () => {
    const night = makeNight('2024-03-10');
    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights: [night] }));

    expect(res.status).toBe(200);
    const body = await res.json() as { synced: number; skipped: number };
    expect(body.synced).toBe(1);
    expect(body.skipped).toBe(0);

    expect(mockFrom).toHaveBeenCalledWith('user_nights');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1234',
        night_date: '2024-03-10',
        analysis_data: expect.any(Object),
      }),
      { onConflict: 'user_id,night_date' }
    );
  });

  it('strips bulk fields (breaths, reras) from ned before upsert', async () => {
    const nightWithBulk = {
      ...makeNight('2024-03-11'),
      ned: { nedMean: 12, breathCount: 400, breaths: [1, 2, 3], reras: [{ start: 0 }] },
    };

    const { POST } = await import('@/app/api/nights/sync/route');
    await POST(makeRequest({ nights: [nightWithBulk] }));

    const calls = mockUpsert.mock.calls as unknown as Array<[{ analysis_data: { ned: Record<string, unknown> } }]>;
    const storedNed = (calls[0]?.[0])?.analysis_data.ned;
    expect(storedNed?.breaths).toBeUndefined();
    expect(storedNed?.reras).toBeUndefined();
    expect(storedNed?.nedMean).toBe(12);
  });

  it('strips csl.episodes before upsert', async () => {
    const nightWithCsl = {
      ...makeNight('2024-03-14'),
      csl: { score: 0.08, episodes: [{ start: 0, end: 90 }, { start: 200, end: 300 }] },
    };

    const { POST } = await import('@/app/api/nights/sync/route');
    await POST(makeRequest({ nights: [nightWithCsl] }));

    const calls = mockUpsert.mock.calls as unknown as Array<[{ analysis_data: { csl: Record<string, unknown> } }]>;
    const storedCsl = (calls[0]?.[0])?.analysis_data.csl;
    expect((storedCsl?.episodes as unknown[]).length).toBe(0);
    expect(storedCsl?.score).toBe(0.08);
  });

  it('counts skipped nights when upsert errors', async () => {
    const supabaseError = { message: 'db error', code: '23505', details: '', hint: '' };
    mockUpsert.mockResolvedValue({ error: supabaseError as unknown as null });

    const nights = [makeNight('2024-03-12'), makeNight('2024-03-13')];
    const { POST } = await import('@/app/api/nights/sync/route');
    const res = await POST(makeRequest({ nights }));

    expect(res.status).toBe(200);
    const body = await res.json() as { synced: number; skipped: number };
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(2);
  });
});
