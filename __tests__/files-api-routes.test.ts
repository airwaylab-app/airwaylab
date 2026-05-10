import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mock external dependencies before importing routes ──────────

// Mock CSRF
const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}));

// Mock rate limiting
const mockIsLimited = vi.fn(() => false);
vi.mock('@/lib/rate-limit', () => {
  const mockLimiter = { isLimited: (...args: Parameters<typeof mockIsLimited>) => mockIsLimited(...args) };
  return {
    stripeRateLimiter: mockLimiter,
    aiRateLimiter: mockLimiter,
    aiPremiumRateLimiter: mockLimiter,
    getRateLimitKey: vi.fn(() => '127.0.0.1'),
    getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
    RateLimiter: class {
      isLimited(...args: Parameters<typeof mockIsLimited>) { return mockIsLimited(...args); }
    },
  };
});

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock sentry-utils
vi.mock('@/lib/sentry-utils', () => ({
  captureApiError: vi.fn(),
}));

// Mock Supabase server clients
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
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

// Mock storage quota helpers
const mockHasStorageConsent = vi.fn();
const mockGetUserTier = vi.fn();
const mockGetStorageUsage = vi.fn();

vi.mock('@/lib/storage/quota', () => ({
  hasStorageConsent: (...args: unknown[]) => mockHasStorageConsent(...args),
  getUserTier: (...args: unknown[]) => mockGetUserTier(...args),
  getStorageUsage: (...args: unknown[]) => mockGetStorageUsage(...args),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Flexible Supabase chain builder.
 * All chainable methods return the chain. Terminal methods resolve to the result.
 */
function createChain(result: { data?: unknown; error?: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = ['from', 'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'limit', 'neq', 'lt', 'gte', 'is', 'order', 'or'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal methods return the result as a promise
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Make the chain itself thenable for queries that don't end with single/maybeSingle
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

function makePostRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makeGetRequest(path: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost:3000${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const req = new Request(url.toString(), {
    method: 'GET',
    headers: {
      origin: 'http://localhost:3000',
      'x-forwarded-for': '127.0.0.1',
    },
  }) as unknown as NextRequest;
  // NextRequest has nextUrl with searchParams
  Object.defineProperty(req, 'nextUrl', { value: url, writable: false });
  return req;
}

function setupAuthenticatedUser(userId = 'user-123') {
  mockValidateOrigin.mockReturnValue(true);
  mockIsLimited.mockReturnValue(false);
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  });
}

function setupAuthFailure() {
  mockValidateOrigin.mockReturnValue(true);
  mockIsLimited.mockReturnValue(false);
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

// ── Route helpers (lazy import after mocks) ─────────────────────

async function callPresign(req: NextRequest) {
  const { POST } = await import('@/app/api/files/presign/route');
  return POST(req);
}
async function callConfirm(req: NextRequest) {
  const { POST } = await import('@/app/api/files/confirm/route');
  return POST(req);
}
async function callDownload(req: NextRequest) {
  const { GET } = await import('@/app/api/files/download/route');
  return GET(req);
}
async function callDelete(req: NextRequest) {
  const { POST } = await import('@/app/api/files/delete/route');
  return POST(req);
}
async function callList(req: NextRequest) {
  const { GET } = await import('@/app/api/files/list/route');
  return GET(req);
}
async function callConsentGet(req: NextRequest) {
  const { GET } = await import('@/app/api/files/consent/route');
  return GET(req);
}
async function callConsentPost(req: NextRequest) {
  const { POST } = await import('@/app/api/files/consent/route');
  return POST(req);
}
async function callUsage(req: NextRequest) {
  const { GET } = await import('@/app/api/files/usage/route');
  return GET(req);
}
async function callCheckHashes(req: NextRequest) {
  const { POST } = await import('@/app/api/files/check-hashes/route');
  return POST(req);
}

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Presign ─────────────────────────────────────────────────────

describe('POST /api/files/presign', () => {
  const validBody = {
    filePath: 'DATALOG/20260101/BRP.edf',
    fileName: 'BRP.edf',
    fileSize: 1024,
    fileHash: 'a'.repeat(64),
    nightDate: '2026-01-01',
  };

  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('origin');
  });

  it('returns 429 when rate limited', async () => {
    // Rate limit check happens after auth, so we need an authenticated user
    setupAuthenticatedUser();
    mockIsLimited.mockReturnValue(true);
    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(429);
  });

  it('returns 403 when storage consent not granted', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(false);
    // Chain for the dedup check is not reached because consent check is first
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('consent');
  });

  it('returns 400 for path traversal in fileName', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callPresign(makePostRequest('/api/files/presign', {
      ...validBody,
      fileName: '../../../etc/passwd',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid file name');
  });

  it('returns 400 for path traversal in filePath', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callPresign(makePostRequest('/api/files/presign', {
      ...validBody,
      filePath: '../../secrets/key',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid file path');
  });

  it('returns signed URL on valid presign request', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);

    // Dedup check returns no existing file
    const chain = createChain({ data: null, error: null });
    // Insert returns a file row with id
    chain.insert = vi.fn(() => {
      const insertChain = createChain({ data: { id: 'file-uuid-1' }, error: null });
      return insertChain;
    });
    mockFrom.mockReturnValue(chain);

    // Storage createSignedUploadUrl
    mockStorageFrom.mockReturnValue({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/upload?token=abc', token: 'abc' },
        error: null,
      }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uploadUrl).toBeDefined();
    expect(body.fileId).toBe('file-uuid-1');
    expect(body.storagePath).toContain('user-123');
  });

  it('returns 400 for invalid request body', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callPresign(makePostRequest('/api/files/presign', {
      // Missing required fields
      filePath: 'test',
    }));
    expect(res.status).toBe(400);
  });

  it('returns skipped and does NOT delete confirmed metadata when storage list errors during dedup', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);

    const existingFile = {
      id: 'existing-id',
      storage_path: 'user-123/2026-01-01/BRP.edf',
      upload_confirmed: true,
      uploaded_at: new Date().toISOString(),
    };
    const deleteMock = vi.fn(() => chain);
    const chain = createChain({ data: existingFile, error: null });
    chain.delete = deleteMock;
    mockFrom.mockReturnValue(chain);

    // Storage list fails with an error — must trust DB, not delete the row
    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage unavailable' } }),
    });

    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.fileId).toBe('existing-id');
    // Confirmed metadata must NOT be deleted
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('skips upload when file hash already exists and is confirmed', async () => {
    setupAuthenticatedUser();
    mockHasStorageConsent.mockResolvedValue(true);

    const existingFile = {
      id: 'existing-id',
      storage_path: 'user-123/2026-01-01/BRP.edf',
      upload_confirmed: true,
      uploaded_at: new Date().toISOString(),
    };
    const chain = createChain({ data: existingFile, error: null });
    mockFrom.mockReturnValue(chain);

    // Storage list returns the file (it exists)
    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'BRP.edf' }],
        error: null,
      }),
    });

    const res = await callPresign(makePostRequest('/api/files/presign', validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(body.fileId).toBe('existing-id');
  });
});

// ── Confirm ─────────────────────────────────────────────────────

describe('POST /api/files/confirm', () => {
  const validBody = { fileId: '550e8400-e29b-41d4-a716-446655440000' };

  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(429);
  });

  it('returns 404 when file not found', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(chain);

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(404);
  });

  it('returns 404 and cleans up when file not in storage', async () => {
    setupAuthenticatedUser();
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123' },
      error: null,
    });
    // delete().eq() for cleanup
    chain.delete = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    // Storage list returns empty (file not in storage)
    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found in storage');
  });

  it('confirms upload when file exists in storage', async () => {
    setupAuthenticatedUser();
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123' },
      error: null,
    });
    chain.update = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    // Storage list returns the file
    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [{ name: 'BRP.edf' }], error: null }),
    });

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmed).toBe(true);
  });

  it('returns 500 when metadata update fails after storage verification', async () => {
    setupAuthenticatedUser();
    const { captureApiError } = await import('@/lib/sentry-utils');
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123' },
      error: null,
    });
    // update().eq() resolves with an error
    const updateChain = { eq: vi.fn(() => Promise.resolve({ error: { message: 'DB write failed', code: '57P01' } })) };
    chain.update = vi.fn(() => updateChain);
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [{ name: 'BRP.edf' }], error: null }),
    });

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('confirm');
    expect(captureApiError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'DB write failed' }),
      expect.objectContaining({ context: 'metadata_update' })
    );
  });

  it('captures Sentry event when file is absent from storage at confirm step', async () => {
    setupAuthenticatedUser();
    const { captureApiError } = await import('@/lib/sentry-utils');
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123' },
      error: null,
    });
    chain.delete = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(404);
    expect(captureApiError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ context: 'storage_list_empty', fileId: validBody.fileId })
    );
  });

  it('returns 503 and does NOT delete metadata when storage list errors', async () => {
    setupAuthenticatedUser();
    const deleteMock = vi.fn(() => chain);
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123' },
      error: null,
    });
    chain.delete = deleteMock;
    mockFrom.mockReturnValue(chain);

    // Storage list fails with an error
    mockStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage unavailable' } }),
    });

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain('unavailable');
    // Metadata must NOT be deleted
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('returns 403 when file belongs to another user', async () => {
    setupAuthenticatedUser('user-123');
    const chain = createChain({
      data: { id: validBody.fileId, storage_path: 'other-user/2026-01-01/BRP.edf', user_id: 'other-user' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await callConfirm(makePostRequest('/api/files/confirm', validBody));
    expect(res.status).toBe(403);
  });
});

// ── Download ────────────────────────────────────────────────────

describe('GET /api/files/download', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callDownload(makeGetRequest('/api/files/download', { id: 'file-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callDownload(makeGetRequest('/api/files/download', { id: 'file-1' }));
    expect(res.status).toBe(429);
  });

  it('returns 400 when missing file ID', async () => {
    setupAuthenticatedUser();
    const res = await callDownload(makeGetRequest('/api/files/download'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing file ID');
  });

  it('returns 404 when file not found', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(chain);

    const res = await callDownload(makeGetRequest('/api/files/download', { id: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when file belongs to another user', async () => {
    setupAuthenticatedUser('user-123');
    const chain = createChain({
      data: { storage_path: 'other-user/2026-01-01/BRP.edf', user_id: 'other-user', file_name: 'BRP.edf' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await callDownload(makeGetRequest('/api/files/download', { id: 'file-1' }));
    expect(res.status).toBe(403);
  });

  it('returns signed URL for valid download', async () => {
    setupAuthenticatedUser();
    const chain = createChain({
      data: { storage_path: 'user-123/2026-01-01/BRP.edf', user_id: 'user-123', file_name: 'BRP.edf' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/download?token=xyz' },
        error: null,
      }),
    });

    const res = await callDownload(makeGetRequest('/api/files/download', { id: 'file-1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeDefined();
    expect(body.fileName).toBe('BRP.edf');
  });
});

// ── Delete ──────────────────────────────────────────────────────

describe('POST /api/files/delete', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callDelete(makePostRequest('/api/files/delete', { fileIds: ['id-1'] }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await callDelete(makePostRequest('/api/files/delete', { fileIds: ['id-1'] }));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callDelete(makePostRequest('/api/files/delete', { fileIds: ['id-1'] }));
    expect(res.status).toBe(429);
  });

  it('deletes files by fileIds', async () => {
    setupAuthenticatedUser();
    const files = [
      { id: 'id-1', storage_path: 'user-123/2026-01-01/BRP.edf' },
      { id: 'id-2', storage_path: 'user-123/2026-01-01/EVE.edf' },
    ];
    const chain = createChain({ data: files, error: null });
    chain.delete = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    const uuids = ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'];
    const res = await callDelete(makePostRequest('/api/files/delete', { fileIds: uuids }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(2);
  });

  it('deletes files by nightDate', async () => {
    setupAuthenticatedUser();
    const files = [{ id: 'id-1', storage_path: 'user-123/2026-01-01/BRP.edf' }];
    const chain = createChain({ data: files, error: null });
    chain.delete = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    const res = await callDelete(makePostRequest('/api/files/delete', { nightDate: '2026-01-01' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(1);
  });

  it('deletes all files with deleteAll', async () => {
    setupAuthenticatedUser();
    const files = [
      { id: 'id-1', storage_path: 'user-123/2026-01-01/BRP.edf' },
      { id: 'id-2', storage_path: 'user-123/2026-01-02/BRP.edf' },
    ];
    const chain = createChain({ data: files, error: null });
    chain.delete = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    mockStorageFrom.mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });

    const res = await callDelete(makePostRequest('/api/files/delete', { deleteAll: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(2);
  });

  it('returns deleted: 0 when no files match', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callDelete(makePostRequest('/api/files/delete', { deleteAll: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(0);
  });
});

// ── List ────────────────────────────────────────────────────────

describe('GET /api/files/list', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callList(makeGetRequest('/api/files/list'));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callList(makeGetRequest('/api/files/list'));
    expect(res.status).toBe(429);
  });

  it('returns files for authenticated user', async () => {
    setupAuthenticatedUser();
    const fileData = [
      {
        id: 'f1',
        night_date: '2026-01-01',
        file_path: 'DATALOG/20260101/BRP.edf',
        storage_path: 'user-123/2026-01-01/BRP.edf',
        file_name: 'BRP.edf',
        file_size: 1024,
        file_hash: 'a'.repeat(64),
        is_supported: true,
        uploaded_at: '2026-01-02T00:00:00Z',
      },
    ];
    const chain = createChain({ data: fileData, error: null });
    mockFrom.mockReturnValue(chain);

    mockGetUserTier.mockResolvedValue('community');
    mockGetStorageUsage.mockResolvedValue({
      totalBytes: 1024,
      fileCount: 1,
      quotaBytes: Number.MAX_SAFE_INTEGER,
      remainingBytes: Number.MAX_SAFE_INTEGER - 1024,
      isQuotaExceeded: false,
    });

    const res = await callList(makeGetRequest('/api/files/list'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toHaveLength(1);
    expect(body.files[0].fileName).toBe('BRP.edf');
    expect(body.usage).toBeDefined();
    expect(body.usage.fileCount).toBe(1);
  });

  it('returns 400 for invalid nightDate format', async () => {
    setupAuthenticatedUser();
    const res = await callList(makeGetRequest('/api/files/list', { nightDate: 'not-a-date' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid date');
  });
});

// ── Consent ─────────────────────────────────────────────────────

describe('GET /api/files/consent', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callConsentGet(makeGetRequest('/api/files/consent'));
    expect(res.status).toBe(401);
  });

  it('returns current consent state', async () => {
    setupAuthenticatedUser();
    const chain = createChain({
      data: { storage_consent: true, storage_consent_at: '2026-01-01T00:00:00Z' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await callConsentGet(makeGetRequest('/api/files/consent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consent).toBe(true);
    expect(body.consentAt).toBe('2026-01-01T00:00:00Z');
  });

  it('returns false consent when no profile data', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await callConsentGet(makeGetRequest('/api/files/consent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consent).toBe(false);
    expect(body.consentAt).toBeNull();
  });
});

describe('POST /api/files/consent', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callConsentPost(makePostRequest('/api/files/consent', { consent: true }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await callConsentPost(makePostRequest('/api/files/consent', { consent: true }));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callConsentPost(makePostRequest('/api/files/consent', { consent: true }));
    expect(res.status).toBe(429);
  });

  it('sets consent to true', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: null, error: null });
    chain.update = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const res = await callConsentPost(makePostRequest('/api/files/consent', { consent: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consent).toBe(true);
  });

  it('sets consent to false', async () => {
    setupAuthenticatedUser();
    const chain = createChain({ data: null, error: null });
    chain.update = vi.fn(() => chain);
    mockFrom.mockReturnValue(chain);

    const res = await callConsentPost(makePostRequest('/api/files/consent', { consent: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consent).toBe(false);
  });
});

// ── Usage ───────────────────────────────────────────────────────

describe('GET /api/files/usage', () => {
  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callUsage(makeGetRequest('/api/files/usage'));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callUsage(makeGetRequest('/api/files/usage'));
    expect(res.status).toBe(429);
  });

  it('returns usage stats', async () => {
    setupAuthenticatedUser();
    const usageData = {
      totalBytes: 5000,
      fileCount: 10,
      quotaBytes: Number.MAX_SAFE_INTEGER,
      remainingBytes: Number.MAX_SAFE_INTEGER - 5000,
      isQuotaExceeded: false,
    };
    mockGetUserTier.mockResolvedValue('community');
    mockGetStorageUsage.mockResolvedValue(usageData);

    const res = await callUsage(makeGetRequest('/api/files/usage'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalBytes).toBe(5000);
    expect(body.fileCount).toBe(10);
    expect(body.isQuotaExceeded).toBe(false);
  });
});

// ── Check Hashes ────────────────────────────────────────────────

describe('POST /api/files/check-hashes', () => {
  const validBody = {
    hashes: [
      { filePath: 'DATALOG/20260101/BRP.edf', fileHash: 'a'.repeat(64) },
      { filePath: 'DATALOG/20260101/EVE.edf', fileHash: 'b'.repeat(64) },
    ],
  };

  it('returns 401 when not authenticated', async () => {
    setupAuthFailure();
    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', validBody));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(true);
    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', validBody));
    expect(res.status).toBe(429);
  });

  it('returns existing hashes', async () => {
    setupAuthenticatedUser();
    // Supabase returns one matching file
    const chain = createChain({
      data: [{ file_hash: 'a'.repeat(64), file_path: 'DATALOG/20260101/BRP.edf' }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.existing).toContain('a'.repeat(64));
    expect(body.existing).not.toContain('b'.repeat(64));
  });

  it('handles empty input', async () => {
    setupAuthenticatedUser();
    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', { hashes: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.existing).toEqual([]);
  });

  it('returns 400 for invalid request body', async () => {
    setupAuthenticatedUser();
    const res = await callCheckHashes(makePostRequest('/api/files/check-hashes', {
      hashes: [{ filePath: 'test', fileHash: 'too-short' }],
    }));
    expect(res.status).toBe(400);
  });
});
