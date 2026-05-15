import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  RateLimiter: class {
    isLimited() { return Promise.resolve(false); }
  },
}));

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const mockInsert = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({ insert: (...args: unknown[]) => mockInsert(...args) })),
  })),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn(() => Promise.resolve()),
  formatUserSignalEmbed: vi.fn(() => ({})),
}));

vi.mock('./_dedup', () => ({
  DEDUP_WINDOW_MS: 86_400_000,
  deviceModelLastAlertTs: new Map(),
  deviceModelHitCount: new Map(),
}));

// ── Helpers ───────────────────────────────────────────────────────

function makeRequest() {
  return new Request('http://localhost:3000/api/device-diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({
      deviceModel: 'Unknown CPAP v9',
      signalLabels: ['Flow', 'Mask Pressure'],
      identificationText: null,
      hasStrFile: false,
    }),
  }) as unknown as NextRequest;
}

// ── Tests ─────────────────────────────────────────────────────────

describe('POST /api/device-diagnostic — timeout handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCaptureException.mockClear();
    mockCaptureMessage.mockClear();
    mockInsert.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 ok:true when insert succeeds normally', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/device-diagnostic/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('returns 200 ok:true when Supabase insert hangs past 4s timeout', async () => {
    // Insert that never resolves — simulates a hung Supabase connection
    mockInsert.mockImplementation(
      () => new Promise<never>(() => { /* never resolves */ }),
    );

    const { POST } = await import('@/app/api/device-diagnostic/route');
    const responsePromise = POST(makeRequest());

    // Advance fake timers past the 4-second AbortController deadline
    await vi.advanceTimersByTimeAsync(4_100);

    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('does NOT call Sentry.captureException on insert timeout', async () => {
    mockInsert.mockImplementation(
      () => new Promise<never>(() => { /* never resolves */ }),
    );

    const { POST } = await import('@/app/api/device-diagnostic/route');
    const responsePromise = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(4_100);
    await responsePromise;

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('still reports a real Supabase error (non-timeout) to Sentry', async () => {
    const dbError = { message: 'connection refused', code: '08006' };
    mockInsert.mockResolvedValue({ error: dbError });

    const { POST } = await import('@/app/api/device-diagnostic/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockCaptureException).toHaveBeenCalledWith(dbError, expect.anything());
  });
});
