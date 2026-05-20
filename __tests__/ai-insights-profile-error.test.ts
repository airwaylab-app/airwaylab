/**
 * Tests for .single() error destructuring in ai-insights route (AIR-1878).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));

vi.mock('@/lib/rate-limit', () => ({
  aiRateLimiter: { isLimited: vi.fn(() => false) },
  aiPremiumRateLimiter: { isLimited: vi.fn(() => false) },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
}));

const dbError = { code: 'PGRST116', message: 'no rows returned', details: null, hint: null };

const mockSingleFn = vi.fn();
const mockFromFn = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: (...args: unknown[]) => mockSingleFn(...args),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockFromFn(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-abc' } }, error: null }) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFromFn(...args),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  class MockAnthropic {
    messages = { create: vi.fn() };
    static AuthenticationError = actual.AuthenticationError;
    static PermissionDeniedError = actual.PermissionDeniedError;
    static BadRequestError = actual.BadRequestError;
    static NotFoundError = actual.NotFoundError;
    static InternalServerError = actual.InternalServerError;
    static APIConnectionError = actual.APIConnectionError;
    static APIConnectionTimeoutError = actual.APIConnectionTimeoutError;
    static RateLimitError = actual.RateLimitError;
  }
  return { ...actual, default: MockAnthropic };
});

function makeRequest() {
  return new Request('https://airwaylab.app/api/ai-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://airwaylab.app' },
    body: JSON.stringify({
      nights: [{
        dateStr: '2026-03-12',
        durationHours: 7,
        sessionCount: 1,
        settings: {},
        glasgow: { overall: 3.5 },
        wat: { flScore: 40 },
        ned: { nedMean: 25 },
        oximetry: null,
      }],
      selectedNightIndex: 0,
      therapyChangeDate: null,
    }),
  });
}

describe('ai-insights: profile lookup DB error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockSingleFn.mockResolvedValue({ data: null, error: dbError });
  });

  it('returns 500 when profile lookup fails with DB error', async () => {
    const { POST } = await import('@/app/api/ai-insights/route');
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Service temporarily unavailable');
  });

  it('captures profile error to Sentry with route and check tags', async () => {
    const { POST } = await import('@/app/api/ai-insights/route');
    await POST(makeRequest() as never);
    expect(mockCaptureException).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        tags: expect.objectContaining({ route: 'ai-insights', check: 'profile-lookup' }),
        extra: expect.objectContaining({ userId: 'user-abc' }),
      })
    );
  });
});
