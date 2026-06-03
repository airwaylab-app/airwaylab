/**
 * R-B consent gate tests for the AI insights route.
 *
 * AI insights send PHI (night/therapy data) to Anthropic. The route must refuse
 * (403) unless the user's profiles.ai_insights_consent is true, and must proceed
 * normally when it is true. This is the load-bearing gate that prevents PHI from
 * leaving the device without explicit consent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock external dependencies before importing route ──────────

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));

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

// Profile/consent row is configurable per-test via this mutable holder.
let consentValue: boolean = true;

const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { tier: 'supporter', ai_insights_consent: consentValue } })
  ),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  insert: vi.fn().mockReturnThis(),
  then: vi.fn().mockResolvedValue({ error: null }),
});
const mockRpc = vi.fn().mockResolvedValue({ data: null });

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'consent-user' } }, error: null }) },
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

function validBody(): Record<string, unknown> {
  return {
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
  };
}

function mockSuccessResponse() {
  mockMessagesCreate.mockResolvedValue({
    content: [{ type: 'text', text: '[{"id":"ai-1","type":"info","title":"Test","body":"Body.","category":"trend"}]' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  });
}

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/ai-insights/route');
  return POST(makeRequest(body) as never);
}

// ── Tests ─────────────────────────────────────────────────────

describe('AI Insights — R-B consent gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    consentValue = true;
    mockSuccessResponse();
  });

  it('returns 403 and never calls Anthropic when consent is not granted', async () => {
    consentValue = false;
    const res = await callRoute(validBody());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/consent/i);
    // The load-bearing guarantee: no PHI reached the model.
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('proceeds to call Anthropic when consent is granted', async () => {
    consentValue = true;
    const res = await callRoute(validBody());
    expect(res.status).toBe(200);
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });
});
