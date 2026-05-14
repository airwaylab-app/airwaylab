import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));

const mockIsLimited = vi.fn(() => false);
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
  RateLimiter: class {
    isLimited(...args: Parameters<typeof mockIsLimited>) { return mockIsLimited(...args); }
  },
}));

const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({ captureException: (...args: unknown[]) => mockCaptureException(...args) }));

const mockDeleteUser = vi.fn();
const mockStorageFrom = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
    auth: { admin: { deleteUser: (...args: unknown[]) => mockDeleteUser(...args) } },
  })),
}));

vi.mock('@/lib/storage/types', () => ({ STORAGE_BUCKET: 'user-files' }));

// ── Helpers ───────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return {
    headers: { get: () => null },
    json: vi.fn().mockRejectedValue(new Error('no body')),
  } as unknown as NextRequest;
}

function mockSuccessfulDeletion() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
  mockStorageFrom.mockReturnValue({ list: vi.fn().mockResolvedValue({ data: [], error: null }) });
  const mockTable = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  mockFrom.mockReturnValue(mockTable);
  mockDeleteUser.mockResolvedValue({ error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('POST /api/delete-user-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLimited.mockReturnValue(false);
  });

  it('returns 200 and deletes all user data including auth user', async () => {
    mockSuccessfulDeletion();

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ deleted: true });
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not logged in' } });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockReturnValue(true);

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
  });

  it('returns 500 and logs structured context when auth user deletion fails', async () => {
    mockSuccessfulDeletion();
    mockDeleteUser.mockResolvedValue({ error: { message: 'User not found', code: '404' } });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to delete account' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found' }),
      expect.objectContaining({ extra: expect.objectContaining({ step: 'delete_auth_user', userId: 'user-123' }) }),
    );
  });

  it('continues and logs to Sentry when a table deletion fails, still deletes auth user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
    mockStorageFrom.mockReturnValue({ list: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const failingTable = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'DB error', code: '500' } }),
    };
    mockFrom.mockReturnValue(failingTable);
    mockDeleteUser.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockCaptureException).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
  });

  it('returns 500 with structured Sentry context on unexpected outer error', async () => {
    mockGetUser.mockRejectedValue({ code: 'network_error', message: undefined });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: { route: 'delete-user-data' },
        extra: expect.objectContaining({ errorName: expect.any(String) }),
      }),
    );
  });

  it('deletes remind_requests by email', async () => {
    mockSuccessfulDeletion();

    const { POST } = await import('@/app/api/delete-user-data/route');
    await POST(makeRequest());

    const calls = mockFrom.mock.calls.map((args: unknown[]) => args[0] as string);
    expect(calls).toContain('remind_requests');
  });

  it('deletes user_nights', async () => {
    mockSuccessfulDeletion();

    const { POST } = await import('@/app/api/delete-user-data/route');
    await POST(makeRequest());

    const calls = mockFrom.mock.calls.map((args: unknown[]) => args[0] as string);
    expect(calls).toContain('user_nights');
  });
});
