import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock NextRequest since it's a Next.js server class
// validateOrigin just reads headers and env vars, so we can test with a thin mock

describe('validateOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeRequest(origin: string | null): { headers: { get: (name: string) => string | null } } {
    return {
      headers: {
        get: (name: string) => (name === 'origin' ? origin : null),
      },
    };
  }

  async function getValidateOrigin() {
    const mod = await import('@/lib/csrf');
    return mod.validateOrigin;
  }

  it('rejects requests with no origin header', async () => {
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest(null) as any)).toBe(false);
  });

  it('accepts localhost origin when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest('http://localhost:3000') as any)).toBe(true);
  });

  it('accepts 127.0.0.1 origin when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest('http://127.0.0.1:3000') as any)).toBe(true);
  });

  it('rejects foreign origin when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest('https://evil.com') as any)).toBe(false);
  });

  it('accepts matching origin when NEXT_PUBLIC_APP_URL is set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://airwaylab.app';
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest('https://airwaylab.app') as any)).toBe(true);
  });

  it('rejects non-matching origin when NEXT_PUBLIC_APP_URL is set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://airwaylab.app';
    const validateOrigin = await getValidateOrigin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateOrigin(makeRequest('https://evil.com') as any)).toBe(false);
  });
});
