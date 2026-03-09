import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.isLimited('user1')).toBe(false); // 1
    expect(limiter.isLimited('user1')).toBe(false); // 2
    expect(limiter.isLimited('user1')).toBe(false); // 3
  });

  it('blocks requests exceeding the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 2 });
    limiter.isLimited('user1'); // 1
    limiter.isLimited('user1'); // 2
    expect(limiter.isLimited('user1')).toBe(true); // 3 → blocked
  });

  it('resets after the time window', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.isLimited('user1')).toBe(false); // 1
    expect(limiter.isLimited('user1')).toBe(true);  // blocked

    vi.advanceTimersByTime(60_001);
    expect(limiter.isLimited('user1')).toBe(false); // new window
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.isLimited('user1')).toBe(false);
    expect(limiter.isLimited('user2')).toBe(false);
    expect(limiter.isLimited('user1')).toBe(true);
    expect(limiter.isLimited('user2')).toBe(true);
  });
});

describe('getRateLimitKey', () => {
  it('extracts IP from X-Forwarded-For header', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRateLimitKey(req)).toBe('1.2.3.4');
  });

  it('returns "unknown" when no forwarded header', () => {
    const req = new Request('https://example.com');
    expect(getRateLimitKey(req)).toBe('unknown');
  });

  it('trims whitespace from IP', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' },
    });
    expect(getRateLimitKey(req)).toBe('10.0.0.1');
  });
});
