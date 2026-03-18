import { describe, it, expect } from 'vitest';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';

function mockRequest(contentLength: string | null): { headers: { get: (name: string) => string | null } } {
  return {
    headers: {
      get: (name: string) => (name === 'content-length' ? contentLength : null),
    },
  };
}

describe('exceedsPayloadLimit', () => {
  const MAX = 1_000_000; // 1 MB

  it('returns false when Content-Length header is absent', () => {
    expect(exceedsPayloadLimit(mockRequest(null) as never, MAX)).toBe(false);
  });

  it('returns false when Content-Length is within limit', () => {
    expect(exceedsPayloadLimit(mockRequest('500000') as never, MAX)).toBe(false);
  });

  it('returns false when Content-Length equals limit exactly', () => {
    expect(exceedsPayloadLimit(mockRequest('1000000') as never, MAX)).toBe(false);
  });

  it('returns true when Content-Length exceeds limit', () => {
    expect(exceedsPayloadLimit(mockRequest('1000001') as never, MAX)).toBe(true);
  });

  it('returns false for malformed Content-Length (NaN bypass)', () => {
    // This is the bug we are fixing: parseInt("100, 200") returns 100
    // but Number("100, 200") returns NaN, which correctly fails the check
    expect(exceedsPayloadLimit(mockRequest('100, 200') as never, MAX)).toBe(false);
  });

  it('returns false for empty string Content-Length', () => {
    expect(exceedsPayloadLimit(mockRequest('') as never, MAX)).toBe(false);
  });

  it('returns false for non-numeric Content-Length', () => {
    expect(exceedsPayloadLimit(mockRequest('abc') as never, MAX)).toBe(false);
  });

  it('returns false for zero Content-Length', () => {
    expect(exceedsPayloadLimit(mockRequest('0') as never, MAX)).toBe(false);
  });

  it('returns false for negative Content-Length', () => {
    expect(exceedsPayloadLimit(mockRequest('-500') as never, MAX)).toBe(false);
  });
});
