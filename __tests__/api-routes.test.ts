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
    getRateLimitKey: vi.fn(() => '127.0.0.1'),
    RateLimiter: vi.fn(() => mockLimiter),
  };
});

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock Supabase server clients
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

// Mock Stripe
const mockCustomersCreate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();
const mockWebhooksConstruct = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('stripe', () => {
  class MockStripe {
    customers = {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args),
    };
    checkout = {
      sessions: { create: (...args: unknown[]) => mockCheckoutCreate(...args) },
    };
    billingPortal = {
      sessions: { create: (...args: unknown[]) => mockPortalCreate(...args) },
    };
    webhooks = {
      constructEvent: (...args: unknown[]) => mockWebhooksConstruct(...args),
    };
    subscriptions = {
      retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args),
    };
  }
  return { default: MockStripe };
});

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// ── Helpers ─────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function setupDefaultMocks() {
  mockValidateOrigin.mockReturnValue(true);
  mockIsLimited.mockReturnValue(false);
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123', email: 'test@example.com' } },
    error: null,
  });

  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockReturnValue({ data: { stripe_customer_id: 'cus_existing' }, error: null }),
    single: vi.fn().mockReturnValue({ data: { stripe_customer_id: 'cus_existing' }, error: null }),
    insert: vi.fn().mockReturnValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnValue({ error: null }),
  };
  mockFrom.mockReturnValue(chainable);

  mockCustomersRetrieve.mockResolvedValue({ id: 'cus_existing', deleted: false });
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID', 'price_supp_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID', 'price_supp_y');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID', 'price_champ_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID', 'price_champ_y');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://airwaylab.app');
  setupDefaultMocks();
});

// ═══════════════════════════════════════════════════════════════
// CREATE CHECKOUT SESSION
// ═══════════════════════════════════════════════════════════════

describe('POST /api/create-checkout-session', () => {
  async function callRoute(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/create-checkout-session/route');
    return POST(makeRequest(body));
  }

  it('returns checkout URL for valid price ID', async () => {
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/sess' });
    const res = await callRoute({ priceId: 'price_supp_m' });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://checkout.stripe.com/sess');
  });

  it('rejects invalid price ID', async () => {
    const res = await callRoute({ priceId: 'price_evil' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid price selected');
  });

  it('rejects missing priceId', async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Missing priceId');
  });

  it('rejects when CSRF fails', async () => {
    mockValidateOrigin.mockReturnValueOnce(false);
    const res = await callRoute({ priceId: 'price_supp_m' });
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockReturnValueOnce(true);
    const res = await callRoute({ priceId: 'price_supp_m' });
    expect(res.status).toBe(429);
  });

  it('returns 401 when not authenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No auth' } } as any);
    const res = await callRoute({ priceId: 'price_supp_m' });
    expect(res.status).toBe(401);
  });

  it('creates new customer when none exists', async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue({ data: { stripe_customer_id: null }, error: null }),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chainable);
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/new' });

    const res = await callRoute({ priceId: 'price_supp_m' });
    expect(res.status).toBe(200);
    expect(mockCustomersCreate).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════

describe('POST /api/customer-portal', () => {
  async function callRoute() {
    const { POST } = await import('@/app/api/customer-portal/route');
    return POST(makeRequest({}));
  }

  it('returns portal URL for valid customer', async () => {
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });
    const res = await callRoute();
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://billing.stripe.com/portal');
  });

  it('returns 404 when no stripe_customer_id', async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({ data: { stripe_customer_id: null }, error: null }),
    };
    mockFrom.mockReturnValue(chainable);

    const res = await callRoute();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('No billing account found');
  });

  it('returns 404 with support contact for stale customer', async () => {
    mockCustomersRetrieve.mockRejectedValueOnce(new Error('No such customer'));
    const res = await callRoute();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('support@airwaylab.app');
  });

  it('returns 404 for deleted customer', async () => {
    mockCustomersRetrieve.mockResolvedValueOnce({ id: 'cus_del', deleted: true });
    const res = await callRoute();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain('support@airwaylab.app');
  });
});

// ═══════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════

describe('POST /api/feedback', () => {
  async function callRoute(body: Record<string, unknown>) {
    // Re-import each time to reset the inline rate limiter
    vi.resetModules();
    const { POST } = await import('@/app/api/feedback/route');
    return POST(makeRequest(body));
  }

  it('accepts valid feedback', async () => {
    const res = await callRoute({ message: 'Great tool, love it!', type: 'feedback' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('accepts bug report', async () => {
    const res = await callRoute({ message: 'Upload broken on Safari', type: 'bug' });
    expect(res.status).toBe(200);
  });

  it('rejects message shorter than 5 chars', async () => {
    const res = await callRoute({ message: 'Hi' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('at least 5 characters');
  });

  it('rejects message over 2000 chars', async () => {
    const res = await callRoute({ message: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('too long');
  });

  it('rejects missing message', async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await callRoute({ message: 'Hello there!', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Invalid email');
  });

  it('accepts valid email', async () => {
    const res = await callRoute({ message: 'Hello there!', email: 'user@example.com' });
    expect(res.status).toBe(200);
  });

  it('fires Sentry warning for bug reports', async () => {
    const Sentry = await import('@sentry/nextjs');
    await callRoute({ message: 'Test bug report here', type: 'bug' });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'New bug submission',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ feedback_type: 'bug' }),
      })
    );
  });

  it('fires Sentry info for feature requests', async () => {
    const Sentry = await import('@sentry/nextjs');
    await callRoute({ message: 'Please add dark mode toggle', type: 'feature' });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'New feature submission',
      expect.objectContaining({
        level: 'info',
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// ENV VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('validateServerEnv', () => {
  it('warns when Stripe key set but webhook secret missing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const { validateServerEnv } = await import('@/lib/env');
    const warnings = validateServerEnv();
    expect(warnings.some((w) => w.includes('STRIPE_WEBHOOK_SECRET'))).toBe(true);
  });

  it('throws when Supabase URL set without anon key', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const { validateServerEnv } = await import('@/lib/env');
    expect(() => validateServerEnv()).toThrow('Environment validation failed');
  });

  it('warns when Stripe price IDs are missing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID', '');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const { validateServerEnv } = await import('@/lib/env');
    const warnings = validateServerEnv();
    expect(warnings.some((w) => w.includes('price ID'))).toBe(true);
  });
});
