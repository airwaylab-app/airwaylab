import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock setup ──────────────────────────────────────────────
// We test the webhook logic by mocking Stripe signature verification,
// Supabase operations, and Sentry — then calling the route handler directly.

const mockSupabaseFrom = vi.fn();
const mockSupabaseServiceRole = {
  from: mockSupabaseFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: () => mockSupabaseServiceRole,
  getSupabaseServer: () => null,
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock Stripe
const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockSubscriptionsRetrieve },
    };
  };
  return { default: StripeMock };
});

// Set env vars before importing route
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

// Helper to build NextRequest-like object
function makeWebhookRequest(body: string, signature = 'sig_test') {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name: string) => {
        if (name === 'stripe-signature') return signature;
        return null;
      },
    },
  };
}

// Helper for Supabase mock chain
function mockChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    insert: vi.fn().mockReturnValue(result),
    upsert: vi.fn().mockReturnValue(result),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(result) }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(result),
        }),
        single: vi.fn().mockReturnValue(result),
      }),
    }),
    eq: vi.fn().mockReturnValue(result),
  };
  return chain;
}

describe('Stripe Webhook Handler', () => {
  let POST: (req: unknown) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-set env vars (resetModules clears the module cache)
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

    const mod = await import('@/app/api/webhooks/stripe/route');
    POST = mod.POST as unknown as (req: unknown) => Promise<Response>;
  });

  it('rejects requests without stripe-signature header', async () => {
    const req = makeWebhookRequest('{}', '');
    // Override to return null for missing signature
    req.headers.get = (name: string) => (name === 'stripe-signature' ? null : null);

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing signature');
  });

  it('rejects requests with invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = makeWebhookRequest('{}');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('handles idempotent duplicate events (returns 200)', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { object: {} },
    });

    // Simulate duplicate insert error (unique constraint violation)
    const chain = mockChain({ error: { code: '23505', message: 'duplicate' } });
    mockSupabaseFrom.mockReturnValue(chain);

    const req = makeWebhookRequest('{}');
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.duplicate).toBe(true);
  });

  it('handles checkout.session.completed — upserts subscription and updates profile', async () => {
    const eventPayload = {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { supabase_user_id: 'user-123' },
          subscription: 'sub_abc',
          customer: 'cus_xyz',
        },
      },
    };
    mockConstructEvent.mockReturnValue(eventPayload);

    mockSubscriptionsRetrieve.mockResolvedValue({
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [{
          price: { id: 'price_supporter_monthly' },
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        }],
      },
    });

    // stripe_events insert succeeds (not duplicate)
    const eventsChain = mockChain({ error: null });
    // subscriptions upsert
    const subsChain = mockChain({ error: null });
    // profiles update
    const profileUpdateResult = { error: null };
    const profilesChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(profileUpdateResult),
      }),
    };

    let callCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return eventsChain;
      if (table === 'subscriptions') return subsChain;
      if (table === 'profiles') return profilesChain;
      callCount++;
      return mockChain({ error: null });
    });

    const req = makeWebhookRequest(JSON.stringify(eventPayload));
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(subsChain.upsert).toHaveBeenCalled();
    expect(profilesChain.update).toHaveBeenCalled();
  });

  it('handles customer.subscription.deleted — downgrades user to community', async () => {
    const eventPayload = {
      id: 'evt_cancel_1',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_canceled',
          metadata: { supabase_user_id: 'user-456' },
        },
      },
    };
    mockConstructEvent.mockReturnValue(eventPayload);

    const eventsChain = mockChain({ error: null });
    const subsUpdateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
    };

    // No other active subs
    const subsSelectChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
    };

    const profilesChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
    };

    let subCall = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return eventsChain;
      if (table === 'subscriptions') {
        subCall++;
        return subCall === 1 ? subsUpdateChain : subsSelectChain;
      }
      if (table === 'profiles') return profilesChain;
      return mockChain({ error: null });
    });

    const req = makeWebhookRequest(JSON.stringify(eventPayload));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(profilesChain.update).toHaveBeenCalled();
  });

  it('handles invoice.payment_failed — marks subscription past_due', async () => {
    const eventPayload = {
      id: 'evt_payment_fail_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: {
            subscription_details: {
              subscription: 'sub_past_due',
            },
          },
        },
      },
    };
    mockConstructEvent.mockReturnValue(eventPayload);

    const eventsChain = mockChain({ error: null });
    const subsChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
    };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return eventsChain;
      if (table === 'subscriptions') return subsChain;
      return mockChain({ error: null });
    });

    const req = makeWebhookRequest(JSON.stringify(eventPayload));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(subsChain.update).toHaveBeenCalled();
  });
});
