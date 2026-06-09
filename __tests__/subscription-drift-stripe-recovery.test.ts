/**
 * Unit tests for Stripe API recovery in app/api/cron/subscription-drift/route.ts
 *
 * Covers the webhook_never_ran → Stripe classification path:
 *   1. Active sub found: subscription upserted, profile tier updated, stripe_recovered++
 *   2. Trialing sub found: recovered (treated as paid)
 *   3. No sub in Stripe: abandoned checkout — NOT a mismatch, NOT alerted
 *   4. Canceled-only customer: abandoned checkout — NOT a mismatch
 *   5. past_due sub found: surfaced for manual review, not auto-fixed
 *   6. Stripe API error: captureException called, no crash, surfaced for manual review
 *   7. Subscription upsert fails: captureException called, mismatch not fixed
 *   8. Profile update fails: captureException called, mismatch not fixed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/discord', () => ({
  syncRole: vi.fn(),
  isDiscordConfigured: vi.fn(() => false),
}));

const mockSendAlert = vi.fn();
vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
  COLORS: { green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, blue: 0x3b82f6, purple: 0x8b5cf6, teal: 0x14b8a6 },
  _budget: { date: '', count: 0 },
  routeAlert: vi.fn().mockResolvedValue(false),
  sendOpsAlert: vi.fn().mockResolvedValue(false),
  sendCriticalAlert: vi.fn().mockResolvedValue(false),
  alertCredentialExpiry: vi.fn().mockResolvedValue(false),
  alertStripePaymentFailed: vi.fn().mockResolvedValue(false),
  alertSecurityIncident: vi.fn().mockResolvedValue(false),
  formatMonitorEmbed: vi.fn().mockReturnValue({}),
  formatRevenueEmbed: vi.fn().mockReturnValue({}),
  formatUserSignalEmbed: vi.fn().mockReturnValue({}),
  formatEmailAlertEmbed: vi.fn().mockReturnValue({}),
  formatBroadcastEmbed: vi.fn().mockReturnValue({}),
  formatGrowthEmbed: vi.fn().mockReturnValue({}),
}));

// Stripe mock — controlled per test via mockStripeSubsList
const mockStripeSubsList = vi.fn();
vi.mock('stripe', () => {
  class MockStripe {
    subscriptions = {
      list: (...args: unknown[]) => mockStripeSubsList(...args),
    };
  }
  return { default: MockStripe };
});

// Supabase upsert/update mock — controlled per test
const mockSubscriptionsUpsert = vi.fn();
const mockProfilesUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

function makeRequest(secret = 'test-secret'): NextRequest {
  return {
    headers: {
      get: (h: string) => (h === 'authorization' ? `Bearer ${secret}` : null),
    },
  } as unknown as NextRequest;
}

function makeActiveSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_abc123',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: { id: 'price_supporter_monthly' },
          current_period_end: 1800000000,
        },
      ],
    },
    ...overrides,
  };
}

/** Same shape as makeActiveSub but with an explicit Stripe status. */
function makeSub(status: string, overrides: Record<string, unknown> = {}) {
  return makeActiveSub({ status, ...overrides });
}

/**
 * Build a from-mock for the webhook_never_ran recovery scenario:
 * - Paid profiles (.in) → []
 * - communityWithSubs (.not('subscriptions',...)) → []
 * - webhookBlind (.not('stripe_customer_id',...).is(...)) → [blindProfile]
 * - subscriptions.upsert → delegate to mockSubscriptionsUpsert
 * - profiles.update → delegate to mockProfilesUpdate
 */
function buildRecoveryFromImpl(
  blindProfile: Record<string, unknown>
): (table: string) => Record<string, unknown> {
  return (table: string) => {
    if (table === 'profiles') {
      const chain: Record<string, unknown> = {};
      chain['select'] = vi.fn().mockImplementation(() => chain);
      chain['in'] = vi.fn().mockResolvedValue({ data: [], error: null });
      chain['eq'] = vi.fn().mockImplementation(() => chain);
      chain['not'] = vi.fn().mockImplementation((field: string) => {
        if (field === 'stripe_customer_id') return chain;
        return Promise.resolve({ data: [], error: null });
      });
      chain['is'] = vi.fn().mockResolvedValue({ data: [blindProfile], error: null });
      chain['update'] = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation((..._args: unknown[]) => mockProfilesUpdate()),
      }));
      return chain;
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockImplementation((..._args: unknown[]) => mockSubscriptionsUpsert()),
      };
    }
    if (table === 'stripe_events') {
      // ST1 re-drive query: no failed/stale rows in these recovery scenarios.
      // The query chain is .select().lt(attempts, MAX_ATTEMPTS).or().order().limit().
      return {
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {};
  };
}

const blindProfile = {
  id: 'user-blind',
  stripe_customer_id: 'cus_abc123',
  subscriptions: null,
};

// ── Tests ─────────────────────────────────────────────────────────

describe('subscription-drift cron — Stripe API recovery for webhook_never_ran', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.CRON_SECRET = 'test-secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';
    mockSendAlert.mockResolvedValue(undefined);
    mockSubscriptionsUpsert.mockResolvedValue({ error: null });
    mockProfilesUpdate.mockResolvedValue({ error: null });
    mockFrom.mockImplementation(buildRecoveryFromImpl(blindProfile));
  });

  it('recovers active subscription: upserts sub row, updates profile tier, increments stripe_recovered', async () => {
    const Sentry = await import('@sentry/nextjs');
    mockStripeSubsList.mockResolvedValue({ data: [makeActiveSub()] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(1);
    expect(body.fixed).toBe(1);
    expect(mockSubscriptionsUpsert).toHaveBeenCalledTimes(1);
    expect(mockProfilesUpdate).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Stripe subscription recovered via API in drift cron',
      expect.objectContaining({
        tags: expect.objectContaining({ drift_type: 'stripe_recovered' }),
        extra: expect.objectContaining({ user_id: 'user-blind', stripe_customer_id: 'cus_abc123' }),
      })
    );
  });

  it('queries Stripe across all statuses (not active-only) so trialing/past_due are visible', async () => {
    mockStripeSubsList.mockResolvedValue({ data: [makeActiveSub()] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockStripeSubsList).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_abc123', status: 'all' })
    );
  });

  it('recovers a trialing subscription (treated as paid)', async () => {
    mockStripeSubsList.mockResolvedValue({ data: [makeSub('trialing')] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(1);
    expect(body.fixed).toBe(1);
    expect(mockSubscriptionsUpsert).toHaveBeenCalledTimes(1);
    expect(mockProfilesUpdate).toHaveBeenCalledTimes(1);
  });

  it('treats a customer with no subscription as an abandoned checkout — no mismatch, no alert', async () => {
    mockStripeSubsList.mockResolvedValue({ data: [] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(0);
    expect(body.fixed).toBe(0);
    expect(body.mismatches).toBe(0);
    expect(body.webhook_never_ran).toBe(0);
    expect(body.abandoned_checkouts).toBe(1);
    expect(mockSubscriptionsUpsert).not.toHaveBeenCalled();
    expect(mockProfilesUpdate).not.toHaveBeenCalled();
    // No mismatch + no re-drive activity → the daily ops alert must NOT fire.
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it('treats a fully-canceled customer as an abandoned checkout — no mismatch', async () => {
    mockStripeSubsList.mockResolvedValue({ data: [makeSub('canceled')] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.mismatches).toBe(0);
    expect(body.abandoned_checkouts).toBe(1);
    expect(mockSubscriptionsUpsert).not.toHaveBeenCalled();
  });

  it('surfaces a past_due subscription for manual review without auto-fixing', async () => {
    const Sentry = await import('@sentry/nextjs');
    mockStripeSubsList.mockResolvedValue({ data: [makeSub('past_due')] });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(0);
    expect(body.fixed).toBe(0);
    expect(body.webhook_never_ran).toBe(1);
    expect(body.abandoned_checkouts).toBe(0);
    expect(mockSubscriptionsUpsert).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Subscription webhook never ran — manual review required',
      expect.objectContaining({
        tags: expect.objectContaining({ drift_type: 'webhook_never_ran' }),
        extra: expect.objectContaining({ user_id: 'user-blind', stripe_status: 'past_due' }),
      })
    );
  });

  it('captures exception and does not crash when Stripe API call fails', async () => {
    const Sentry = await import('@sentry/nextjs');
    mockStripeSubsList.mockRejectedValue(new Error('Stripe network error'));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.stripe_recovered).toBe(0);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ action: 'stripe-recovery-api' }),
        extra: expect.objectContaining({ user_id: 'user-blind' }),
      })
    );
  });

  it('captures exception and leaves mismatch unfixed when subscription upsert fails', async () => {
    const Sentry = await import('@sentry/nextjs');
    mockStripeSubsList.mockResolvedValue({ data: [makeActiveSub()] });
    mockSubscriptionsUpsert.mockResolvedValue({ error: new Error('upsert failed') });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(0);
    expect(body.fixed).toBe(0);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ action: 'stripe-recovery-upsert' }),
      })
    );
  });

  it('captures exception and leaves mismatch unfixed when profile update fails', async () => {
    const Sentry = await import('@sentry/nextjs');
    mockStripeSubsList.mockResolvedValue({ data: [makeActiveSub()] });
    mockSubscriptionsUpsert.mockResolvedValue({ error: null });
    mockProfilesUpdate.mockResolvedValue({ error: new Error('profile update failed') });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(0);
    expect(body.fixed).toBe(0);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ action: 'stripe-recovery-profile' }),
      })
    );
  });
});
