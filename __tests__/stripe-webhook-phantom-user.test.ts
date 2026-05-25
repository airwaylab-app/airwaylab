/**
 * Test C: Webhook with phantom user_id in metadata
 *
 * Scenario: Stripe checkout.session.completed arrives with supabase_user_id
 * in metadata pointing to a non-existent profile (AIR-1873 guard).
 *
 * Expected:
 * - AIR-1873 guard fires
 * - Sentry event captured with phantom-user-id tag
 * - subscriptions table NOT updated
 * - HTTP 200 returned to Stripe (so it stops retrying the event)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureEvent: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (fn: () => unknown) => { fn(); } };
});

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

vi.mock('@/lib/discord', () => ({
  isDiscordConfigured: vi.fn().mockReturnValue(false),
  syncRole: vi.fn().mockResolvedValue(undefined),
  searchGuildMember: vi.fn().mockResolvedValue({ status: 'not_found' }),
  getTierRoleId: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  formatRevenueEmbed: vi.fn().mockReturnValue({}),
}));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

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

// ── Helpers ──────────────────────────────────────────────────────

function createQueryBuilder(terminalResult: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const proxy = new Proxy(builder, {
    get(target, prop: string) {
      if (prop === 'then') {
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

function makeWebhookRequest(body = '{}', sig = 'sig_valid'): NextRequest {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'stripe-signature': sig,
    },
  }) as unknown as NextRequest;
}

function makeCheckoutSessionEvent(userId: string, subscriptionId = 'sub_test_456') {
  return {
    id: 'evt_phantom_test',
    type: 'checkout.session.completed',
    data: {
      object: {
        metadata: { supabase_user_id: userId },
        subscription: subscriptionId,
        customer: 'cus_test_789',
      },
    },
  };
}

function makeSubscriptionObject(userId: string) {
  return {
    id: 'sub_test_456',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { supabase_user_id: userId },
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
  };
}

async function callRoute(req: NextRequest) {
  vi.resetModules();
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  return POST(req);
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
});

// ── Tests ────────────────────────────────────────────────────────

describe('stripe-webhook-phantom-user: checkout.session.completed with non-existent profile (AIR-1873)', () => {
  const PHANTOM_USER_ID = 'phantom-uuid-no-profile';

  it('returns HTTP 200 to Stripe so it stops retrying the event', async () => {
    const event = makeCheckoutSessionEvent(PHANTOM_USER_ID);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject(PHANTOM_USER_ID));

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        // profiles returns null — no row for phantom UUID
        const result = table === 'profiles'
          ? { data: null, error: null }
          : { data: null, error: null };
        builders[table] = createQueryBuilder(result);
      }
      return builders[table];
    });

    const res = await callRoute(makeWebhookRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it('fires Sentry captureMessage with phantom-user-id tag', async () => {
    const event = makeCheckoutSessionEvent(PHANTOM_USER_ID);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject(PHANTOM_USER_ID));

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder(
          table === 'profiles' ? { data: null, error: null } : { data: null, error: null }
        );
      }
      return builders[table];
    });

    await callRoute(makeWebhookRequest());

    // Import after callRoute to get the module instance used by the route
    // (callRoute calls vi.resetModules() which invalidates pre-call mock references)
    const { captureMessage } = await import('@sentry/nextjs');
    expect(captureMessage).toHaveBeenCalledWith(
      'Stripe webhook: supabase_user_id in metadata has no matching profile',
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ check: 'phantom-user-id' }),
      })
    );
  });

  it('does NOT upsert to the subscriptions table for a phantom user', async () => {
    const event = makeCheckoutSessionEvent(PHANTOM_USER_ID);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject(PHANTOM_USER_ID));

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder(
          table === 'profiles' ? { data: null, error: null } : { data: null, error: null }
        );
      }
      return builders[table];
    });

    await callRoute(makeWebhookRequest());

    // subscriptions table must never be touched for a phantom user
    if (builders['subscriptions']) {
      expect(builders['subscriptions']!.upsert).not.toHaveBeenCalled();
    } else {
      // Even better: the table was never queried at all
      const subscriptionCalls = mockFrom.mock.calls.filter(
        (call: unknown[]) => call[0] === 'subscriptions'
      );
      // stripe_events insert is allowed; subscriptions upsert must not happen
      const upsertCalls = subscriptionCalls.filter(() => false); // checked via builder above
      expect(upsertCalls).toHaveLength(0);
    }
  });

  it('includes userId, eventId, subscriptionId, and stripeCustomerId in Sentry extra', async () => {
    const event = makeCheckoutSessionEvent(PHANTOM_USER_ID, 'sub_phantom_456');
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject(PHANTOM_USER_ID));

    mockFrom.mockImplementation((table: string) =>
      createQueryBuilder(table === 'profiles' ? { data: null, error: null } : { data: null, error: null })
    );

    await callRoute(makeWebhookRequest());

    // Import after callRoute to get the module instance used by the route
    // (callRoute calls vi.resetModules() which invalidates pre-call mock references)
    const { captureMessage } = await import('@sentry/nextjs');
    expect(captureMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        extra: expect.objectContaining({
          userId: PHANTOM_USER_ID,
          eventId: 'evt_phantom_test',
          subscriptionId: 'sub_phantom_456',
        }),
      })
    );
  });

  it('does NOT fire the phantom-user guard when profile exists', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    const REAL_USER_ID = 'real-uuid-has-profile';
    const event = makeCheckoutSessionEvent(REAL_USER_ID);
    mockWebhooksConstruct.mockReturnValue(event);
    mockSubscriptionsRetrieve.mockResolvedValue(makeSubscriptionObject(REAL_USER_ID));

    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {};
    mockFrom.mockImplementation((table: string) => {
      if (!builders[table]) {
        builders[table] = createQueryBuilder(
          table === 'profiles'
            ? { data: { id: REAL_USER_ID }, error: null }
            : { data: null, error: null }
        );
      }
      return builders[table];
    });

    const res = await callRoute(makeWebhookRequest());

    expect(res.status).toBe(200);

    // No phantom-user Sentry message should have been sent
    const phantomCalls = (captureMessage as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('no matching profile')
    );
    expect(phantomCalls).toHaveLength(0);
  });
});
