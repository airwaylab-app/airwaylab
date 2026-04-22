/**
 * Tests for the Discord sync cron (app/api/cron/discord-sync/route.ts).
 *
 * Covers: auth guard, persistent-failure backoff (error count increment,
 * threshold exclusion), success path (counter reset), not-found path,
 * Sentry emission rules (first + threshold only), and ops alert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockSearchGuildMember = vi.fn();
const mockSyncRole = vi.fn();

vi.mock('@/lib/discord', () => ({
  isDiscordConfigured: vi.fn().mockReturnValue(true),
  searchGuildMember: (...args: unknown[]) => mockSearchGuildMember(...args),
  syncRole: (...args: unknown[]) => mockSyncRole(...args),
}));

const mockSendAlert = vi.fn();
vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
  COLORS: { amber: 0xf59e0b },
}));

// Chainable Supabase mock ─────────────────────────────────────────
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  _result: { data: unknown; error: unknown };
};

function makeBuilder(result: { data: unknown; error: unknown }): MockBuilder {
  const b: MockBuilder = {
    _result: result,
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // The last awaited call on the chain resolves to result
  // The `lt` filter is the final link before await in the query path.
  b.lt.mockResolvedValue(result);
  b.eq.mockResolvedValue({ error: null });
  return b;
}

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────

function makeRequest(secret = 'test-secret'): NextRequest {
  return {
    headers: {
      get: (h: string) => (h === 'authorization' ? `Bearer ${secret}` : null),
    },
  } as unknown as NextRequest;
}

// Fake profile row
function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    discord_username: 'colorado_24106',
    tier: 'supporter',
    discord_sync_error_count: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('discord-sync cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    mockSyncRole.mockResolvedValue(true);
    mockSendAlert.mockResolvedValue(undefined);
  });

  it('returns 401 for wrong CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/discord-sync/route');
    const res = await GET(makeRequest('wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with zeros when no unlinked users', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { GET } = await import('@/app/api/cron/discord-sync/route');
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.checked).toBe(0);
    expect(body.resolved).toBe(0);
  });

  it('increments discord_sync_error_count on API error', async () => {
    const p = profile({ discord_sync_error_count: 0 });
    const builder = makeBuilder({ data: [p], error: null });
    const updateBuilder = { eq: vi.fn().mockResolvedValue({ error: null }) };
    builder.update = vi.fn().mockReturnValue(updateBuilder);
    mockFrom.mockReturnValue(builder);

    mockSearchGuildMember.mockResolvedValue({ status: 'error', message: 'Discord API error (429)' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ discord_sync_error_count: 1 })
    );
  });

  it('excludes users at the error threshold from the query', async () => {
    // The cron filters lt('discord_sync_error_count', 5) — this is verified
    // by checking the lt() call receives the threshold value.
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    expect(builder.lt).toHaveBeenCalledWith('discord_sync_error_count', 5);
  });

  it('fires Sentry only on first error, not intermediate retries', async () => {
    const Sentry = await import('@sentry/nextjs');
    const p = profile({ discord_sync_error_count: 1 }); // second failure (count going to 2)
    const builder = makeBuilder({ data: [p], error: null });
    const updateBuilder = { eq: vi.fn().mockResolvedValue({ error: null }) };
    builder.update = vi.fn().mockReturnValue(updateBuilder);
    mockFrom.mockReturnValue(builder);

    mockSearchGuildMember.mockResolvedValue({ status: 'error', message: 'API error' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    // count goes from 1 → 2, which is neither 1 (first) nor 5 (threshold) — no Sentry
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('fires Sentry when threshold is reached', async () => {
    const Sentry = await import('@sentry/nextjs');
    const p = profile({ discord_sync_error_count: 4 }); // next failure hits threshold
    const builder = makeBuilder({ data: [p], error: null });
    const updateBuilder = { eq: vi.fn().mockResolvedValue({ error: null }) };
    builder.update = vi.fn().mockReturnValue(updateBuilder);
    mockFrom.mockReturnValue(builder);

    mockSearchGuildMember.mockResolvedValue({ status: 'error', message: 'API error' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('threshold reached'),
      expect.objectContaining({ level: 'error' })
    );
  });

  it('resets error count to 0 on successful link', async () => {
    const p = profile({ discord_sync_error_count: 2 });

    // from('profiles') is called three times: initial query, dupe check, update.
    // Each call must return a fresh mock so the chain methods don't conflict.
    let profilesCallCount = 0;
    const updateData: Array<Record<string, unknown>> = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        profilesCallCount++;
        if (profilesCallCount === 1) {
          // Initial query chain: select → not → is → in → lt (resolves to profile list)
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            lt: vi.fn().mockResolvedValue({ data: [p], error: null }),
          };
        }
        if (profilesCallCount === 2) {
          // Dupe check chain: select → eq → neq → maybeSingle (no conflict)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        }
        // Auto-link update chain: update → eq
        return {
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            updateData.push(data);
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
          }),
        };
      }
      if (table === 'discord_role_events') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'discord_pending_roles') {
        return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      return makeBuilder({ data: [], error: null });
    });

    mockSearchGuildMember.mockResolvedValue({ status: 'found', discordId: 'disc-123' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    expect(updateData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ discord_sync_error_count: 0, discord_sync_last_error: null }),
      ])
    );
  });

  it('sends ops alert when errors > 0', async () => {
    const p = profile();
    const builder = makeBuilder({ data: [p], error: null });
    const updateBuilder = { eq: vi.fn().mockResolvedValue({ error: null }) };
    builder.update = vi.fn().mockReturnValue(updateBuilder);
    mockFrom.mockReturnValue(builder);

    mockSearchGuildMember.mockResolvedValue({ status: 'error', message: 'Timeout' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    await GET(makeRequest());

    expect(mockSendAlert).toHaveBeenCalledWith('ops', '', expect.any(Array));
  });

  it('counts not_found separately without incrementing error count', async () => {
    const p = profile();
    const builder = makeBuilder({ data: [p], error: null });
    builder.update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue(builder);

    mockSearchGuildMember.mockResolvedValue({ status: 'not_found' });

    const { GET } = await import('@/app/api/cron/discord-sync/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.not_found).toBe(1);
    expect(body.errors).toBe(0);
    // update should NOT have been called for a not_found
    expect(builder.update).not.toHaveBeenCalled();
  });
});
