/**
 * Unit tests for app/api/cron/subscription-drift/route.ts
 *
 * Covers: syncRole called for downgrade_missed users with a discord_id,
 * discord_role_events row written with correct action on success/failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
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
 * Build a from-mock that uses method-chain discrimination to handle all three
 * profiles query patterns:
 *   1. .select().in('tier', [...])        → paid profiles (returns [profile])
 *   2. .select().eq('tier','community').not() → community profiles (returns [])
 *   3. .update().eq('id', ...)            → fix update (returns { error: null })
 */
function buildProfilesChain(profile: Record<string, unknown>): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn().mockImplementation(() => chain);
  chain['in'] = vi.fn().mockResolvedValue({ data: [profile], error: null });
  chain['eq'] = vi.fn().mockImplementation(() => chain);
  chain['not'] = vi.fn().mockResolvedValue({ data: [], error: null });
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
