import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoist mocks that are used in vi.mock factories
const { mockValidateOrigin, mockIsLimited, mockAuthGetUser, mockServerFrom, mockAdminFrom, mockMessagesCreate } = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-123';

  return {
    mockValidateOrigin: vi.fn((_req?: unknown) => true),
    mockIsLimited: vi.fn((_key?: unknown) => false),
    mockAuthGetUser: vi.fn(),
    mockServerFrom: vi.fn(),
    mockAdminFrom: vi.fn(),
    mockMessagesCreate: vi.fn(),
  };
});

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Mock CSRF
vi.mock('@/lib/csrf', () => ({
  validateOrigin: mockValidateOrigin,
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  aiRateLimiter: { isLimited: mockIsLimited },
  getRateLimitKey: vi.fn(() => '1.2.3.4'),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    auth: { getUser: mockAuthGetUser },
    from: mockServerFrom,
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockMessagesCreate };
  }
  return { default: MockAnthropic };
});

import { POST } from '@/app/api/ai-insights/route';
import * as Sentry from '@sentry/nextjs';

function makeValidBody() {
  return {
    nights: [{
      dateStr: '2025-01-15',
      durationHours: 7.5,
      sessionCount: 1,
      settings: { epap: 10, ipap: 15, pressureSupport: 5, papMode: 'APAP', deviceModel: 'AirSense 11' },
      glasgow: { overall: 2.1 },
      wat: { flScore: 35 },
      ned: { nedMean: 0.4 },
      oximetry: null,
    }],
    selectedNightIndex: 0,
    therapyChangeDate: null,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/ai-insights', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'origin': 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai-insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(false);
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user_123', email: 'test@example.com' } },
      error: null,
    });
    // Default: supporter tier (no AI limit)
    mockServerFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { tier: 'supporter' },
          })),
        })),
      })),
    });
    // Default: admin operations succeed
    mockAdminFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null })),
          })),
        })),
      })),
      upsert: vi.fn(() => ({ error: null })),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    });
  });

  it('returns 403 when CSRF check fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockReturnValue(true);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(429);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' },
    });
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
  });

  it('returns 403 when community user exceeds AI limit', async () => {
    // Set user as community tier
    mockServerFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { tier: 'community' },
          })),
        })),
      })),
    });

    // AI usage at limit
    mockAdminFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: { count: 3 } })),
          })),
        })),
      })),
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Monthly AI analysis limit');
  });

  it('returns 400 for invalid request body', async () => {
    const res = await POST(makeRequest({ nights: 'not-array' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when nights array is empty', async () => {
    const res = await POST(makeRequest({
      nights: [],
      selectedNightIndex: 0,
      therapyChangeDate: null,
    }));
    expect(res.status).toBe(400);
  });

  it('returns 502 when AI returns no text block', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(502);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'AI insights returned no text block',
      expect.any(Object)
    );
  });

  it('returns 502 when AI returns unparseable JSON', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON at all' }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(502);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'AI insights returned unparseable JSON',
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('returns 502 when AI returns non-array JSON', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"not": "an array"}' }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(502);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'AI insights returned non-array response',
      expect.any(Object)
    );
  });

  it('returns 502 when Anthropic API throws', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('API overloaded'));

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(502);
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('filters out invalid insights from AI response', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          {
            id: 'ai-valid',
            type: 'positive',
            title: 'Good result',
            body: 'Your Glasgow index is improving.',
            category: 'glasgow',
          },
          {
            id: 'ai-bad-type',
            type: 'INVALID',
            title: 'Bad type',
            body: 'This should be filtered.',
            category: 'glasgow',
          },
          {
            id: 123, // Not a string
            type: 'info',
            title: 'Bad ID',
            body: 'This should be filtered.',
            category: 'ned',
          },
        ]),
      }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(1);
    expect(body.insights[0].id).toBe('ai-valid');
    expect(body.source).toBe('ai');
  });

  it('returns valid insights successfully', async () => {
    const validInsights = [
      {
        id: 'ai-test-1',
        type: 'actionable',
        title: 'Consider pressure adjustment',
        body: 'Your NED shows increasing trend. Discuss with your clinician.',
        category: 'ned',
      },
    ];

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validInsights) }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(1);
    expect(body.source).toBe('ai');
  });
});
