import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

const mockSubscriptionsCancel = vi.fn();
const mockSubscriptionsList = vi.fn();
vi.mock('stripe', () => ({
  default: class MockStripe {
    subscriptions = {
      cancel: (...a: unknown[]) => mockSubscriptionsCancel(...a),
      list: (...a: unknown[]) => mockSubscriptionsList(...a),
    };
  },
}));

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
  const deleteTable = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
  // Step 0 always looks up profiles.stripe_customer_id; null => no billing => skip Stripe.
  const profilesBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { stripe_customer_id: null }, error: null }),
  };
  mockFrom.mockImplementation((table: string) => (table === 'profiles' ? profilesBuilder : deleteTable));
  mockDeleteUser.mockResolvedValue({ error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('POST /api/delete-user-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLimited.mockReturnValue(false);
    // These tests cover the no-Stripe path: STRIPE_SECRET_KEY unset → getStripe()
    // returns null → the cancel step is skipped. resetModules so the route module
    // re-reads the env each test.
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
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
    const profilesBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { stripe_customer_id: null }, error: null }),
    };
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? profilesBuilder : failingTable));
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

describe('POST /api/delete-user-data — Stripe cancellation (fail-safe, Stripe-authoritative)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLimited.mockReturnValue(false);
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
  });

  function setup(opts: { customerId?: string | null; stripeSubs?: Array<{ id: string; status: string }>; hasMore?: boolean } = {}) {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null });
    mockStorageFrom.mockReturnValue({ list: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const deleteTable = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    const profilesBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { stripe_customer_id: opts.customerId ?? null }, error: null }),
    };
    const eventsBuilder = { upsert: vi.fn().mockResolvedValue({ error: null }) };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profilesBuilder;
      if (table === 'subscription_events') return eventsBuilder;
      return deleteTable;
    });
    mockSubscriptionsList.mockResolvedValue({ data: opts.stripeSubs ?? [], has_more: opts.hasMore ?? false });
    mockDeleteUser.mockResolvedValue({ error: null });
    return { eventsBuilder };
  }

  it('cancels the live Stripe sub BEFORE deleting the account (order enforced)', async () => {
    setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_active', status: 'active' }] });
    mockSubscriptionsCancel.mockResolvedValue({});

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockSubscriptionsList).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_x', status: 'all' }));
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_active');
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
    // cancel must precede auth deletion
    expect(mockSubscriptionsCancel.mock.invocationCallOrder[0]!).toBeLessThan(mockDeleteUser.mock.invocationCallOrder[0]!);
  });

  it('records a cancellation churn event for each cancelled sub', async () => {
    const { eventsBuilder } = setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_active', status: 'active' }] });
    mockSubscriptionsCancel.mockResolvedValue({});

    const { POST } = await import('@/app/api/delete-user-data/route');
    await POST(makeRequest());

    expect(eventsBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'cancelled', stripe_subscription_id: 'sub_active', mrr_cents: 0 }),
      expect.objectContaining({ onConflict: 'stripe_event_id', ignoreDuplicates: true }),
    );
  });

  it('ABORTS with 502 and deletes NOTHING when a cancellation fails', async () => {
    setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_active', status: 'active' }] });
    mockSubscriptionsCancel.mockRejectedValue({ code: 'api_error', message: 'Stripe down' });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockStorageFrom).not.toHaveBeenCalled(); // never reached storage/table deletion
  });

  it('ABORTS with 502 and deletes NOTHING when listing subscriptions fails', async () => {
    setup({ customerId: 'cus_x' });
    mockSubscriptionsList.mockRejectedValue({ code: 'api_error', message: 'list failed' });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });

  it('treats resource_missing as success and proceeds with deletion', async () => {
    setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_gone', status: 'active' }] });
    mockSubscriptionsCancel.mockRejectedValue({ code: 'resource_missing', message: 'No such subscription' });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
  });

  it('multiple subs: a later failure aborts, but the earlier cancellation kept its churn', async () => {
    const { eventsBuilder } = setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_a', status: 'active' }, { id: 'sub_b', status: 'active' }] });
    mockSubscriptionsCancel.mockResolvedValueOnce({}).mockRejectedValueOnce({ code: 'api_error', message: 'boom' });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ extra: expect.objectContaining({ failedSubscriptionId: 'sub_b', cancelledSoFar: 1 }) }),
    );
    // sub_a's churn was recorded BEFORE the abort (not lost)
    expect(eventsBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_subscription_id: 'sub_a' }),
      expect.anything(),
    );
  });

  it('ABORTS with 502 when the customer has more than one page of subscriptions', async () => {
    setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_a', status: 'active' }], hasMore: true });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
  });

  it('does not cancel already-canceled Stripe subs', async () => {
    setup({ customerId: 'cus_x', stripeSubs: [{ id: 'sub_old', status: 'canceled' }] });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
  });

  it('ABORTS with 503 when the user has a stripe_customer_id but Stripe is not configured', async () => {
    setup({ customerId: 'cus_x' });
    delete process.env.STRIPE_SECRET_KEY; // simulate config regression
    vi.resetModules();

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(503);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });

  it('skips Stripe entirely when the user has no stripe_customer_id', async () => {
    setup({ customerId: null });

    const { POST } = await import('@/app/api/delete-user-data/route');
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockSubscriptionsList).not.toHaveBeenCalled();
    expect(mockSubscriptionsCancel).not.toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('user-123');
  });
});
