import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

let mockTier = 'supporter';
const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { tier: mockTier } })
  ),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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

// Mock Anthropic SDK — capture messages.create args
const mockMessagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockMessagesCreate(...args) };
    static RateLimitError = actual.RateLimitError;
    static AuthenticationError = actual.AuthenticationError;
    static PermissionDeniedError = actual.PermissionDeniedError;
    static BadRequestError = actual.BadRequestError;
    static NotFoundError = actual.NotFoundError;
    static InternalServerError = actual.InternalServerError;
    static APIConnectionError = actual.APIConnectionError;
    static APIConnectionTimeoutError = actual.APIConnectionTimeoutError;
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

function validBody(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    nights: [{
      dateStr: '2026-03-14',
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
    ...overrides,
  };
}

function mockAIResponse(insights: Record<string, unknown>[]) {
  mockMessagesCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(insights) }],
    stop_reason: 'end_turn',
  });
}

function validInsight(overrides?: Record<string, unknown>) {
  return {
    id: 'ai-test-1',
    type: 'info',
    title: 'Test insight',
    body: 'Test body.',
    category: 'glasgow',
    ...overrides,
  };
}

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/ai-insights/route');
  return POST(makeRequest(body) as never);
}

// ── Tests ─────────────────────────────────────────────────────

describe('Premium AI Quality — Model Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockTier = 'supporter';
  });

  it('uses Haiku for community tier', async () => {
    mockTier = 'community';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { model: string };
    expect(createArgs.model).toBe('claude-haiku-4-5-20251001');
  });

  it('uses Sonnet for supporter tier', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { model: string };
    expect(createArgs.model).toBe('claude-sonnet-4-6');
  });

  it('uses Sonnet for champion tier', async () => {
    mockTier = 'champion';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { model: string };
    expect(createArgs.model).toBe('claude-sonnet-4-6');
  });

  it('uses Sonnet for deep mode paid request', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    await callRoute(validBody({
      deep: true,
      perBreathSummary: {
        breaths: [{ ned: 10, fi: 0.8, mShape: false, tPeakTi: 0.3, qPeak: 1.0, duration: 4.0 }],
        breathCount: 1,
        sampleRate: 25,
      },
    }));

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { model: string };
    expect(createArgs.model).toBe('claude-sonnet-4-6');
  });
});

describe('Premium AI Quality — Token Budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('uses 1024 max_tokens for community tier', async () => {
    mockTier = 'community';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { max_tokens: number };
    expect(createArgs.max_tokens).toBe(1024);
  });

  it('uses 4096 max_tokens for supporter tier', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { max_tokens: number };
    expect(createArgs.max_tokens).toBe(4096);
  });

  it('uses 4096 max_tokens for champion tier', async () => {
    mockTier = 'champion';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { max_tokens: number };
    expect(createArgs.max_tokens).toBe(4096);
  });
});

describe('Premium AI Quality — System Prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('includes premium insight extension for paid tiers', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { system: string };
    expect(createArgs.system).toContain('6 to 10 clinical insights');
    expect(createArgs.system).toContain('"correlation"');
    expect(createArgs.system).toContain('"temporal"');
  });

  it('does not include premium extension for community tier', async () => {
    mockTier = 'community';
    mockAIResponse([validInsight()]);
    await callRoute(validBody());

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { system: string };
    expect(createArgs.system).not.toContain('6 to 10 clinical insights');
    expect(createArgs.system).not.toContain('"correlation"');
    expect(createArgs.system).not.toContain('"temporal"');
  });

  it('includes deep prompt extension for paid deep requests', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    await callRoute(validBody({
      deep: true,
      perBreathSummary: {
        breaths: [{ ned: 10, fi: 0.8, mShape: false, tPeakTi: 0.3, qPeak: 1.0, duration: 4.0 }],
        breathCount: 1,
        sampleRate: 25,
      },
    }));

    const createArgs = mockMessagesCreate.mock.calls[0]![0] as { system: string };
    expect(createArgs.system).toContain('RERA clustering');
    expect(createArgs.system).toContain('6 to 10 clinical insights');
  });
});

describe('Premium AI Quality — Category Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockTier = 'supporter';
  });

  it('accepts correlation category', async () => {
    mockAIResponse([validInsight({ id: 'ai-corr-1', category: 'correlation' })]);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.insights).toHaveLength(1);
    expect(data.insights[0].category).toBe('correlation');
  });

  it('accepts temporal category', async () => {
    mockAIResponse([validInsight({ id: 'ai-temp-1', category: 'temporal' })]);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.insights).toHaveLength(1);
    expect(data.insights[0].category).toBe('temporal');
  });

  it('still accepts all existing categories', async () => {
    const categories = ['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend'];
    const insights = categories.map((cat, i) =>
      validInsight({ id: `ai-${cat}-${i}`, category: cat })
    );
    mockAIResponse(insights);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.insights).toHaveLength(6);
  });

  it('filters out invalid categories', async () => {
    mockAIResponse([
      validInsight({ id: 'ai-good', category: 'glasgow' }),
      validInsight({ id: 'ai-bad', category: 'invalid_category' }),
    ]);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.insights).toHaveLength(1);
    expect(data.insights[0].id).toBe('ai-good');
  });
});

describe('Premium AI Quality — Response Fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns isDeep: true for deep requests', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    const res = await callRoute(validBody({
      deep: true,
      perBreathSummary: {
        breaths: [{ ned: 10, fi: 0.8, mShape: false, tPeakTi: 0.3, qPeak: 1.0, duration: 4.0 }],
        breathCount: 1,
        sampleRate: 25,
      },
    }));
    const data = await res.json();

    expect(data.isDeep).toBe(true);
  });

  it('returns isDeep: false for non-deep paid requests', async () => {
    mockTier = 'supporter';
    mockAIResponse([validInsight()]);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.isDeep).toBe(false);
  });

  it('returns remainingCredits for community tier', async () => {
    mockTier = 'community';
    // Mock the usage read-back after increment
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tier: 'community' } }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { count: 1 } }),
    });
    mockAIResponse([validInsight()]);
    const res = await callRoute(validBody());
    const data = await res.json();

    expect(data.remainingCredits).toBeDefined();
    expect(typeof data.remainingCredits).toBe('number');
  });
});
