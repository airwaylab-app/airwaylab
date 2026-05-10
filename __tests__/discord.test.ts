/**
 * Unit tests for lib/discord.ts
 *
 * Covers: syncRole SyncRoleResult propagation for removal/add failures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Control fetch responses via this map
const fetchResponses: Map<string, { ok: boolean; status: number }> = new Map();

vi.stubGlobal('fetch', (url: string, opts: RequestInit) => {
  const method = opts.method ?? 'GET';
  const key = `${method}:${url}`;
  const resp = fetchResponses.get(key) ?? { ok: true, status: 204 };
  return Promise.resolve({
    ok: resp.ok,
    status: resp.status,
    text: () => Promise.resolve(''),
  });
});

// Set env vars so isDiscordConfigured() returns true
beforeEach(() => {
  fetchResponses.clear();
  process.env.DISCORD_BOT_TOKEN = 'bot-token';
  process.env.DISCORD_GUILD_ID = 'guild-123';
  process.env.DISCORD_SUPPORTER_ROLE_ID = 'role-supporter';
  process.env.DISCORD_CHAMPION_ROLE_ID = 'role-champion';
  vi.resetModules();
});

describe('syncRole', () => {
  it('returns ok:true when all removals succeed and no role to add (community)', async () => {
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result.ok).toBe(true);
  });

  it('still returns ok:true for community tier when a removal fails (best-effort cleanup)', async () => {
    // Removal failures do not fail the operation — best-effort cleanup
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 429 }
    );

    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result.ok).toBe(true);
  });

  it('returns ok:false when role add fails and includes httpStatus', async () => {
    fetchResponses.set(
      'PUT:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-champion',
      { ok: false, status: 403 }
    );

    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'champion');
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(403);
  });

  it('fires a Sentry error when role add fails', async () => {
    fetchResponses.set(
      'PUT:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 500 }
    );

    const Sentry = await import('@sentry/nextjs');
    const { syncRole } = await import('@/lib/discord');
    await syncRole('user-abc', 'supporter');

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Discord role assignment failed'),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ action: 'discord-sync-role' }),
      })
    );
  });

  it('returns ok:true when all removals and add succeed', async () => {
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'supporter');
    expect(result.ok).toBe(true);
    expect(result.httpStatus).toBe(204);
  });
});
