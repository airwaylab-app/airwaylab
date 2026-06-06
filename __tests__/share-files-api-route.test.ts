import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mock external dependencies before importing routes ──────────

const mockValidateOrigin = vi.fn(() => true);
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}));

const mockIsLimited = vi.fn(() => false);
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
  RateLimiter: class {
    isLimited(...args: Parameters<typeof mockIsLimited>) { return mockIsLimited(...args); }
  },
}));

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const mockGetUser = vi.fn();
const mockStorageFrom = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

// ── Helpers ─────────────────────────────────────────────────────

function makePostRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makePatchRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createChain(result: { data?: unknown; error?: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'single', 'maybeSingle'];
  for (const m of methods) { chain[m] = vi.fn(() => chain); }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

function setupAuth(userId = 'user-abc-123') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mockIsLimited.mockReturnValue(false);
  mockValidateOrigin.mockReturnValue(true);
}

const VALID_SHARE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const MB = 1024 * 1024;

async function callShareFilesPost(req: NextRequest) {
  const { POST } = await import('@/app/api/share/files/route');
  return POST(req);
}

async function callShareFilesPatch(req: NextRequest) {
  const { PATCH } = await import('@/app/api/share/files/route');
  return PATCH(req);
}

// ── Tests ────────────────────────────────────────────────────────

describe('POST /api/share/files (presign)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } });
    const req = makePostRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      files: [{ fileName: 'BRP.edf', fileSize: 10 * MB }],
    });
    const res = await callShareFilesPost(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 with clear message when a file exceeds 200 MB per-file limit', async () => {
    const oversizedBytes = 201 * MB; // 201 MB > 200 MB limit
    const req = makePostRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      files: [{ fileName: 'BRP.edf', fileSize: oversizedBytes }],
    });
    const res = await callShareFilesPost(req);
    const body = await res.json() as { error: string };
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/exceed.*200.*MB/i);
  });

  it('captures a Sentry warning when presign schema validation fails', async () => {
    const req = makePostRequest('/api/share/files', {
      shareId: 'not-a-uuid',
      files: [{ fileName: 'BRP.edf', fileSize: 10 * MB }],
    });
    await callShareFilesPost(req);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'share/files presign validation failed',
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('accepts files up to 200 MB', async () => {
    const shareChain = createChain({
      data: { id: VALID_SHARE_ID, created_by_user_id: 'user-abc-123', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });
    mockFrom.mockReturnValue(shareChain);

    const signedUrlResult = { data: { signedUrl: 'https://storage.example.com/upload' }, error: null };
    const storageChain = { createSignedUploadUrl: vi.fn().mockResolvedValue(signedUrlResult) };
    mockStorageFrom.mockReturnValue(storageChain);

    const req = makePostRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      files: [{ fileName: 'BRP.edf', fileSize: 200 * MB }],
    });
    const res = await callShareFilesPost(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { uploadUrls: unknown[] };
    expect(body.uploadUrls).toHaveLength(1);
  });

  it('returns 400 for invalid shareId (not a UUID)', async () => {
    const req = makePostRequest('/api/share/files', {
      shareId: 'not-a-uuid',
      files: [{ fileName: 'BRP.edf', fileSize: 10 * MB }],
    });
    const res = await callShareFilesPost(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty files array', async () => {
    const req = makePostRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      files: [],
    });
    const res = await callShareFilesPost(req);
    expect(res.status).toBe(400);
  });

  it('returns 413 when total file size exceeds 500 MB', async () => {
    const shareChain = createChain({
      data: { id: VALID_SHARE_ID, created_by_user_id: 'user-abc-123', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    });
    mockFrom.mockReturnValue(shareChain);

    // 3 files each 200 MB = 600 MB total > 500 MB limit
    const req = makePostRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      files: [
        { fileName: 'BRP.edf', fileSize: 200 * MB },
        { fileName: 'STO.edf', fileSize: 200 * MB },
        { fileName: 'BRP2.edf', fileSize: 200 * MB },
      ],
    });
    const res = await callShareFilesPost(req);
    expect(res.status).toBe(413);
  });
});

describe('PATCH /api/share/files (finalise)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } });
    const req = makePatchRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      filePaths: [`${VALID_SHARE_ID}/BRP.edf`],
    });
    const res = await callShareFilesPatch(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid finalise body', async () => {
    const req = makePatchRequest('/api/share/files', {
      shareId: 'not-a-uuid',
      filePaths: [],
    });
    const res = await callShareFilesPatch(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with valid body and owned share', async () => {
    const shareChain = createChain({
      data: { id: VALID_SHARE_ID, created_by_user_id: 'user-abc-123' },
      error: null,
    });
    const updateChain = createChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(shareChain) // lookup share
      .mockReturnValueOnce(updateChain); // update

    const req = makePatchRequest('/api/share/files', {
      shareId: VALID_SHARE_ID,
      filePaths: [`${VALID_SHARE_ID}/BRP.edf`],
    });
    const res = await callShareFilesPatch(req);
    expect(res.status).toBe(200);
  });
});
