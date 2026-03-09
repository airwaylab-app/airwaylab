import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();
const mockAiUsageSelect = vi.fn();
const mockAiUsageUpsert = vi.fn();
const mockAiUsageUpdate = vi.fn();
const mockAiUsageInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSelect,
            }),
          }),
        };
      }
      return {};
    },
  }),
  getSupabaseServiceRole: () => ({
    from: (table: string) => {
      if (table === 'ai_usage') {
        return {
          select: () => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockAiUsageSelect,
              }),
            }),
          }),
          upsert: mockAiUsageUpsert,
          update: () => ({
            eq: vi.fn().mockReturnValue({
              eq: mockAiUsageUpdate,
            }),
          }),
          insert: mockAiUsageInsert,
        };
      }
      return {};
    },
  }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  const AnthropicMock = function () {
    return { messages: { create: mockMessagesCreate } };
  };
  return { default: AnthropicMock };
});

vi.mock('@/lib/csrf', () => ({
  validateOrigin: () => true,
}));

vi.mock('@/lib/rate-limit', () => ({
  aiRateLimiter: { isLimited: () => false },
  getRateLimitKey: () => '127.0.0.1',
}));

process.env.ANTHROPIC_API_KEY = 'sk-ant-test-fake';

// Valid request body matching the Zod schema
const validBody = {
  nights: [{
    dateStr: '2025-01-15',
    durationHours: 7.5,
    sessionCount: 1,
    settings: { mode: 'CPAP', pressure: 10 },
    glasgow: { overall: 1.8, components: {} },
    wat: { flScore: 32, regularity: 0.7 },
    ned: { nedMean: 19.5, reraIndex: 2.1 },
    oximetry: { odi3: 4.2, meanSpO2: 95.1 },
  }],
  selectedNightIndex: 0,
  therapyChangeDate: null,
};

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    headers: {
      get: () => 'http://localhost:3000',
    },
  };
}

describe('AI Insights — Usage Limits', () => {
  let POST: (req: unknown) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-fake';

    const mod = await import('@/app/api/ai-insights/route');
    POST = mod.POST as unknown as (req: unknown) => Promise<Response>;
  });

  it('returns 401 for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when community user exceeds 3/month limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-free' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'community' }, error: null });
    mockAiUsageSelect.mockResolvedValue({ data: { count: 3 }, error: null });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('limit reached');
  });

  it('allows community user with 2/3 usage to proceed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-free' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'community' }, error: null });
    mockAiUsageSelect.mockResolvedValue({ data: { count: 2 }, error: null });
    mockAiUsageUpsert.mockResolvedValue({ error: null });

    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([{
          id: 'ai-test-1',
          type: 'info',
          title: 'Test insight',
          body: 'This is a test.',
          category: 'glasgow',
        }]),
      }],
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.insights).toHaveLength(1);
    expect(json.source).toBe('ai');
  });

  it('allows supporter tier unlimited access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-paid' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'supporter' }, error: null });
    // Should NOT check ai_usage for paid users
    mockAiUsageUpsert.mockResolvedValue({ error: null });

    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([{
          id: 'ai-test-2',
          type: 'positive',
          title: 'Great night',
          body: 'Well controlled therapy.',
          category: 'therapy',
        }]),
      }],
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    // ai_usage select should NOT have been called (it's only for community)
    expect(mockAiUsageSelect).not.toHaveBeenCalled();
  });

  it('allows champion tier unlimited access', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-champ' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'champion' }, error: null });
    mockAiUsageUpsert.mockResolvedValue({ error: null });

    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([{
          id: 'ai-test-3',
          type: 'actionable',
          title: 'Consider settings change',
          body: 'Discuss with your clinician.',
          category: 'therapy',
        }]),
      }],
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockAiUsageSelect).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid request body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'supporter' }, error: null });

    const res = await POST(makeRequest({ nights: [], selectedNightIndex: 0 }));
    expect(res.status).toBe(400);
  });

  it('increments usage counter after successful analysis', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-inc' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { tier: 'community' }, error: null });
    mockAiUsageSelect.mockResolvedValue({ data: { count: 0 }, error: null });
    mockAiUsageUpsert.mockResolvedValue({ error: null });

    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([{
          id: 'ai-test-inc',
          type: 'info',
          title: 'Test',
          body: 'Test body.',
          category: 'trend',
        }]),
      }],
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    // Verify upsert was called to increment the counter
    expect(mockAiUsageUpsert).toHaveBeenCalled();
  });
});
