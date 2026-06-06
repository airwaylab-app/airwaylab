import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock CSRF
const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}));

// Mock rate limiting
const mockIsLimited = vi.fn(() => false);
vi.mock('@/lib/rate-limit', () => ({
  getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
  RateLimiter: class {
    isLimited(...args: Parameters<typeof mockIsLimited>) { return mockIsLimited(...args); }
  },
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock captureApiError
const mockCaptureApiError = vi.fn();
vi.mock('@/lib/sentry-utils', () => ({
  captureApiError: (...args: unknown[]) => mockCaptureApiError(...args),
}));

// Mock Supabase server clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  })),
}));

// Mock storage consent
vi.mock('@/lib/storage/quota', () => ({
  hasStorageConsent: vi.fn(() => Promise.resolve(true)),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/files/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function setupAuthenticatedUser(userId = 'user-abc') {
  mockValidateOrigin.mockReturnValue(true);
  mockIsLimited.mockReturnValue(false);
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  });
}

async function callPresign(req: NextRequest) {
  const { POST } = await import('@/app/api/files/presign/route');
  return POST(req);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Presign validation error logging', () => {
  it('fires captureApiError with field detail when fileHash is wrong length', async () => {
    setupAuthenticatedUser();
    const res = await callPresign(makePostRequest({
      filePath: 'DATALOG/20260101/BRP.edf',
      fileName: 'BRP.edf',
      fileSize: 1024,
      fileHash: 'tooshort',
      nightDate: '2026-01-01',
    }));
    expect(res.status).toBe(400);
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Presign validation:') }),
      expect.objectContaining({ route: 'files/presign', context: 'validation', userId: 'user-abc' })
    );
  });

  it('fires captureApiError with field detail when required field is missing', async () => {
    setupAuthenticatedUser();
    const res = await callPresign(makePostRequest({
      // fileName missing, fileHash wrong, etc.
      filePath: 'DATALOG/20260101/BRP.edf',
    }));
    expect(res.status).toBe(400);
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Presign validation:') }),
      expect.objectContaining({ route: 'files/presign', context: 'validation' })
    );
  });

  it('fires captureApiError when nightDate is an invalid calendar date', async () => {
    setupAuthenticatedUser();
    const res = await callPresign(makePostRequest({
      filePath: 'DATALOG/20260101/BRP.edf',
      fileName: 'BRP.edf',
      fileSize: 1024,
      fileHash: 'a'.repeat(64),
      nightDate: '2026-15-04', // month 15 is invalid
    }));
    expect(res.status).toBe(400);
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Presign validation:') }),
      expect.objectContaining({ route: 'files/presign', context: 'validation' })
    );
  });

  it('does NOT fire captureApiError for a valid request body', async () => {
    setupAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'limit'];
    for (const m of methods) chain[m] = vi.fn(() => chain);
    chain.single = vi.fn(() => Promise.resolve({ data: { id: 'file-1' }, error: null }));
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/upload?token=abc', token: 'abc' },
        error: null,
      }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const res = await callPresign(makePostRequest({
      filePath: 'DATALOG/20260101/BRP.edf',
      fileName: 'BRP.edf',
      fileSize: 1024,
      fileHash: 'a'.repeat(64),
      nightDate: '2026-01-01',
    }));
    expect(res.status).toBe(200);
    expect(mockCaptureApiError).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Presign validation:') }),
      expect.anything()
    );
  });
});
