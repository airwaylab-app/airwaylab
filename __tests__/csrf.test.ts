import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateOrigin } from '@/lib/csrf';
import { NextRequest } from 'next/server';

function makeRequest(origin: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (origin) headers['origin'] = origin;
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    headers,
  });
}

describe('validateOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when NEXT_PUBLIC_APP_URL is set', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://airwaylab.app';
    });

    it('accepts matching origin', () => {
      expect(validateOrigin(makeRequest('https://airwaylab.app'))).toBe(true);
    });

    it('rejects different origin', () => {
      expect(validateOrigin(makeRequest('https://evil.com'))).toBe(false);
    });

    it('rejects missing origin header', () => {
      expect(validateOrigin(makeRequest(null))).toBe(false);
    });

    it('rejects HTTP when HTTPS is expected', () => {
      expect(validateOrigin(makeRequest('http://airwaylab.app'))).toBe(false);
    });

    it('rejects subdomain mismatch', () => {
      expect(validateOrigin(makeRequest('https://sub.airwaylab.app'))).toBe(false);
    });

    it('handles APP_URL with trailing path', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://airwaylab.app/some/path';
      // Origin header is always just protocol+host, URL.origin strips the path
      expect(validateOrigin(makeRequest('https://airwaylab.app'))).toBe(true);
    });
  });

  describe('when NEXT_PUBLIC_APP_URL is not set (development)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it('accepts localhost origins', () => {
      expect(validateOrigin(makeRequest('http://localhost:3000'))).toBe(true);
    });

    it('accepts 127.0.0.1 origins', () => {
      expect(validateOrigin(makeRequest('http://127.0.0.1:3000'))).toBe(true);
    });

    it('rejects non-localhost origins', () => {
      expect(validateOrigin(makeRequest('https://airwaylab.app'))).toBe(false);
    });

    it('rejects missing origin header', () => {
      expect(validateOrigin(makeRequest(null))).toBe(false);
    });

    it('rejects localhost without port (edge case)', () => {
      // 'http://localhost' doesn't match 'http://localhost:' prefix
      expect(validateOrigin(makeRequest('http://localhost'))).toBe(false);
    });
  });
});
