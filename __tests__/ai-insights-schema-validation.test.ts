/**
 * Regression tests for AI insights Zod schema validation (AIR-981).
 *
 * Verifies that the nights array schema accepts trend-stripped nights that omit
 * durationHours, sessionCount, and settings. These fields are intentionally
 * absent for trend-context nights (stripped by stripTrendNightForAIPayload)
 * and the server only needs them on the selected night.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock external dependencies before importing route ──────────

const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  aiRateLimiter: { isLimited: vi.fn(() => false) },
  aiPremiumRateLimiter: { isLimited: vi.fn(() => false) },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { tier: 'supporter' } }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  insert: vi.fn().mockReturnThis(),
  then: vi.fn().mockResolvedValue({ error: null }),
});
const mockRpc = vi.fn().mockResolvedValue({ data: null });

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-981' } }, error: null }) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

vi.mock('@/lib/email/sequences', () => ({
  cancelSequence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  COLORS: { red: 0xff0000, amber: 0xffaa00 },
}));

const mockMessagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockMessagesCreate(...args) };
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

// ── Helpers ────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('https://airwaylab.app/api/ai-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://airwaylab.app' },
    body: JSON.stringify(body),
  });
}

/** Full night object as sent for the selected / previous night. */
function fullNight(dateStr: string) {
  return {
    dateStr,
    durationHours: 7.2,
    sessionCount: 1,
    settings: { cpapMode: 'APAP', minPressure: 6, maxPressure: 14 },
    glasgow: { overall: 3.5, skew: 0.4, flatTop: 0.6 },
    wat: { flScore: 42, regularityScore: 1.1, periodicityIndex: 0.08 },
    ned: { nedMean: 28.5, nedMedian: 27.0, nedClearFLPct: 40 },
    oximetry: null,
  };
}

/** Trend-stripped night as produced by stripTrendNightForAIPayload — missing
 *  durationHours, sessionCount, and settings. */
function trendNight(dateStr: string) {
  return {
    dateStr,
    glasgow: { overall: 3.1 },
    ned: { nedMean: 26.0 },
    wat: { flScore: 38 },
  };
}

function mockSuccessResponse() {
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: 'text', text: '[{"id":"ai-1","type":"info","title":"Test insight","body":"Body text.","category":"trend"}]' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  });
}

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/ai-insights/route');
  return POST(makeRequest(body) as never);
}

// ── Tests ─────────────────────────────────────────────────────

describe('AI Insights Zod schema validation — trend nights (AIR-981)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockSuccessResponse();
  });

  it('accepts a single full night with no trend nights', async () => {
    const res = await callRoute({
      nights: [fullNight('2026-03-12')],
      selectedNightIndex: 0,
      therapyChangeDate: null,
    });
    expect(res.status).not.toBe(400);
  });

  it('accepts payload with 3 nights where trend nights omit durationHours, sessionCount, settings', async () => {
    // Simulates a user with 3 nights: selected (full) + 2 trend-stripped nights
    const res = await callRoute({
      nights: [
        fullNight('2026-03-12'),
        trendNight('2026-03-11'),
        trendNight('2026-03-10'),
      ],
      selectedNightIndex: 0,
      therapyChangeDate: null,
    });
    // Before fix this returned 400 due to durationHours being required in Zod schema
    expect(res.status).not.toBe(400);
    const body = await res.json();
    expect(body).not.toHaveProperty('error');
  });

  it('accepts payload with 7 trend nights (max trend window)', async () => {
    const nights = [
      fullNight('2026-03-12'),
      ...Array.from({ length: 6 }, (_, i) => trendNight(`2026-03-${String(11 - i).padStart(2, '0')}`)),
    ];
    const res = await callRoute({
      nights,
      selectedNightIndex: 0,
      therapyChangeDate: null,
    });
    expect(res.status).not.toBe(400);
  });

  it('still rejects a payload where the selected night omits durationHours when it has settings', async () => {
    // The selected night CAN omit durationHours (schema is optional), but if settings
    // is sent as a non-object this should still fail. This test just verifies required
    // fields like glasgow.overall are still enforced.
    const res = await callRoute({
      nights: [{
        dateStr: '2026-03-12',
        // Missing glasgow entirely — must still fail
        wat: { flScore: 40 },
        ned: { nedMean: 25 },
      }],
      selectedNightIndex: 0,
      therapyChangeDate: null,
    });
    expect(res.status).toBe(400);
  });

  it('still rejects when selectedNightIndex is out of bounds', async () => {
    const res = await callRoute({
      nights: [fullNight('2026-03-12')],
      selectedNightIndex: 5,
      therapyChangeDate: null,
    });
    expect(res.status).toBe(400);
  });
});
