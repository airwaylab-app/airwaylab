/**
 * Tests for /api/auth/ensure-profile (AIR-1762).
 *
 * This route repairs missing profile rows for authenticated users with
 * existing sessions — the gap not covered by the auth callback upsert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  captureException: vi.fn(),
}));

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(async () => ({
    auth: { getUser: () => mockGetUser() },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (_table: string) => ({ upsert: mockUpsert }),
  })),
}));

const mockUpsert = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/auth/ensure-profile (AIR-1762)', () => {
  it('returns 200 and upserts the profile for an authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com' } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    const res = await POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-abc', email: 'test@example.com', storage_consent: true }),
      expect.objectContaining({ onConflict: 'id', ignoreDuplicates: true })
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns 500 and reports to Sentry when upsert fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com' } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: { message: 'DB connection lost' } });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    const res = await POST();

    expect(res.status).toBe(500);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'ensure-profile: upsert failed',
      expect.objectContaining({ level: 'error', tags: expect.objectContaining({ route: 'ensure-profile' }) })
    );
  });

  it('uses empty string when user.email is null', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-no-email', email: null } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    await POST();

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-no-email', email: '' }),
      expect.any(Object)
    );
  });

  it('reports to Sentry with info level on successful repair', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com' } },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/auth/ensure-profile/route');
    await POST();

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'ensure-profile: repaired missing profile row',
      expect.objectContaining({ level: 'info' })
    );
  });
});
