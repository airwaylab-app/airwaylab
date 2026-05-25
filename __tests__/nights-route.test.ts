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
}));

const mockGetUser = vi.fn();

// Mutable select chain
let mockSelectResult: { data: unknown; error: null | { message: string } } = { data: [], error: null };
const mockOrder = vi.fn(() => ({
  gte: vi.fn(() => Promise.resolve(mockSelectResult)),
  then: (resolve: (v: typeof mockSelectResult) => unknown) => Promise.resolve(mockSelectResult).then(resolve),
  // Make the query itself thenable so .gte() is optional
  ...{ [Symbol.for('thenable')]: true },
}));
// We need the query to be awaitable directly when .gte() is not called
const mockQueryChain = {
  gte: vi.fn(() => Promise.resolve(mockSelectResult)),
  order: mockOrder,
  // Awaitable without .gte() — Supabase builder is a thenable
  then: (resolve: (v: typeof mockSelectResult) => unknown) =>
    Promise.resolve(mockSelectResult).then(resolve),
};
mockOrder.mockReturnValue(mockQueryChain);

const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: (table: string) => mockFrom(table),
    })
  ),
  getSupabaseServiceRole: vi.fn(() => null),
}));

// ── Helpers ────────────────────────────────────────────────────

function makeNightRow(dateStr = '2024-01-15') {
  return {
    night_date: dateStr,
    analysis_data: {
      dateStr,
      durationHours: 7.5,
      sessionCount: 1,
      settings: { papMode: 'CPAP', epap: 8 },
      glasgow: { overall: 3.2 },
      wat: { flScore: 22 },
      ned: { nedMean: 12 },
      oximetry: null,
    },
  };
}

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/nights');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return {
    headers: { get: () => null },
    nextUrl: url,
  } as unknown as NextRequest;
}

// ── Tests ──────────────────────────────────────────────────────

describe('GET /api/nights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-abcd1234' } },
      error: null,
    });
    mockSelectResult = { data: [], error: null };
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue(mockQueryChain);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns 200 when Origin header is absent (regression: AIR-1870)', async () => {
    // GET requests from same-origin JS fetch routinely omit the Origin header.
    // validateOrigin() must NOT gate GET endpoints — auth cookie is the guard.
    mockSelectResult = { data: [], error: null };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest()); // makeRequest sets headers.get → null

    expect(res.status).toBe(200);
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockResolvedValue(true);

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(429);
  });

  it('returns 400 when since param is invalid format', async () => {
    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest({ since: 'not-a-date' }));

    expect(res.status).toBe(400);
  });

  it('returns empty nights array when user has no data', async () => {
    mockSelectResult = { data: [], error: null };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as { nights: unknown[] };
    expect(body.nights).toEqual([]);
  });

  it('returns nights for authenticated user', async () => {
    const rows = [makeNightRow('2024-03-15'), makeNightRow('2024-03-14')];
    mockSelectResult = { data: rows, error: null };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as { nights: Array<{ dateStr: string }> };
    expect(body.nights).toHaveLength(2);
    expect(body.nights[0]).toMatchObject({ dateStr: '2024-03-15' });
    expect(body.nights[1]).toMatchObject({ dateStr: '2024-03-14' });
  });

  it('returns analysis_data contents, not the raw row wrapper', async () => {
    const rows = [makeNightRow('2024-03-15')];
    mockSelectResult = { data: rows, error: null };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    const body = await res.json() as { nights: Array<Record<string, unknown>> };
    // Should contain analysis_data fields, not night_date wrapper
    expect(body.nights[0]).toHaveProperty('dateStr');
    expect(body.nights[0]).not.toHaveProperty('night_date');
    expect(body.nights[0]).not.toHaveProperty('analysis_data');
  });

  it('applies since filter when provided', async () => {
    const rows = [makeNightRow('2024-03-15')];
    mockSelectResult = { data: rows, error: null };

    const gteSpy = vi.fn(() => Promise.resolve(mockSelectResult));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrder.mockReturnValueOnce({ gte: gteSpy, then: mockQueryChain.then } as any);

    const { GET } = await import('@/app/api/nights/route');
    await GET(makeRequest({ since: '2024-03-01' }));

    expect(gteSpy).toHaveBeenCalledWith('night_date', '2024-03-01');
  });

  it('does not apply since filter when param is absent', async () => {
    mockSelectResult = { data: [], error: null };

    const gteSpy = vi.fn(() => Promise.resolve(mockSelectResult));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOrder.mockReturnValueOnce({ gte: gteSpy, then: mockQueryChain.then } as any);

    const { GET } = await import('@/app/api/nights/route');
    await GET(makeRequest());

    // No since param → .gte() should not have been called
    expect(gteSpy).not.toHaveBeenCalled();
  });

  it('returns 500 when database query fails', async () => {
    mockSelectResult = {
      data: null as unknown as [],
      error: { message: 'db error' },
    };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });

  it('has no tier-gate — returns all rows regardless of tier', async () => {
    // All 5 rows returned — no tier window applied server-side
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeNightRow(`2024-0${i + 1}-15`)
    );
    mockSelectResult = { data: rows, error: null };

    const { GET } = await import('@/app/api/nights/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json() as { nights: unknown[] };
    expect(body.nights).toHaveLength(5);
  });
});
