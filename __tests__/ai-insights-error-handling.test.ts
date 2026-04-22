import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuthenticationError,
  PermissionDeniedError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
  RateLimitError,
} from '@anthropic-ai/sdk';

// ── Mock external dependencies before importing route ──────────

const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}));

const mockIsLimited = vi.fn(() => false);
vi.mock('@/lib/rate-limit', () => ({
  aiRateLimiter: { isLimited: (...args: Parameters<typeof mockIsLimited>) => mockIsLimited(...args) },
  aiPremiumRateLimiter: { isLimited: (...args: Parameters<typeof mockIsLimited>) => mockIsLimited(...args) },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
}));

const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: vi.fn(),
}));

const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { tier: 'supporter' } }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
});
const mockRpc = vi.fn().mockResolvedValue({ data: null });

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

// Mock Anthropic SDK — preserve error classes, mock only the constructor
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

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/ai-insights/route');
  return POST(makeRequest(body) as never);
}

// ── Tests ─────────────────────────────────────────────────────

describe('AI Insights Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns 503 with config error message for AuthenticationError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new AuthenticationError(401, undefined, 'Invalid API key', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('AI service configuration error. Please try again later.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(AuthenticationError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'auth' }), level: 'error' })
    );
  });

  it('returns 503 with config error message for PermissionDeniedError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new PermissionDeniedError(403, undefined, 'Permission denied', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('AI service configuration error. Please try again later.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(PermissionDeniedError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'auth' }), level: 'error' })
    );
  });

  it('returns 502 with data error message for BadRequestError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new BadRequestError(400, undefined, 'Bad request', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Failed to process analysis data. Please try again.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(BadRequestError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'bad_request' }), level: 'error' })
    );
  });

  it('returns 502 with model unavailable message for NotFoundError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new NotFoundError(404, undefined, 'Model not found', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('AI model unavailable. Please try again later.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(NotFoundError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'not_found' }), level: 'error' })
    );
  });

  it('returns 502 with temporarily unavailable message for InternalServerError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new InternalServerError(500, undefined, 'Internal error', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('AI service temporarily unavailable. Please try again in a few minutes.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(InternalServerError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'server_error' }), level: 'warning' })
    );
  });

  it('returns 502 with connection error message for APIConnectionError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new APIConnectionError({ message: 'Connection refused' })
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('Could not connect to AI service. Please try again.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(APIConnectionError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'connection' }), level: 'warning' })
    );
  });

  it('returns 504 with timeout message for APIConnectionTimeoutError', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new APIConnectionTimeoutError({ message: 'Request timed out' })
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toBe('AI service timed out. Please try again.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(APIConnectionTimeoutError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'connection_timeout' }), level: 'warning' })
    );
  });

  it('returns 429 with existing message for RateLimitError (regression)', async () => {
    mockMessagesCreate.mockRejectedValueOnce(
      new RateLimitError(429, undefined, 'Rate limited', new Headers())
    );
    const res = await callRoute(validBody());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('AI service is temporarily busy. Please try again in a few minutes.');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(RateLimitError),
      expect.objectContaining({ tags: expect.objectContaining({ error_type: 'rate_limit' }), level: 'warning' })
    );
  });

  it('returns 502 with generic message for unknown errors (regression)', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('Something unexpected'));
    const res = await callRoute(validBody());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('AI service error');
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: expect.objectContaining({ route: 'ai-insights' }) })
    );
  });

  it('accepts nights with missing durationHours (regression: AIR-758)', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '[{"id":"ai-1","type":"info","title":"Test","body":"Test body","category":"glasgow"}]' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const body = validBody();
    // Remove durationHours from all nights
    (body.nights as Array<Record<string, unknown>>).forEach((n) => { delete n.durationHours; });
    const res = await callRoute(body);
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.insights).toHaveLength(1);
  });
});
