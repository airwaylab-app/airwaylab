/**
 * Unit tests for lib/discord.ts
 *
 * Covers: syncRole failure propagation when removeMemberRole returns false.
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
  it('returns true when all removeMemberRole calls succeed and no role to add', async () => {
    // All DELETE calls succeed (ok: true, status: 204)
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result).toBe(true);
  });

  it('returns false when a removeMemberRole call returns false', async () => {
    // Make the supporter-role DELETE fail
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 429 }
    );

    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result).toBe(false);
  });

  it('fires a Sentry warning when a removal fails', async () => {
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-champion',
      { ok: false, status: 500 }
    );

    const Sentry = await import('@sentry/nextjs');
    const { syncRole } = await import('@/lib/discord');
    await syncRole('user-abc', 'community');

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Discord role removal failed',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ action: 'discord-remove-role-failed' }),
      })
    );
  });

  it('returns false overall when removal fails even if role add succeeds', async () => {
    // Make the supporter DELETE fail
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 429 }
    );
    // PUT for champion role assignment succeeds
    fetchResponses.set(
      'PUT:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-champion',
      { ok: true, status: 204 }
    );

    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'champion');
    expect(result).toBe(false);
  });

  it('returns true when all removals and add succeed', async () => {
    // All calls default to ok — add champion role
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'supporter');
    expect(result).toBe(true);
  });
});
