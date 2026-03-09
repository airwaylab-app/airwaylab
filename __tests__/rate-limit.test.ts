import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, max: 3 });
  });

  it('allows requests under the limit', () => {
    expect(limiter.isLimited('ip1')).toBe(false);
    expect(limiter.isLimited('ip1')).toBe(false);
    expect(limiter.isLimited('ip1')).toBe(false);
  });

  it('blocks requests over the limit', () => {
    limiter.isLimited('ip1'); // 1
    limiter.isLimited('ip1'); // 2
    limiter.isLimited('ip1'); // 3
    expect(limiter.isLimited('ip1')).toBe(true); // 4 > max=3
  });

  it('tracks different keys independently', () => {
    limiter.isLimited('ip1');
    limiter.isLimited('ip1');
    limiter.isLimited('ip1');

    // ip2 should still be allowed
    expect(limiter.isLimited('ip2')).toBe(false);
    // ip1 should be blocked
    expect(limiter.isLimited('ip1')).toBe(true);
  });

  it('resets after window expires', () => {
    vi.useFakeTimers();

    limiter.isLimited('ip1');
    limiter.isLimited('ip1');
    limiter.isLimited('ip1');
    expect(limiter.isLimited('ip1')).toBe(true);

    // Advance past the window
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    expect(limiter.isLimited('ip1')).toBe(false);

    vi.useRealTimers();
  });

  it('starts a new window after reset', () => {
    vi.useFakeTimers();

    // Fill the window
    for (let i = 0; i < 4; i++) limiter.isLimited('ip1');

    // Advance past window
    vi.advanceTimersByTime(1001);

    // New window - should allow max requests again
    expect(limiter.isLimited('ip1')).toBe(false);
    expect(limiter.isLimited('ip1')).toBe(false);
    expect(limiter.isLimited('ip1')).toBe(false);
    expect(limiter.isLimited('ip1')).toBe(true);

    vi.useRealTimers();
  });

  it('handles max=1 correctly', () => {
    const strict = new RateLimiter({ windowMs: 1000, max: 1 });
    expect(strict.isLimited('ip1')).toBe(false);
    expect(strict.isLimited('ip1')).toBe(true);
  });
});

describe('getRateLimitKey', () => {
  it('extracts first IP from X-Forwarded-For', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRateLimitKey(request)).toBe('1.2.3.4');
  });

  it('handles single IP in X-Forwarded-For', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getRateLimitKey(request)).toBe('10.0.0.1');
  });

  it('returns "unknown" when no forwarded header', () => {
    const request = new Request('http://localhost');
    expect(getRateLimitKey(request)).toBe('unknown');
  });

  it('trims whitespace from IP', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
    });
    expect(getRateLimitKey(request)).toBe('1.2.3.4');
  });
});
