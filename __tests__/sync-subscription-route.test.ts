import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  captureException: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: (table: string) => mockFrom(table),
    })
  ),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  // Make chainable methods return the chain itself
  for (const key of ['select', 'eq', 'in', 'order', 'limit']) {
    (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain;
}

function setupUser(id = 'user-123') {
  mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null });
}

function setupNoUser() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('POST /api/auth/sync-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    setupNoUser();
    mockFrom.mockReturnValue(makeChain());

    const { POST } = await import('@/app/api/auth/sync-subscription/route');
    const res = await POST();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Not authenticated');
  });

  it('returns healed:false when tiers already match', async () => {
    setupUser();

    const subChain = makeChain();
    (subChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { tier: 'supporter', status: 'active' },
      error: null,
    });
    const profileChain = makeChain();
    (profileChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { tier: 'supporter' },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return subChain;
      if (table === 'profiles') return profileChain;
      return makeChain();
    });

    const { POST } = await import('@/app/api/auth/sync-subscription/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.healed).toBe(false);
    expect(body.from).toBe('supporter');
    expect(body.to).toBe('supporter');
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('heals champion profile with no active subscription down to community', async () => {
    setupUser();

    const subChain = makeChain();
    (subChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    const profileChain = makeChain();
    (profileChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { tier: 'champion' },
      error: null,
    });
    const updateChain = makeChain();
    (updateChain.update as ReturnType<typeof vi.fn>).mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return subChain;
      if (table === 'profiles') return profileChain;
      return updateChain;
    });

    // On the second profiles call (update), we need to handle it differently
    let profileCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return subChain;
      if (table === 'profiles') {
        profileCallCount++;
        if (profileCallCount === 1) return profileChain; // select
        // second call is for update
        const updateInner = makeChain();
        (updateInner.update as ReturnType<typeof vi.fn>).mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });
        return updateInner;
      }
      return makeChain();
    });

    const { POST } = await import('@/app/api/auth/sync-subscription/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.healed).toBe(true);
    expect(body.from).toBe('champion');
    expect(body.to).toBe('community');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'login-sync: tier mismatch healed',
      expect.objectContaining({
        level: 'warning',
        extra: expect.objectContaining({ fromTier: 'champion', toTier: 'community' }),
      })
    );
  });

  it('heals community profile with active champion subscription up to champion', async () => {
    setupUser();

    const subChain = makeChain();
    (subChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { tier: 'champion', status: 'active' },
      error: null,
    });
    const profileChain = makeChain();
    (profileChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { tier: 'community' },
      error: null,
    });

    let profileCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return subChain;
      if (table === 'profiles') {
        profileCallCount++;
        if (profileCallCount === 1) return profileChain;
        const updateInner = makeChain();
        (updateInner.update as ReturnType<typeof vi.fn>).mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });
        return updateInner;
      }
      return makeChain();
    });

    const { POST } = await import('@/app/api/auth/sync-subscription/route');
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.healed).toBe(true);
    expect(body.from).toBe('community');
    expect(body.to).toBe('champion');
  });
});
