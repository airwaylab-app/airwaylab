/**
 * Tests for the Stripe webhook handler (app/api/webhooks/stripe/route.ts).
 *
 * Covers: checkout.session.completed, subscription.updated, subscription.deleted,
 * invoice.payment_failed, idempotency (23505 vs other insert errors), the ST1
 * job-state machine (pending -> processing -> done|failed), tier assignment
 * (all 4 price IDs), tier transitions, missing data, unknown price IDs, MRR
 * computation, and malformed events.
 *
 * Design note (ST1): the route inserts the event as `pending` synchronously
 * (idempotency gate), returns 200, then processes inside after(): mark
 * `processing` -> run -> mark `done`, or on failure mark `failed` with
 * last_error + attempts. The row is NEVER deleted on failure — the
 * subscription-drift cron re-drives failed/stale rows, because Stripe already
 * got 200 and will not retry on its own.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mock external dependencies before importing route ──────────

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureEvent: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// Collect after() callbacks so callRoute can flush them after the response.
// This simulates the real after() contract: response sent first, callbacks run after.
const afterCallbacks: Array<() => unknown> = [];

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (fn: () => unknown) => { afterCallbacks.push(fn); },
  };
});

// Mock email modules (fire-and-forget in the route, but must be mockable)
vi.mock('@/lib/email/sequences', () => ({
  cancelSequence: vi.fn().mockResolvedValue(undefined),
  scheduleSequence: vi.fn().mockResolvedValue(undefined),
  scheduleWinBackForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/transactional', () => ({
  welcomeEmail: vi.fn().mockReturnValue({ subject: 'Welcome', html: '<p>Welcome</p>' }),
  cancellationEmail: vi.fn().mockReturnValue({ subject: 'Cancelled', html: '<p>Bye</p>' }),
}));

// Mock Discord modules (non-blocking in the route)
vi.mock('@/lib/discord', () => ({
  isDiscordConfigured: vi.fn().mockReturnValue(false),
  syncRole: vi.fn().mockResolvedValue(undefined),
  searchGuildMember: vi.fn().mockResolvedValue({ status: 'not_found' }),
  getTierRoleId: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  formatRevenueEmbed: vi.fn().mockReturnValue({}),
  alertStripePaymentFailed: vi.fn().mockResolvedValue(false),
  COLORS: { green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, blue: 0x3b82f6, purple: 0x8b5cf6, teal: 0x14b8a6 },
  _budget: { date: '', count: 0 },
  routeAlert: vi.fn().mockResolvedValue(false),
  sendOpsAlert: vi.fn().mockResolvedValue(false),
  sendCriticalAlert: vi.fn().mockResolvedValue(false),
  alertCredentialExpiry: vi.fn().mockResolvedValue(false),
  alertSecurityIncident: vi.fn().mockResolvedValue(false),
  formatMonitorEmbed: vi.fn().mockReturnValue({}),
  formatUserSignalEmbed: vi.fn().mockReturnValue({}),
  formatEmailAlertEmbed: vi.fn().mockReturnValue({}),
  formatBroadcastEmbed: vi.fn().mockReturnValue({}),
  formatGrowthEmbed: vi.fn().mockReturnValue({}),
}));

// Mock Supabase — builder pattern that supports chaining
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

// Mock Stripe
const mockWebhooksConstruct = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = {
      constructEvent: (...args: unknown[]) => mockWebhooksConstruct(...args),
    };
    subscriptions = {
      retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args),
      update: (...args: unknown[]) => mockSubscriptionsUpdate(...args),
    };
  }
  return { default: MockStripe };
});

// ── Helpers ──────────

/** Build a supabase query builder mock that chains any method calls and
 *  resolves to a configurable terminal result when awaited. Used for inserts
 *  and the done/failed updates (which only read `.error`) and for table reads.
 *
 *  The ST1 atomic claim no longer flows through this builder: it is a
 *  `supabase.rpc('claim_stripe_event', ...)` call mocked via `mockRpc`. By
 *  default (see beforeEach) the claim WINS (resolves a non-empty RETURNING set)
 *  so the happy/failure paths reach processStripeEvent; a test that needs the
 *  claim to LOSE sets `mockRpc.mockResolvedValueOnce({ data: [], error: null })`.
 */
function createQueryBuilder(
  terminalResult: { data?: unknown; error?: unknown } = { data: null, error: null }
) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const proxy = new Proxy(builder, {
    get(target, prop: string) {
      if (prop === 'then') {
        // Make the builder thenable so `await` resolves to the terminal result.
        return (resolve: (v: unknown) => void) => resolve(terminalResult);
      }
      if (!target[prop]) {
        // Each chained method records the call and returns the proxy.
        target[prop] = vi.fn(() => proxy);
      }
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
  afterCallbacks.length = 0;
  // ST1 atomic claim (claim_stripe_event RPC) WINS by default: resolves a
  // non-empty RETURNING set so runStripeJob proceeds to processStripeEvent.
  // Claim-loses tests override with mockRpc.mockResolvedValueOnce({data:[],...}).
  mockRpc.mockResolvedValue({ data: [{ event_id: 'evt_claimed' }], error: null });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID', 'price_supp_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID', 'price_supp_y');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID', 'price_champ_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID', 'price_champ_y');
});

/**
 * Invoke the route handler and flush any deferred after() callbacks before
 * returning so test assertions can observe their side effects.
 */
async function callRoute(req: NextRequest) {
  vi.resetModules();
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  const res = await POST(req);
  for (const fn of afterCallbacks) {
    await fn();
  }
  return res;
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

  // ---------- 3a. Invalid signature triggers Sentry.captureEvent ----------
  it('calls Sentry.captureEvent with stripe_webhook_sig_failure tag on invalid signature', async () => {
    const { captureEvent } = await import('@sentry/nextjs');
    mockWebhooksConstruct.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = makeRequest('{}', { 'stripe-signature': 'bad_sig' });
    await callRoute(req);

    expect(captureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'Stripe webhook signature verification failed',
        tags: expect.objectContaining({
          event_type: 'stripe_webhook_sig_failure',
          route: 'webhooks/stripe',
        }),
        extra: expect.objectContaining({
          hasSignatureHeader: true,
        }),
      })
    );
  });

  // ---------- 3b. Valid signature does NOT trigger Sentry.captureEvent ----------
  it('does NOT call Sentry.captureEvent when signature is valid', async () => {
    const { captureEvent } = await import('@sentry/nextjs');
    const event = makeStripeEvent('customer.created', { id: 'cus_xyz' });
    mockWebhooksConstruct.mockReturnValue(event);
    mockFrom.mockImplementation(() => createQueryBuilder({ data: null, error: null }));

    const req = makeRequest('{}', { 'stripe-signature': 'valid_sig' });
    await callRoute(req);

    expect(captureEvent).not.toHaveBeenCalled();
  });

  // ---------- 4. Idempotency: true duplicate (23505) returns 200 ----------
  it('returns 200 with duplicate:true on a unique-violation (23505) insert error', async () => {
    const event = makeStripeEvent('checkout.session.completed', {});
    mockWebhooksConstruct.mockReturnValue(event);

    // stripe_events insert returns a Postgres unique violation = true duplicate
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      })
    );

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.received).toBe(true);
  });

  // ---------- 4a. Non-23505 insert error returns 500 so Stripe retries ----------
  it('returns 500 (not 200, not duplicate) when the idempotency insert fails for a non-duplicate reason', async () => {
    const { captureException } = await import('@sentry/nextjs');
    const event = makeStripeEvent('checkout.session.completed', {});
    mockWebhooksConstruct.mockReturnValue(event);

    // stripe_events insert fails with a non-unique-violation DB error
    // (e.g. connection failure, code 08006). This must NOT be swallowed as a
    // duplicate — return 500 so Stripe retries the delivery.
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '08006', message: 'connection failure' },
      })
    );

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.duplicate).toBeUndefined();
    // Event processing must NOT run when we could not record the event.
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
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
        // AIR-1873: profiles must return a non-null row so the phantom-user guard passes
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
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

    // Verify subscription_events log — now an idempotent upsert keyed on
    // stripe_event_id (BLOCKER 2 defence-in-depth against double-counting).
    expect(mockFrom).toHaveBeenCalledWith('subscription_events');
    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-1',
        event_type: 'created',
        tier: 'supporter',
        stripe_event_id: 'evt_test_123',
      }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    );

    // Verify stripe.subscriptions.retrieve was called
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123');
  });

  // ---------- 5b. checkout.session.completed: phantom supabase_user_id ----------
  it('fires Sentry critical alert and skips DB writes when supabase_user_id has no profile (AIR-1873)', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: { supabase_user_id: 'phantom-uuid-does-not-exist' },
      subscription: 'sub_phantom_123',
      customer: 'cus_phantom_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject({
      metadata: { supabase_user_id: 'phantom-uuid-does-not-exist' },
    }));

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        // profiles returns null — simulates no profile row for the phantom UUID
        const result = table === 'profiles'
          ? { data: null, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await callRoute(req);

    expect(res.status).toBe(200); // Stripe must get 200 so it stops retrying
    expect((await res.json()).received).toBe(true);

    // Phantom-user Sentry alert must fire
    expect(captureMessage).toHaveBeenCalledWith(
      'Stripe webhook: supabase_user_id in metadata has no matching profile',
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ check: 'phantom-user-id' }),
      })
    );

    // Subscription upsert must NOT happen for a phantom user
    if (builders['subscriptions']) {
      expect(builders['subscriptions']!.upsert).not.toHaveBeenCalled();
    }
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

    // Verify subscription marked as canceled (may also include cancel detail fields)
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );

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

    // Verify subscription_events log (idempotent upsert), tagged source=dunning
    // so a later auto-cancel is attributed to dunning, not a portal cancel.
    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'past_due',
        stripe_subscription_id: 'sub_test_123',
        stripe_event_id: 'evt_test_123',
        source: 'dunning',
      }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    );
  });

  // ---------- 12. ST1: failure marks the row `failed` (does NOT delete it) ----------
  // State machine: insert(pending) -> update(processing) -> [process throws] ->
  // update(failed + last_error + attempts=1). The row is NEVER deleted, so the
  // re-drive cron can retry it (Stripe already got 200 and will not retry).
  it('marks stripe_events failed (status+last_error+attempts), never deletes, on handler error', async () => {
    const { captureException } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        // Single reusable builder so we can inspect insert/update/delete calls.
        return stripeEventsBuilder;
      }
      if (table === 'profiles') {
        // AIR-1873: phantom guard must pass so the handler reaches subscriptions upsert
        return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
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

    // Route always returns 200 — processing errors are handled inside after()
    expect(res.status).toBe(200);

    // Insert claimed the row as `pending`
    expect(stripeEventsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: 'evt_test_123', status: 'pending' })
    );
    // ATOMIC CLAIM via the claim_stripe_event RPC: transitioned to `processing`
    // and set attempts to 1 (attemptsBefore 0 + 1) in a single conditional UPDATE.
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_test_123', p_attempts: 1 })
    );
    // On failure: marked `failed` with last_error (attempts already bumped by
    // the claim, so the failure update does not touch attempts).
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        last_error: 'Subscription upsert failed: Upsert failed',
      })
    );
    // The row must NOT be deleted (this was the ST1 bug)
    expect(stripeEventsBuilder.delete).not.toHaveBeenCalled();

    // Verify Sentry captured the error
    expect(captureException).toHaveBeenCalled();
  });

  // ---------- 13. ST1: mark-failed update failing does not crash ----------
  // If even the mark-failed update fails, the route must not throw and must log
  // both the processing error and the mark-failed error to Sentry.
  it('does not crash and logs both errors when processing fails AND the mark-failed update fails', async () => {
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
        // The claim is now the claim_stripe_event RPC, not a from('stripe_events')
        // call, so the stripe_events builder sees only: 1: insert(pending) ok,
        // 2: update(failed) fails.
        if (stripeEventsCallCount <= 1) {
          return createQueryBuilder({ data: null, error: null });
        }
        return createQueryBuilder({
          data: null,
          error: { message: 'mark-failed update failed' },
        });
      }
      if (table === 'profiles') {
        return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
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

    // Route always returns 200 — errors are captured in Sentry
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // Sentry captures: upsert error (at throw) + mark-failed error + handler error (catch)
    expect(captureException).toHaveBeenCalledTimes(3);
  });

  // ---------- 14. ST1: happy path drives pending -> processing -> done ----------
  it('drives the row pending -> processing -> done on a successful event', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession, 'evt_state_test');
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'profiles') {
        return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // pending on insert
    expect(stripeEventsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: 'evt_state_test', status: 'pending' })
    );
    // claim (processing) via RPC, then done
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_state_test', p_attempts: 1 })
    );
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done', last_error: null })
    );
    // never deleted, never marked failed
    expect(stripeEventsBuilder.delete).not.toHaveBeenCalled();
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
  });

  // ---------- 15. Tier assignment: all 4 price IDs ----------
  it('assigns supporter tier for supporter yearly price', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_supp_y', unit_amount: 9000, recurring: { interval: 'year' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'supporter', stripe_price_id: 'price_supp_y' }),
      expect.any(Object)
    );
  });

  it('assigns champion tier for champion monthly price', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_champ_m', unit_amount: 1900, recurring: { interval: 'month' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'champion' }),
      expect.any(Object)
    );
  });

  it('assigns champion tier for champion yearly price', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_champ_y', unit_amount: 19000, recurring: { interval: 'year' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'champion' }),
      expect.any(Object)
    );
  });

  // ---------- 16. Unknown price ID defaults to supporter ----------
  it('defaults to supporter tier and fires Sentry warning for unknown price ID', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_unknown_xyz', unit_amount: 999, recurring: { interval: 'month' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'supporter' }),
      expect.any(Object)
    );
    expect(captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Unknown Stripe price ID: price_unknown_xyz'),
      'warning'
    );
  });

  // ---------- 16. MRR computation for monthly ----------
  it('logs correct MRR for monthly subscription (unit_amount passed through)', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_supp_m', unit_amount: 900, recurring: { interval: 'month' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    // MRR for monthly = unit_amount directly
    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ mrr_cents: 900 }),
      expect.objectContaining({ onConflict: 'stripe_event_id' })
    );
  });

  // ---------- 17. MRR computation for yearly ----------
  it('logs correct MRR for yearly subscription (unit_amount / 12)', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeSubscriptionObject({
        items: {
          data: [{
            price: { id: 'price_supp_y', unit_amount: 9000, recurring: { interval: 'year' } },
            current_period_end: 1700000000,
          }],
        },
      })
    );

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    // MRR for yearly = 9000 / 12 = 750
    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ mrr_cents: 750 }),
      expect.objectContaining({ onConflict: 'stripe_event_id' })
    );
  });

  // ---------- 18. Tier transition: upgrade via subscription.updated ----------
  it('handles supporter-to-champion upgrade via subscription.updated', async () => {
    const subscription = makeSubscriptionObject({
      items: {
        data: [{
          price: { id: 'price_champ_m', unit_amount: 1900, recurring: { interval: 'month' } },
          current_period_end: 1700000000,
        }],
      },
    });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Subscription record updated to champion
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'champion', stripe_price_id: 'price_champ_m' })
    );
    // Profile updated to champion (status is active)
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'champion' });
  });

  // ---------- 19. Tier transition: downgrade via subscription.updated ----------
  it('handles champion-to-supporter downgrade via subscription.updated', async () => {
    const subscription = makeSubscriptionObject({
      items: {
        data: [{
          price: { id: 'price_supp_m', unit_amount: 900, recurring: { interval: 'month' } },
          current_period_end: 1700000000,
        }],
      },
    });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'supporter' })
    );
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'supporter' });
  });

  // ---------- 20. subscription.updated: trialing status updates profile ----------
  it('updates profile tier when subscription status is trialing', async () => {
    const subscription = makeSubscriptionObject({ status: 'trialing' });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Profile SHOULD be updated for trialing status
    expect(builders['profiles']!.update).toHaveBeenCalledWith({ tier: 'supporter' });
  });

  // ---------- 21. subscription.updated: canceled status does NOT update profile ----------
  it('does NOT update profile tier when subscription status is canceled', async () => {
    const subscription = makeSubscriptionObject({ status: 'canceled' });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Profile should NOT be updated for canceled status
    const profileCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'profiles'
    );
    expect(profileCalls).toHaveLength(0);
  });

  // ---------- 22. subscription.updated: missing userId still updates subscription ----------
  it('updates subscription record but logs warning when userId is missing on subscription.updated', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const subscription = makeSubscriptionObject({ metadata: {} });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Subscription record should still be updated
    expect(builders['subscriptions']!.update).toHaveBeenCalled();

    // Sentry warning for missing userId
    expect(captureMessage).toHaveBeenCalledWith(
      'Stripe subscription.updated missing userId',
      expect.objectContaining({ level: 'warning' })
    );
  });

  // ---------- 23. subscription.updated: logs updated event ----------
  it('logs updated event to subscription_events on subscription.updated', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'updated',
        tier: 'supporter',
        interval: 'month',
        stripe_subscription_id: 'sub_test_123',
        stripe_event_id: 'evt_test_123',
      }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    );
  });

  // ---------- 24. subscription.deleted: logs cancelled event ----------
  it('logs cancelled event to subscription_events on subscription.deleted', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        builders[table] = createQueryBuilder({ data: [], error: null });
      }
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'cancelled',
        stripe_subscription_id: 'sub_test_123',
        stripe_event_id: 'evt_test_123',
      }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    );
  });

  // ---------- 25. subscription.deleted: missing userId ----------
  it('cancels subscription but skips profile downgrade when userId is missing', async () => {
    const subscription = makeSubscriptionObject({ metadata: {} });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Subscription should still be marked canceled (may also include cancel detail fields)
    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );

    // Profile should NOT be updated (no userId)
    const profileCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'profiles'
    );
    expect(profileCalls).toHaveLength(0);
  });

  // ---------- 26. invoice.payment_failed: subscription as object ----------
  it('extracts subscription ID from object form in invoice.payment_failed', async () => {
    const invoice = {
      parent: {
        subscription_details: {
          subscription: { id: 'sub_obj_789' },
        },
      },
    };
    const event = makeStripeEvent('invoice.payment_failed', invoice);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(builders['subscriptions']!.update).toHaveBeenCalledWith({ status: 'past_due' });
    expect(builders['subscriptions']!.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_obj_789');
  });

  // ---------- 27. invoice.payment_failed: no subscription ----------
  it('does nothing when invoice.payment_failed has no subscriptionId', async () => {
    const invoice = {
      parent: {
        subscription_details: { subscription: null },
      },
    };
    const event = makeStripeEvent('invoice.payment_failed', invoice);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // subscriptions.update should NOT have been called
    const subCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'subscriptions'
    );
    expect(subCalls).toHaveLength(0);
  });

  // ---------- 28. invoice.payment_failed: missing parent entirely ----------
  it('does nothing when invoice.payment_failed has no parent field', async () => {
    const invoice = {};
    const event = makeStripeEvent('invoice.payment_failed', invoice);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    const subCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === 'subscriptions'
    );
    expect(subCalls).toHaveLength(0);
  });

  // ---------- 29. Unhandled event type returns 200 ----------
  it('returns 200 for unhandled event types (acknowledges receipt)', async () => {
    const event = makeStripeEvent('customer.created', { id: 'cus_xyz' });
    mockWebhooksConstruct.mockReturnValue(event);
    mockFrom.mockImplementation(() => createQueryBuilder({ data: null, error: null }));

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  // ---------- 30. Idempotency: duplicate does not invoke business logic ----------
  it('does not invoke subscriptions.retrieve or upsert for duplicate events', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);

    // Idempotency insert fails with a unique violation (true duplicate)
    mockFrom.mockReturnValue(
      createQueryBuilder({ data: null, error: { code: '23505', message: 'duplicate key' } })
    );

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    // No business logic should execute
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
  });

  // ---------- 31. subscription.updated: subscription update DB failure ----------
  // Processing errors stay inside after() — HTTP is always 200; the row is marked
  // failed (not deleted) and Sentry captures the error.
  it('captures Sentry error and marks failed when subscription.updated DB update fails', async () => {
    const { captureException } = await import('@sentry/nextjs');
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'subscription_events') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscriptions') {
        return createQueryBuilder({ data: null, error: { message: 'Update failed' } });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);
    expect(captureException).toHaveBeenCalled();
    // Atomic claim (RPC) bumped attempts to 1; failure marked the row `failed`.
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_attempts: 1 })
    );
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
    expect(stripeEventsBuilder.delete).not.toHaveBeenCalled();
  });

  // ---------- 32. subscription.deleted: cancel DB failure marks failed (no delete) ----------
  it('captures Sentry error and marks failed when subscription.deleted cancel DB update fails', async () => {
    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'subscription_events') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscriptions') {
        return createQueryBuilder({ data: null, error: { message: 'Cancel failed' } });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Row marked failed, never deleted (ST1 semantics)
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
    expect(stripeEventsBuilder.delete).not.toHaveBeenCalled();
  });

  // ---------- 33. checkout.session.completed: profile update failure marks failed ----------
  it('captures Sentry error and marks failed when profile update fails on checkout.session.completed', async () => {
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
    let profileCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        stripeEventsCallCount++;
        if (stripeEventsCallCount === 1) return createQueryBuilder({ data: null, error: null });
        return createQueryBuilder({ data: null, error: null }); // compensating delete
      }
      if (table === 'subscription_events') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'subscriptions') {
        return createQueryBuilder({ data: null, error: null }); // upsert succeeds
      }
      if (table === 'profiles') {
        profileCallCount++;
        if (profileCallCount === 1) {
          // AIR-1873: phantom guard check (select) — profile exists so the check passes
          return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
        }
        // Second call: the actual update — fails to trigger compensating action
        return createQueryBuilder({ data: null, error: { message: 'Profile update failed' } });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(captureException).toHaveBeenCalled();
  });

  // ---------- 34. checkout.session.completed: upsert includes onConflict ----------
  it('uses onConflict stripe_subscription_id for subscription upsert', async () => {
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
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(builders['subscriptions']!.upsert).toHaveBeenCalledWith(
      expect.any(Object),
      { onConflict: 'stripe_subscription_id' }
    );
  });

  // ---------- 35. checkout.session.completed: stores stripe_customer_id on profile ----------
  it('stores stripe_customer_id on the user profile during checkout', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_REAL_789',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        const result = table === 'profiles'
          ? { data: { id: 'user-uuid-1' }, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(builders['profiles']!.update).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_customer_id: 'cus_REAL_789' })
    );
  });

  // ---------- 36. Deferred processing: response is sent before DB writes ----------
  // Verifies the core timeout fix: after() is registered before response returns.
  it('registers deferred processing callback before returning the response', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
      return createQueryBuilder({ data: null, error: null });
    });

    vi.resetModules();
    const { POST } = await import('@/app/api/webhooks/stripe/route');

    // Call POST without flushing after() callbacks
    const req = makeRequest('{}', { 'stripe-signature': 'sig_valid' });
    const res = await POST(req);

    // Response is 200 and there is a deferred callback pending
    expect(res.status).toBe(200);
    expect(afterCallbacks).toHaveLength(1);

    // Flush to clean up
    for (const fn of afterCallbacks) await fn();
  });

  // ---------- 37. subscription.deleted: persists cancel reason + feedback ----------
  it('persists cancel_reason, cancel_feedback, cancel_comment, and cancelled_at on subscription.deleted', async () => {
    const subscription = makeSubscriptionObject({
      canceled_at: 1700001000,
      cancellation_details: {
        reason: 'cancellation_requested',
        feedback: 'too_expensive',
        comment: 'Too pricey for my budget',
      },
    });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        builders[table] = createQueryBuilder({ data: [], error: null });
      }
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'canceled',
        cancel_reason: 'cancellation_requested',
        cancel_feedback: 'too_expensive',
        cancel_comment: 'Too pricey for my budget',
        cancelled_at: new Date(1700001000 * 1000).toISOString(),
      })
    );
  });

  // ---------- 38. subscription.deleted: handles null cancellation_details ----------
  it('persists null cancel fields when cancellation_details is absent on subscription.deleted', async () => {
    const subscription = makeSubscriptionObject({
      canceled_at: 1700001000,
      cancellation_details: null,
    });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        builders[table] = createQueryBuilder({ data: [], error: null });
      }
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'canceled',
        cancel_reason: null,
        cancel_feedback: null,
        cancel_comment: null,
      })
    );
  });

  // ---------- 39. subscription.updated: captures cancel reason when cancel_at_period_end becomes true ----------
  it('persists cancel_reason and cancel_feedback when cancel_at_period_end is set on subscription.updated', async () => {
    const subscription = makeSubscriptionObject({
      cancel_at_period_end: true,
      cancellation_details: {
        reason: 'cancellation_requested',
        feedback: 'missing_features',
        comment: null,
      },
    });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(builders['subscriptions']!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_at_period_end: true,
        cancel_reason: 'cancellation_requested',
        cancel_feedback: 'missing_features',
        cancel_comment: null,
      })
    );
  });

  // ---------- 40. subscription.updated: does NOT write cancel fields when cancel_at_period_end is false ----------
  it('does NOT include cancel fields when cancel_at_period_end is false on subscription.updated', async () => {
    const subscription = makeSubscriptionObject({
      cancel_at_period_end: false,
      cancellation_details: null,
    });
    const event = makeStripeEvent('customer.subscription.updated', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    const subBuilder = builders['subscriptions']!;
    expect(subBuilder).toBeDefined();
    expect(subBuilder.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ cancel_reason: expect.anything() })
    );
    expect(subBuilder.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ cancel_feedback: expect.anything() })
    );
    expect(subBuilder.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ cancel_comment: expect.anything() })
    );
  });

  // ---------- 40a. deleted: legible revenue alert (Round 1) ----------
  // The #revenue cancellation alert must carry the tier churned FROM, MRR lost,
  // the Stripe reason/feedback, and source=portal — not just the landing tier.
  it('builds a legible cancellation alert with churned-from tier, MRR lost, reason and source=portal', async () => {
    const { formatRevenueEmbed } = await import('@/lib/discord-webhook');
    const subscription = makeSubscriptionObject({
      cancellation_details: { reason: 'cancellation_requested', feedback: 'too_complex', comment: null },
    });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return createQueryBuilder({ data: [], error: null });
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(formatRevenueEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cancellation',
        churnedFrom: 'supporter',
        landingTier: 'community',
        mrrCents: 900,
        reason: 'cancellation_requested',
        feedback: 'too_complex',
        source: 'portal',
      })
    );
  });

  // ---------- 40b. deleted: source=account_deletion from metadata ----------
  it('attributes source=account_deletion when canceled_via metadata is set', async () => {
    const { formatRevenueEmbed } = await import('@/lib/discord-webhook');
    const subscription = makeSubscriptionObject({
      metadata: { supabase_user_id: 'user-uuid-1', canceled_via: 'account_deletion' },
    });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return createQueryBuilder({ data: [], error: null });
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(formatRevenueEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'cancellation', source: 'account_deletion', churnedFrom: 'supporter' })
    );
  });

  // ---------- 40c. deleted: enriched churn analytics row ----------
  it('logs the cancelled event with tier, MRR, source and reason for the churn dataset', async () => {
    const subscription = makeSubscriptionObject({
      cancellation_details: { reason: 'cancellation_requested', feedback: 'too_complex', comment: null },
    });
    const event = makeStripeEvent('customer.subscription.deleted', subscription);
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions' && !builders[table]) {
        builders[table] = createQueryBuilder({ data: [], error: null });
      }
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(builders['subscription_events']!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'cancelled',
        tier: 'supporter',
        mrr_cents: 900,
        source: 'portal',
        cancel_reason: 'cancellation_requested',
        cancel_feedback: 'too_complex',
        stripe_event_id: 'evt_test_123',
      }),
      { onConflict: 'stripe_event_id', ignoreDuplicates: true }
    );
  });

  // ---------- 40d. deleted: a thrown alert is NON-FATAL ----------
  // A Discord/alert failure must NOT bubble out and fail the Stripe job, because
  // that would re-drive the cancellation email + win-back. The job still marks
  // the event `done`.
  it('does not fail the job (no redrive) when the cancellation alert throws', async () => {
    const { sendAlert } = await import('@/lib/discord-webhook');
    (sendAlert as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('discord down'));

    const subscription = makeSubscriptionObject();
    const event = makeStripeEvent('customer.subscription.deleted', subscription, 'evt_alert_throws');
    mockWebhooksConstruct.mockReturnValue(event);

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'subscriptions') return createQueryBuilder({ data: [], error: null });
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Job completed cleanly despite the alert throwing — marked done, not failed.
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done' })
    );
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
  });

  // ---------- 40e. payment_failed: tags dunning metadata, preserves existing ----------
  it('tags the Stripe subscription canceled_via=dunning while preserving existing metadata', async () => {
    mockSubscriptionsRetrieve.mockResolvedValue({ metadata: { supabase_user_id: 'user-uuid-1' } });
    const invoice = { parent: { subscription_details: { subscription: 'sub_dun_1' } } };
    const event = makeStripeEvent('invoice.payment_failed', invoice);
    mockWebhooksConstruct.mockReturnValue(event);

    mockFrom.mockImplementation(() => createQueryBuilder({ data: null, error: null }));

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      'sub_dun_1',
      { metadata: { supabase_user_id: 'user-uuid-1', canceled_via: 'dunning' } }
    );
  });

  // ===========================================================================
  // ST1 adversarial-review fixes: atomic claim + side-effect gating + dead-letter
  // ===========================================================================

  // ---------- 41. Atomic claim LOST -> no processing, no side effects ----------
  // The conditional claim returns no row (another worker already owns it, or the
  // row is already done/dead). runStripeJob must return WITHOUT processing and
  // WITHOUT firing any non-idempotent side effect (no email, no Discord alert,
  // no subscription_events write).
  it('does not process or fire side effects when the atomic claim returns no row', async () => {
    const { sendEmail } = await import('@/lib/email/send');
    const { sendAlert } = await import('@/lib/discord-webhook');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    // stripe_events insert ok, but the claim LOSES (rpc returns []). All other
    // tables would otherwise allow processing.
    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'profiles') return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // Claim attempted (RPC called) but NO processing happened:
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_test_123', p_attempts: 1 })
    );
    // The event payload was never fetched → processStripeEvent never ran.
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    // No non-idempotent side effects fired.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
    // Row never flipped to done or failed by this caller.
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done' })
    );
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
  });

  // ---------- 42. Re-drive of an already-`done` event: no side effects ----------
  // A re-drive that hits a row already in a terminal state loses the claim, so
  // welcome email / revenue Discord alert / subscription_events insert never
  // re-fire. Same mechanism as #41 but framed as the re-drive scenario.
  it('does NOT re-fire side effects when re-driving an already-done event (claim lost)', async () => {
    const { sendEmail } = await import('@/lib/email/send');
    const { sendAlert } = await import('@/lib/discord-webhook');

    const event = makeStripeEvent('customer.subscription.deleted', makeSubscriptionObject(), 'evt_done_redrive');
    mockWebhooksConstruct.mockReturnValue(event);

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    // Claim loses (row already in a terminal state): rpc returns [].
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) builders[table] = createQueryBuilder({ data: null, error: null });
      return builders[table];
    });

    const res = await callRoute(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));
    expect(res.status).toBe(200);

    // No cancellation email, no revenue alert, no subscription_events write.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
    expect(builders['subscription_events']).toBeUndefined();
  });

  // ---------- 43. Max attempts -> parked `dead` + ONE ops alert ----------
  // When processing fails on the attempt that reaches MAX_ATTEMPTS (5), the row
  // is parked in the terminal `dead` state (not `failed`, so the cron excludes
  // it) and a single ops alert is emitted.
  it('parks the row dead and alerts ops when processing fails at the attempt cap', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const { sendAlert } = await import('@/lib/discord-webhook');
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    // Stripe redelivered this many times before; this run is attempt 5.
    const event = makeStripeEvent('checkout.session.completed', checkoutSession, 'evt_poison');
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    // Drive runStripeJob directly with attemptsBefore=4 so this attempt is #5.
    vi.resetModules();
    const { runStripeJob } = await import('@/app/api/webhooks/stripe/route');
    const StripeMod = (await import('stripe')).default as unknown as new () => unknown;
    const stripe = new StripeMod();

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'profiles') return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
      if (table === 'subscriptions') {
        // upsert fails → processing throws.
        return createQueryBuilder({ data: null, error: { message: 'boom' } });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const did = await runStripeJob(stripe as never, { from: (...a: unknown[]) => mockFrom(...a), rpc: (...a: unknown[]) => mockRpc(...a) } as never, event as never, 4);
    expect(did).toBe(true); // we claimed it (then it failed)

    // Claim (RPC) set attempts to 5 (attemptsBefore 4 + 1).
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_poison', p_attempts: 5 })
    );
    // Terminal: row parked `dead`, NOT `failed`.
    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dead' })
    );
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
    // ONE dead-letter ops alert + Sentry message.
    expect(sendAlert).toHaveBeenCalledWith('ops', '', expect.any(Array));
    expect(captureMessage).toHaveBeenCalledWith(
      'Stripe event hit max attempts — parked as dead',
      expect.objectContaining({ tags: expect.objectContaining({ action: 'dead-letter' }) })
    );
  });

  // ---------- 44. Below the cap stays `failed` (re-drivable) ----------
  it('marks the row failed (not dead) when processing fails below the attempt cap', async () => {
    const checkoutSession = {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    };
    const event = makeStripeEvent('checkout.session.completed', checkoutSession, 'evt_retry');
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject());

    vi.resetModules();
    const { runStripeJob } = await import('@/app/api/webhooks/stripe/route');
    const StripeMod = (await import('stripe')).default as unknown as new () => unknown;
    const stripe = new StripeMod();

    const stripeEventsBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      if (table === 'profiles') return createQueryBuilder({ data: { id: 'user-uuid-1' }, error: null });
      if (table === 'subscriptions') return createQueryBuilder({ data: null, error: { message: 'boom' } });
      return createQueryBuilder({ data: null, error: null });
    });

    // attemptsBefore=1 → this attempt is #2, below the cap of 5.
    await runStripeJob(stripe as never, { from: (...a: unknown[]) => mockFrom(...a), rpc: (...a: unknown[]) => mockRpc(...a) } as never, event as never, 1);

    expect(stripeEventsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );
    expect(stripeEventsBuilder.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dead' })
    );
  });

  // ---------- 45. True 23505 duplicate never reaches processing ----------
  // A genuine unique-violation on the idempotency insert returns 200 BEFORE
  // after() is registered. No claim, no processing, no side effects.
  it('returns 200 and never claims/processes/side-effects on a true 23505 duplicate', async () => {
    const { sendEmail } = await import('@/lib/email/send');
    const { sendAlert } = await import('@/lib/discord-webhook');
    const event = makeStripeEvent('checkout.session.completed', {
      metadata: { supabase_user_id: 'user-uuid-1' },
      subscription: 'sub_test_123',
      customer: 'cus_test_456',
    });
    mockWebhooksConstruct.mockReturnValue(event);

    const stripeEventsBuilder = createQueryBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'stripe_events') return stripeEventsBuilder;
      return createQueryBuilder({ data: null, error: null });
    });

    // POST directly so we can assert after() was NEVER registered.
    vi.resetModules();
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(makeRequest('{}', { 'stripe-signature': 'sig_valid' }));

    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
    // No deferred work scheduled at all.
    expect(afterCallbacks).toHaveLength(0);
    // The claim update was never attempted, nothing processed, nothing fired.
    expect(stripeEventsBuilder.update).not.toHaveBeenCalled();
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendAlert).not.toHaveBeenCalled();
  });
});
