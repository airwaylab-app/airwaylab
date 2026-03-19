import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mock external dependencies before importing route ──────────

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock Supabase — builder pattern that supports chaining
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

// Mock Stripe
const mockWebhooksConstruct = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = {
      constructEvent: (...args: unknown[]) => mockWebhooksConstruct(...args),
    };
    subscriptions = {
      retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args),
    };
  }
  return { default: MockStripe };
});

// ── Helpers ──────────

/** Build a supabase query builder mock that chains any method calls and
 *  resolves to a configurable terminal result when awaited. */
function createQueryBuilder(terminalResult: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const proxy = new Proxy(builder, {
    get(target, prop: string) {
      if (prop === 'then') {
        // Make the builder thenable so `await` resolves to terminalResult
        return (resolve: (v: unknown) => void) => resolve(terminalResult);
      }
      if (!target[prop]) {
        target[prop] = vi.fn();
      }
      target[prop].mockReturnValue(proxy);
      return target[prop];
    },
  });

  return proxy;
}

function makeRequest(body = '{}', headers: Record<string, string> = {}): NextRequest {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  }) as unknown as NextRequest;
}

function makeStripeEvent(
  type: string,
  dataObject: Record<string, unknown>,
  id = 'evt_test_123'
) {
  return { id, type, data: { object: dataObject } };
}

function makeSubscriptionObject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test_123',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { supabase_user_id: 'user-uuid-1' },
    items: {
      data: [
        {
          price: {
            id: 'price_supp_m',
            unit_amount: 900,
            recurring: { interval: 'month' },
          },
          current_period_end: 1700000000,
        },
      ],
    },
    ...overrides,
  };
}

// ── Environment setup ──────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID', 'price_supp_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID', 'price_supp_y');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID', 'price_champ_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID', 'price_champ_y');
});

/** Dynamic import with resetModules so each test picks up freshly stubbed
 *  env vars (the route captures STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 *  at module scope). */
async function callRoute(req: NextRequest) {
  vi.resetModules();
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  return POST(req);
}

// ── Tests ──────────

describe('POST /api/webhooks/stripe', () => {
  // ---------- 1. Missing stripe config ----------
  it('returns 503 when stripe config is missing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');

    const req = makeRequest('{}', { 'stripe-signature': 'sig_test' });
    const res = await callRoute(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/);
  });

  // ---------- 2. Missing signature ----------
  it('returns 400 when stripe-signature header is missing', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const req = makeRequest('{}'); // no stripe-signature header
    const res = await callRoute(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing signature');
  });

  // ---------- 3. Invalid signature ----------
  it('returns 400 when constructEvent throws (invalid signature)', async () => {
    mockWebhooksConstruct.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = makeRequest('{}', { 'stripe-signature': 'bad_sig' });
    const res = await callRoute(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  // ---------- 4. Idempotency: duplicate event ----------
  it('returns 200 with duplicate:true when event was already processed', async () => {
    const event = makeStripeEvent('checkout.session.completed', {});
    mockWebhooksConstruct.mockReturnValue(event);

    // stripe_events insert returns error (duplicate key)
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      })
    );

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.received).toBe(true);
  });

  // ---------- 5. checkout.session.completed: happy path ----------
  it('handles checkout.session.completed -- upserts subscription, updates profile, logs event', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);

    // Verify stripe_events insert (idempotency)
    expect(mockFrom).toHaveBeenCalledWith('stripe_events');

    // Verify subscription upsert
    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        stripe_subscription_id: 'sub_test_123',
        stripe_price_id: 'price_supp_m',
        status: 'active',
        tier: 'supporter',
      }),
      { onConflict: 'stripe_subscription_id' }
    );

    // Verify profile update
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(builders['profiles']!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'supporter',
        stripe_customer_id: 'cus_test_456',
      })
    );

    // Verify subscription_events log
    expect(mockFrom).toHaveBeenCalledWith('subscription_events');
    expect(builders['subscription_events']!.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        event_type: 'created',
        tier: 'supporter',
      })
    );

    // Verify stripe.subscriptions.retrieve was called
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123');
  });

  // ---------- 6. checkout.session.completed: missing userId/subscriptionId ----------
  it('logs warning when checkout.session.completed has missing userId or subscriptionId', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: {},
      subscription: null,
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);

    mockFrom.mockImplementation(() => createQueryBuilder({ data: null, error: null }));

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);
    expect(captureMessage).toHaveBeenCalledWith(
      'Stripe checkout.session.completed missing userId or subscriptionId',
      expect.objectContaining({ level: 'warning' })
    );
    // Should NOT call stripe.subscriptions.retrieve
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  // ---------- 7. customer.subscription.updated: happy path ----------
  it('handles customer.subscription.updated -- updates subscription and profile tier', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);

    // Verify subscription update
    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_price_id: 'price_supp_m',
        status: 'active',
        tier: 'supporter',
      })
    );
    expect(builders['subscriptions']!.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_test_123');

    // Verify profile tier update (status is 'active')
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'supporter' });
    expect(builders['profiles']!.eq).toHaveBeenCalledWith('id', 'user-uuid-1');
  });

  // ---------- 8. customer.subscription.updated: non-active status ----------
  it('does NOT update profile tier when subscription status is not active/trialing', async () => {
    const subscription = makeSubscriptionObject({ status: 'past_due' });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);

    // Subscription record itself is updated
    expect(builders['subscriptions']!.update).toHaveBeenCalled();

    // Profile should NOT be updated for non-active status
    const profileCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'profiles'
    );
    expect(profileCalls).toHaveLength(0);
  });

  // ---------- 9. customer.subscription.deleted: no remaining subs ----------
  it('handles customer.subscription.deleted -- downgrades to community when no active subs remain', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        // select returns empty array (no remaining active subs)
        builders[table] = createQueryBuilder({ data: [], error: null });
      }
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);

    // Verify subscription marked as canceled
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith({ status: 'canceled' });

    // Verify remaining subs check
    expect(builders['subscriptions']!.select).toHaveBeenCalledWith('tier');
    expect(builders['subscriptions']!.in).toHaveBeenCalledWith('status', ['active', 'trialing']);

    // Verify profile downgraded to community (no active subs)
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'community' });
    expect(builders['profiles']!.eq).toHaveBeenCalledWith('id', 'user-uuid-1');
  });

  // ---------- 10. customer.subscription.deleted: remaining active sub ----------
  it('keeps existing tier when another active subscription remains', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        // select returns one remaining active sub with champion tier
        builders[table] = createQueryBuilder({
          data: [{ tier: 'champion' }],
          error: null,
        });
      }
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);

    // Profile should be set to the remaining sub's tier, not 'community'
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'champion' });
  });

  // ---------- 11. invoice.payment_failed ----------
  it('handles invoice.payment_failed -- sets subscription status to past_due', async () => {
    const invoice = {
      parent: {
        subscription_details: {
          subscription: 'sub_test_123',
        },
      },
    };
    const event = makeStripeEvent('invoice.payment_failed', invoice);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder({ data: null, error: null });
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);

    // Verify subscription set to past_due
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith({ status: 'past_due' });
    expect(builders['subscriptions']!.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_test_123');

    // Verify subscription_events log
    expect(builders['subscription_events']!.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'past_due',
        stripe_subscription_id: 'sub_test_123',
      })
    );
  });

  // ---------- 12. Compensating delete on handler error ----------
  it('deletes stripe_events record when handler throws (compensating action)', async () => {
    const { captureException } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    let stripeEventsCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        stripeEventsCallCount++;
        if (stripeEventsCallCount === 1) {
          // First call: idempotency insert succeeds
          return createQueryBuilder({ data: null, error: null });
        }
        // Second call: compensating delete succeeds
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscription_events') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscriptions') {
        // Make upsert fail to trigger the catch block
        return createQueryBuilder({
          data: null,
          error: { message: 'Upsert failed' },
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(500);

    // stripe_events should be accessed twice: insert (idempotency) + delete (compensating)
    const stripeEventsCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'stripe_events'
    );
    expect(stripeEventsCalls).toHaveLength(2);

    // Verify Sentry captured the error
    expect(captureException).toHaveBeenCalled();
  });

  // ---------- 13. Compensating delete failure ----------
  it('returns 500 without crashing when both handler and compensating delete fail', async () => {
    const { captureException } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    let stripeEventsCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        stripeEventsCallCount++;
        if (stripeEventsCallCount === 1) {
          // Idempotency insert succeeds
          return createQueryBuilder({ data: null, error: null });
        }
        // Compensating delete also fails
        return createQueryBuilder({
          data: null,
          error: { message: 'Delete also failed' },
        });
      }
      if (table === 'subscription_events') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscriptions') {
        // Handler fails
        return createQueryBuilder({
          data: null,
          error: { message: 'Upsert failed' },
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    // Should still return 500, not crash
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Webhook handler error');

    // Sentry captures: upsert error (at throw), delete error (compensating), handler error (catch)
    expect(captureException).toHaveBeenCalledTimes(3);
  });
});
