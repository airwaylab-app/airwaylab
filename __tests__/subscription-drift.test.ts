/**
 * Unit tests for app/api/cron/subscription-drift/route.ts
 *
 * Covers: syncRole called for downgrade_missed users with a discord_id,
 * discord_role_events row written with correct action on success/failure,
 * Sentry level is 'info' when auto-corrected and 'warning' when fix fails,
 * Stripe API fallback for webhook-blind profiles (AIR-1851).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

// Named fn so the closure in vi.mock factory survives vi.resetModules()
const mockCaptureException = vi.fn();
const mockCaptureSentryMessage = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureSentryMessage(...args),
}));

const mockSyncRole = vi.fn();
const mockIsDiscordConfigured = vi.fn();

vi.mock('@/lib/discord', () => ({
  syncRole: (...args: unknown[]) => mockSyncRole(...args),
  isDiscordConfigured: () => mockIsDiscordConfigured(),
}));

const mockSendAlert = vi.fn();
vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
  COLORS: { amber: 0xf59e0b },
}));

// Stripe mock — must use function (not arrow) since Stripe is called with `new`
const mockSubscriptionsList = vi.fn();
vi.mock('stripe', () => {
  const MockStripe = function MockStripe() {
    return {
      subscriptions: {
        list: (...args: unknown[]) => mockSubscriptionsList(...args),
      },
    };
  };
  return { default: MockStripe };
});

// Supabase mock — tracks insert/upsert calls
const insertCalls: Array<{ table: string; data: unknown }> = [];

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

/**
 * Build a profiles chain that handles all query patterns:
 *   1. .select().in('tier', [...])                    -> paid profiles
 *   2. .select().eq('tier','community').not()         -> community with subs
 *   3. .select().eq().not('stripe_customer_id').is()  -> webhook-blind profiles
 *   4. .update().eq('id', ...)                        -> fix update
 */
function buildProfilesChain(profile: Record<string, unknown>): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn().mockImplementation(() => chain);
  chain['in'] = vi.fn().mockResolvedValue({ data: [profile], error: null });
  chain['eq'] = vi.fn().mockImplementation(() => chain);
  chain['not'] = vi.fn().mockResolvedValue({ data: [], error: null });
  chain['is'] = vi.fn().mockResolvedValue({ data: [], error: null });
  chain['update'] = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  return chain;
}

function buildFromImpl(
  profile: Record<string, unknown>
): (table: string) => Record<string, unknown> {
  return (table: string) => {
    if (table === 'profiles') {
      return buildProfilesChain(profile);
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockImplementation((data: unknown) => {
          insertCalls.push({ table, data });
          return Promise.resolve({ error: null });
        }),
      };
    }
    if (table === 'discord_role_events') {
      return {
        insert: vi.fn().mockImplementation((data: unknown) => {
          insertCalls.push({ table, data });
          return Promise.resolve({ error: null });
        }),
      };
    }
    return {};
  };
}

/**
 * Build a from-mock for the webhook_never_ran scenario:
 * - Paid profiles query → returns []
 * - communityWithSubs query (.not('subscriptions',...)) → resolves directly with []
 * - webhookBlind query (.not('stripe_customer_id',...).is(...)) → returns [blindProfile]
 */
function buildWebhookBlindFromImpl(
  blindProfile: Record<string, unknown>
): (table: string) => Record<string, unknown> {
  return (table: string) => {
    if (table === 'profiles') {
      const chain: Record<string, unknown> = {};
      chain['select'] = vi.fn().mockImplementation(() => chain);
      chain['in'] = vi.fn().mockResolvedValue({ data: [], error: null }); // no paid profiles
      chain['eq'] = vi.fn().mockImplementation(() => chain);
      // Discriminate by field: communityWithSubs → resolves directly; webhookBlind → returns chain
      chain['not'] = vi.fn().mockImplementation((field: string) => {
        if (field === 'stripe_customer_id') return chain;
        return Promise.resolve({ data: [], error: null }); // communityWithSubs empty
      });
      chain['is'] = vi.fn().mockResolvedValue({ data: [blindProfile], error: null });
      chain['update'] = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      return chain;
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    if (table === 'discord_role_events') {
      return {
        insert: vi.fn().mockImplementation((data: unknown) => {
          insertCalls.push({ table, data });
          return Promise.resolve({ error: null });
        }),
      };
    }
    return {};
  };
}

/**
 * Build a from-mock where the profiles fix update returns an error,
 * simulating a failed auto-correction attempt.
 */
function buildFromImplWithFixError(
  profile: Record<string, unknown>
): (table: string) => Record<string, unknown> {
  return (table: string) => {
    if (table === 'profiles') {
      const chain: Record<string, unknown> = {};
      chain['select'] = vi.fn().mockImplementation(() => chain);
      chain['in'] = vi.fn().mockResolvedValue({ data: [profile], error: null });
      chain['eq'] = vi.fn().mockImplementation(() => chain);
      chain['not'] = vi.fn().mockImplementation((field: string) => {
        if (field === 'stripe_customer_id') return chain;
        return Promise.resolve({ data: [], error: null });
      });
      chain['is'] = vi.fn().mockResolvedValue({ data: [], error: null });
      chain['update'] = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }));
      return chain;
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    return {};
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('subscription-drift cron — Discord sync on downgrade_missed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    insertCalls.length = 0;
    process.env.CRON_SECRET = 'test-secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    mockIsDiscordConfigured.mockReturnValue(true);
    mockSyncRole.mockResolvedValue({ ok: true });
    mockSendAlert.mockResolvedValue(undefined);
    mockSubscriptionsList.mockResolvedValue({ data: [] });
  });

  it('calls syncRole for a downgrade_missed user who has a discord_id', async () => {
    const profile = { id: 'user-1', tier: 'supporter', email: 'test@example.com', discord_id: 'disc-999' };
    mockFrom.mockImplementation(buildFromImpl(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockSyncRole).toHaveBeenCalledWith('disc-999', 'community');
  });

  it('writes discord_role_events with action=revoke when syncRole succeeds', async () => {
    mockSyncRole.mockResolvedValue({ ok: true });
    const profile = { id: 'user-1', tier: 'supporter', email: 'test@example.com', discord_id: 'disc-999' };
    mockFrom.mockImplementation(buildFromImpl(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    const discordInsert = insertCalls.find((c) => c.table === 'discord_role_events');
    expect(discordInsert?.data).toMatchObject({ action: 'revoke', reason: 'drift_cron_cleanup' });
  });

  it('writes discord_role_events with action=revoke_failed when syncRole fails', async () => {
    mockSyncRole.mockResolvedValue({ ok: false });
    const profile = { id: 'user-1', tier: 'supporter', email: 'test@example.com', discord_id: 'disc-999' };
    mockFrom.mockImplementation(buildFromImpl(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    const discordInsert = insertCalls.find((c) => c.table === 'discord_role_events');
    expect(discordInsert?.data).toMatchObject({ action: 'revoke_failed', reason: 'drift_cron_cleanup' });
  });

  it('does NOT call syncRole when user has no discord_id', async () => {
    const profile = { id: 'user-2', tier: 'supporter', email: 'test2@example.com', discord_id: null };
    mockFrom.mockImplementation(buildFromImpl(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockSyncRole).not.toHaveBeenCalled();
  });
});

describe('subscription-drift cron — Sentry level reflects fix outcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    insertCalls.length = 0;
    process.env.CRON_SECRET = 'test-secret';
    mockIsDiscordConfigured.mockReturnValue(false);
    mockSendAlert.mockResolvedValue(undefined);
  });

  it('emits Sentry info (not warning) when downgrade_missed is auto-corrected', async () => {
    const profile = { id: 'user-3', tier: 'supporter', email: 'a@example.com', discord_id: null };
    mockFrom.mockImplementation(buildFromImpl(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    const call = mockCaptureSentryMessage.mock.calls.find(
      (args) => (args[1] as { tags?: Record<string, string> })?.tags?.drift_type === 'downgrade_missed'
    );
    expect(call).toBeDefined();
    expect((call![1] as { level: string }).level).toBe('info');
    expect((call![1] as { tags: Record<string, string> }).tags.fixed).toBe('true');
  });

  it('emits Sentry warning when downgrade_missed fix fails', async () => {
    const profile = { id: 'user-4', tier: 'supporter', email: 'b@example.com', discord_id: null };
    mockFrom.mockImplementation(buildFromImplWithFixError(profile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    const call = mockCaptureSentryMessage.mock.calls.find(
      (args) => (args[1] as { tags?: Record<string, string> })?.tags?.drift_type === 'downgrade_missed'
    );
    expect(call).toBeDefined();
    expect((call![1] as { level: string }).level).toBe('warning');
    expect((call![1] as { tags: Record<string, string> }).tags.fixed).toBe('false');
  });
});

describe('subscription-drift cron — webhook_never_ran detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    insertCalls.length = 0;
    process.env.CRON_SECRET = 'test-secret';
    // Ensure Stripe is not configured so we hit the webhook_never_ran path, not stripe_recovered.
    // STRIPE_SECRET_KEY can leak from earlier describe blocks since vi.clearAllMocks() doesn't reset env.
    delete process.env.STRIPE_SECRET_KEY;
    mockIsDiscordConfigured.mockReturnValue(false);
    mockSyncRole.mockResolvedValue(true);
    mockSendAlert.mockResolvedValue(undefined);
  });

  it('flags a community profile with stripe_customer_id but no subscription row as webhook_never_ran', async () => {
    const blindProfile = {
      id: 'user-blind',
      stripe_customer_id: 'cus_abc123',
      subscriptions: null,
    };
    mockFrom.mockImplementation(buildWebhookBlindFromImpl(blindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.webhook_never_ran).toBe(1);
    expect(mockCaptureSentryMessage).toHaveBeenCalledWith(
      'Subscription webhook never ran — Stripe not configured, manual review required',
      expect.objectContaining({
        tags: expect.objectContaining({ drift_type: 'webhook_never_ran' }),
        extra: expect.objectContaining({ user_id: 'user-blind' }),
      })
    );
  });

  it('does NOT auto-fix webhook_never_ran cases', async () => {
    const blindProfile = {
      id: 'user-blind',
      stripe_customer_id: 'cus_abc123',
      subscriptions: null,
    };
    const fromImpl = buildWebhookBlindFromImpl(blindProfile);
    mockFrom.mockImplementation(fromImpl);

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    // fixed count must be 0 — no auto-fix for webhook_never_ran
    expect(body.fixed).toBe(0);
    expect(body.webhook_never_ran).toBe(1);
  });

  it('includes webhook_never_ran count in Discord ops alert', async () => {
    const blindProfile = {
      id: 'user-blind',
      stripe_customer_id: 'cus_xyz456',
      subscriptions: null,
    };
    mockFrom.mockImplementation(buildWebhookBlindFromImpl(blindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockSendAlert).toHaveBeenCalledWith(
      'ops',
      '',
      expect.arrayContaining([
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'Webhook never ran (manual review)', value: '1' }),
          ]),
        }),
      ])
    );
  });
});

function buildStripeTestFromImpl(
  webhookBlindProfile: Record<string, unknown>
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
      chain['is'] = vi.fn().mockResolvedValue({ data: [webhookBlindProfile], error: null });
      chain['update'] = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      return chain;
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        upsert: vi.fn().mockImplementation((data: unknown) => {
          insertCalls.push({ table, data });
          return Promise.resolve({ error: null });
        }),
      };
    }
    return {};
  };
}

// ── Tests: Stripe API fallback (AIR-1851) ────────────────────────

describe('subscription-drift cron — Stripe API fallback for webhook-blind profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    insertCalls.length = 0;
    process.env.CRON_SECRET = 'test-secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_sup_mo';
    process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_sup_yr';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champ_mo';
    process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champ_yr';
    mockIsDiscordConfigured.mockReturnValue(false);
    mockSendAlert.mockResolvedValue(undefined);
  });

  it('inserts subscription row and upgrades profile when Stripe has active subscription', async () => {
    const webhookBlindProfile = { id: 'user-blind', stripe_customer_id: 'cus_test_123', subscriptions: null };

    mockSubscriptionsList.mockResolvedValue({
      data: [{
        id: 'sub_recovered_1',
        status: 'active',
        cancel_at_period_end: false,
        items: {
          data: [{
            price: { id: 'price_sup_mo' },
            current_period_start: 1700000000,
            current_period_end: 1702592000,
          }],
        },
      }],
    });

    mockFrom.mockImplementation(buildStripeTestFromImpl(webhookBlindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stripe_recovered).toBe(1);
    expect(body.fixed).toBe(1);

    const subInsert = insertCalls.find((c) => c.table === 'subscriptions');
    expect(subInsert?.data).toMatchObject({
      user_id: 'user-blind',
      stripe_subscription_id: 'sub_recovered_1',
      tier: 'supporter',
      status: 'active',
    });
  });

  it('emits Sentry warning when stripe_recovered mismatch is corrected', async () => {
    const webhookBlindProfile = { id: 'user-sentry', stripe_customer_id: 'cus_sentry_456', subscriptions: null };

    mockSubscriptionsList.mockResolvedValue({
      data: [{
        id: 'sub_sentry_1',
        status: 'active',
        cancel_at_period_end: false,
        items: {
          data: [{ price: { id: 'price_champ_mo' }, current_period_start: 1700000000, current_period_end: 1702592000 }],
        },
      }],
    });

    mockFrom.mockImplementation(buildStripeTestFromImpl(webhookBlindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockCaptureSentryMessage).toHaveBeenCalledWith(
      'Stripe-active subscription recovered — webhook was never processed',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ drift_type: 'stripe_recovered' }),
        extra: expect.objectContaining({
          user_id: 'user-sentry',
          stripe_subscription_id: 'sub_sentry_1',
          tier: 'champion',
        }),
      })
    );
  });

  it('skips profile when Stripe returns no active subscription', async () => {
    const webhookBlindProfile = { id: 'user-no-sub', stripe_customer_id: 'cus_no_sub', subscriptions: null };

    mockSubscriptionsList.mockResolvedValue({ data: [] });
    mockFrom.mockImplementation(buildStripeTestFromImpl(webhookBlindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stripe_recovered).toBe(0);
    expect(body.fixed).toBe(0);
    expect(insertCalls.filter((c) => c.table === 'subscriptions')).toHaveLength(0);
  });

  it('returns webhook_never_ran=1 and skips auto-fix when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const webhookBlindProfile = { id: 'user-no-stripe', stripe_customer_id: 'cus_no_stripe', subscriptions: null };

    mockFrom.mockImplementation(buildStripeTestFromImpl(webhookBlindProfile));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.webhook_never_ran).toBe(1);
    expect(body.fixed).toBe(0);
    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });
});

// ── Tests: aggregate Sentry error ────────────────────────────────

describe('subscription-drift cron — aggregate Sentry error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    insertCalls.length = 0;
    process.env.CRON_SECRET = 'test-secret';
    mockIsDiscordConfigured.mockReturnValue(false);
    mockSyncRole.mockResolvedValue(true);
    mockSendAlert.mockResolvedValue(undefined);
  });

  function buildAggChain(paidResults: unknown[]): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    chain['select'] = vi.fn().mockImplementation(() => chain);
    chain['in'] = vi.fn().mockResolvedValue({ data: paidResults, error: null });
    chain['eq'] = vi.fn().mockImplementation(() => chain);
    chain['not'] = vi.fn().mockImplementation((field: string) => {
      if (field === 'stripe_customer_id') return chain; // webhookBlind — needs .is() next
      return Promise.resolve({ data: [], error: null }); // communityWithSubs — terminal
    });
    chain['is'] = vi.fn().mockResolvedValue({ data: [], error: null }); // no webhook-blind profiles
    chain['update'] = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    return chain;
  }

  it('fires one aggregate Sentry error with fingerprint when mismatches are found', async () => {
    const profile = { id: 'user-agg', tier: 'supporter', email: 'agg@example.com', discord_id: null };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return buildAggChain([profile]);
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(mockCaptureSentryMessage).toHaveBeenCalledWith(
      expect.stringContaining('subscription-drift-cron'),
      expect.objectContaining({
        level: 'error',
        fingerprint: ['subscription-drift-cron-mismatch'],
        extra: expect.objectContaining({ mismatches: 1 }),
      })
    );
  });

  it('does NOT fire an aggregate Sentry error when there are no mismatches', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return buildAggChain([]);
      if (table === 'subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.mismatches).toBe(0);
    const errorCalls = mockCaptureSentryMessage.mock.calls.filter(
      (args: unknown[]) =>
        typeof args[1] === 'object' &&
        args[1] !== null &&
        (args[1] as Record<string, unknown>)['level'] === 'error'
    );
    expect(errorCalls).toHaveLength(0);
  });
});
