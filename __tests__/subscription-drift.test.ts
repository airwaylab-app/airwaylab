/**
 * Unit tests for app/api/cron/subscription-drift/route.ts
 *
 * Covers: syncRole called for downgrade_missed users with a discord_id,
 * discord_role_events row written with correct action on success/failure,
 * Sentry level is 'info' when auto-corrected and 'warning' when fix fails.
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

// Supabase mock — tracks insert calls
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
 * Build a from-mock that uses method-chain discrimination to handle all query patterns:
 *   1. .select().in('tier', [...])                → paid profiles (returns [profile])
 *   2. .select().eq('tier','community').not()...  → community profiles with subs (returns [])
 *   3. .select().eq('tier','community').not().is() → webhook-blind profiles (returns [])
 *   4. .update().eq('id', ...)                    → fix update (returns { error: null })
 *
 * The profiles chain tracks call order to distinguish the two community queries:
 * - first .not() call → communityWithSubs (returns data: [])
 * - second .not() call → webhookBlind (returns data: [])
 */
function buildProfilesChain(profile: Record<string, unknown>): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn().mockImplementation(() => chain);
  chain['in'] = vi.fn().mockResolvedValue({ data: [profile], error: null });
  chain['eq'] = vi.fn().mockImplementation(() => chain);
  // Discriminate by field: communityWithSubs uses .not('subscriptions',...) → resolves directly.
  // webhookBlind uses .not('stripe_customer_id',...).is(...) → returns chain so .is() can follow.
  chain['not'] = vi.fn().mockImplementation((field: string) => {
    if (field === 'stripe_customer_id') return chain; // webhookBlind — needs .is() next
    return Promise.resolve({ data: [], error: null }); // communityWithSubs — terminal call
  });
  chain['is'] = vi.fn().mockResolvedValue({ data: [], error: null }); // webhookBlind result: no blind profiles
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
    mockIsDiscordConfigured.mockReturnValue(true);
    mockSyncRole.mockResolvedValue({ ok: true });
    mockSendAlert.mockResolvedValue(undefined);
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
      'Subscription webhook never ran — manual review required',
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
