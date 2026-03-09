import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSelect,
            }),
          }),
          update: () => ({
            eq: () => ({ error: null }),
          }),
        };
      }
      return {};
    },
  }),
  getSupabaseServiceRole: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: { stripe_customer_id: null }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({ error: null }),
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      checkout: { sessions: { create: mockCheckoutCreate } },
      customers: { create: mockCustomerCreate },
    };
  };
  return { default: StripeMock };
});

vi.mock('@/lib/csrf', () => ({
  validateOrigin: () => true,
}));

vi.mock('@/lib/rate-limit', () => ({
  stripeRateLimiter: { isLimited: () => false },
  getRateLimitKey: () => '127.0.0.1',
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

function makeRequest(body: Record<string, unknown>) {
  return {
    json: () => Promise.resolve(body),
    headers: {
      get: () => 'http://localhost:3000',
    },
  };
}

describe('Create Checkout Session', () => {
  let POST: (req: unknown) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

    const mod = await import('@/app/api/create-checkout-session/route');
    POST = mod.POST as unknown as (req: unknown) => Promise<Response>;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing priceId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid (non-whitelisted) priceId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });

    const res = await POST(makeRequest({ priceId: 'price_hacked_free' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid price selected');
  });

  it('creates checkout session for valid supporter price', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { stripe_customer_id: 'cus_existing' }, error: null });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_abc' });

    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.url).toBe('https://checkout.stripe.com/session_abc');
  });

  it('creates a new Stripe customer when none exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-new', email: 'new@test.com' } }, error: null });
    mockProfileSelect.mockResolvedValue({ data: { stripe_customer_id: null }, error: null });
    mockCustomerCreate.mockResolvedValue({ id: 'cus_new_123' });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_new' });

    const res = await POST(makeRequest({ priceId: 'price_champion_yearly' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.url).toContain('checkout.stripe.com');
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@test.com' })
    );
  });
});
