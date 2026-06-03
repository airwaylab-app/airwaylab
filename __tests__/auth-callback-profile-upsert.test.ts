/**
 * Tests for the auth callback profile upsert fallback (AIR-1762).
 *
 * The auth/callback route must ensure a profile row exists after a
 * successful code exchange, even when the DB trigger (handle_new_user)
 * failed to fire (PKCE cross-context, transient DB error, etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: (code: string) => mockExchangeCodeForSession(code),
      getUser: () => mockGetUser(),
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

const mockUpsert = vi.fn();
const mockAdminFrom = vi.fn((_table: string) => ({ upsert: mockUpsert }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (table: string) => mockAdminFrom(table),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth/callback: profile upsert fallback (AIR-1762)', () => {
  it('calls profile upsert with service role client on successful code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com', created_at: new Date().toISOString() } },
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { GET } = await import('@/app/auth/callback/route');
    await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    expect(mockAdminFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-abc',
        email: 'test@example.com',
        storage_consent: true,
      }),
      expect.objectContaining({ onConflict: 'id', ignoreDuplicates: true })
    );
  });

  it('does NOT block the redirect when profile upsert fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com', created_at: new Date().toISOString() } },
    });
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });

    const { GET } = await import('@/app/auth/callback/route');
    const res = await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    // Must still redirect (not 5xx)
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/analyze');
  });

  it('reports upsert failure to Sentry without blocking redirect', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com', created_at: new Date().toISOString() } },
    });
    mockUpsert.mockResolvedValue({ error: { message: 'connection timeout' } });

    const { GET } = await import('@/app/auth/callback/route');
    await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    expect(captureMessage).toHaveBeenCalledWith(
      'Auth callback profile upsert fallback failed',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ route: 'auth-callback', step: 'profile-fallback' }),
      })
    );
  });

  it('skips profile upsert when service role client is unavailable', async () => {
    const { getSupabaseServiceRole } = await import('@/lib/supabase/server');
    vi.mocked(getSupabaseServiceRole).mockReturnValueOnce(null);

    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'test@example.com', created_at: new Date().toISOString() } },
    });

    const { GET } = await import('@/app/auth/callback/route');
    const res = await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    // Still redirects normally
    expect(res.status).toBe(307);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('skips profile upsert when user is null (ghost session)', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import('@/app/auth/callback/route');
    await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('redirects to auth_error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { name: 'AuthError', message: 'expired' } });

    const { GET } = await import('@/app/auth/callback/route');
    const res = await GET(makeRequest('http://localhost:3000/auth/callback?code=bad'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('auth_error=true');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('CONSENT GUARD: upsert is insert-only (ignoreDuplicates:true), never a merge that re-grants consent on re-auth', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'returning-user', email: 'test@example.com', created_at: new Date().toISOString() } },
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { GET } = await import('@/app/auth/callback/route');
    await GET(makeRequest('http://localhost:3000/auth/callback?code=abc123'));

    // The second arg MUST keep ignoreDuplicates: true so an existing profile's
    // storage_consent is never overwritten on re-auth (ON CONFLICT DO NOTHING).
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const options = mockUpsert.mock.calls[0]?.[1] as { onConflict?: string; ignoreDuplicates?: boolean };
    expect(options).toMatchObject({ onConflict: 'id', ignoreDuplicates: true });
    expect(options.ignoreDuplicates).not.toBe(false);
  });

  it('uses email fallback empty string when user.email is null', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-no-email', email: null, created_at: new Date().toISOString() } },
    });
    mockUpsert.mockResolvedValue({ error: null });

    const { GET } = await import('@/app/auth/callback/route');
    await GET(makeRequest('http://localhost:3000/auth/callback?code=abc'));

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-no-email', email: '' }),
      expect.any(Object)
    );
  });
});
