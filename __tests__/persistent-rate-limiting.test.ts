import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry before importing rate-limit
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock env to control Upstash availability
vi.mock('@/lib/env', () => ({
  serverEnv: {
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  },
}));

import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

describe('RateLimiter (in-memory fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to in-memory when UPSTASH env vars are missing', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 3 });
    // Should work without Upstash — first request not limited
    const result = await limiter.isLimited('test-key');
    expect(result).toBe(false);
  });

  it('returns true (limited) after max requests', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 2 });
    expect(await limiter.isLimited('key-a')).toBe(false); // 1st
    expect(await limiter.isLimited('key-a')).toBe(false); // 2nd (at max)
    expect(await limiter.isLimited('key-a')).toBe(true);  // 3rd (over max)
  });

  it('does not cross-limit different keys', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
    expect(await limiter.isLimited('key-x')).toBe(false);
    expect(await limiter.isLimited('key-x')).toBe(true);  // key-x limited
    expect(await limiter.isLimited('key-y')).toBe(false);  // key-y not limited
  });
});

describe('getRateLimitKey', () => {
  it('returns IP from X-Forwarded-For header', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRateLimitKey(req)).toBe('1.2.3.4');
  });

  it('returns hashed fallback when no IP header', () => {
    const req = new Request('https://example.com', {
      headers: { 'user-agent': 'TestBot/1.0', 'accept-language': 'en' },
    });
    const key = getRateLimitKey(req);
    expect(key).toMatch(/^anon_[a-z0-9]+$/);
  });

  it('returns consistent hash for same headers', () => {
    const headers = { 'user-agent': 'Bot/2.0', 'accept-language': 'nl' };
    const req1 = new Request('https://example.com', { headers });
    const req2 = new Request('https://example.com', { headers });
    expect(getRateLimitKey(req1)).toBe(getRateLimitKey(req2));
  });
});
