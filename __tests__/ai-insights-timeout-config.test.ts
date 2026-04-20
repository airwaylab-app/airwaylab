import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock external dependencies before importing route ──────────

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
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

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tier: 'supporter' } }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }) },
  })),
  getSupabaseServiceRole: vi.fn(() => null),
}));

vi.mock('@/lib/email/sequences', () => ({
  cancelSequence: vi.fn(),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn(),
  COLORS: { amber: 0xf59e0b },
}));

// Capture the constructor args passed to Anthropic
let capturedConstructorArgs: Record<string, unknown> | undefined;
const mockMessagesCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: JSON.stringify([{
    id: 'ai-1', type: 'positive', title: 'Test', body: 'Test insight', category: 'glasgow',
  }]) }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 100, output_tokens: 50 },
});

vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockMessagesCreate(...args) };
    constructor(args: Record<string, unknown>) {
      capturedConstructorArgs = args;
    }
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
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://airwaylab.app',
    },
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

// ── Tests ─────────────────────────────────────────────────────

describe('AI Insights Timeout Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedConstructorArgs = undefined;
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('exports maxDuration = 60 for Vercel function timeout', async () => {
    const routeModule = await import('@/app/api/ai-insights/route');
    expect(routeModule.maxDuration).toBe(60);
  });

  it('creates Anthropic client with maxRetries: 0 to prevent silent double-timeout', async () => {
    const { POST } = await import('@/app/api/ai-insights/route');
    await POST(makeRequest(validBody()) as never);
    expect(capturedConstructorArgs).toBeDefined();
    expect(capturedConstructorArgs!.maxRetries).toBe(0);
  });

  it('creates Anthropic client with timeout: 50000', async () => {
    const { POST } = await import('@/app/api/ai-insights/route');
    await POST(makeRequest(validBody()) as never);
    expect(capturedConstructorArgs).toBeDefined();
    expect(capturedConstructorArgs!.timeout).toBe(50_000);
  });

  it('returns successful insights with correct config', async () => {
    const { POST } = await import('@/app/api/ai-insights/route');
    const res = await POST(makeRequest(validBody()) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(1);
    expect(body.insights[0].id).toBe('ai-1');
  });
});
