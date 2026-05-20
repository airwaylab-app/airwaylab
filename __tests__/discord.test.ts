/**
 * Unit tests for lib/discord.ts
 *
 * Covers: syncRole failure propagation — removals are best-effort (console.error,
 * no Sentry, continue regardless); SyncRoleResult.ok reflects add success only.
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
  vi.clearAllMocks();
  process.env.DISCORD_BOT_TOKEN = 'bot-token';
  process.env.DISCORD_GUILD_ID = 'guild-123';
  process.env.DISCORD_SUPPORTER_ROLE_ID = 'role-supporter';
  process.env.DISCORD_CHAMPION_ROLE_ID = 'role-champion';
  vi.resetModules();
});

describe('syncRole', () => {
  it('returns ok:true when all removeMemberRole calls succeed and no role to add', async () => {
    // All DELETE calls succeed (ok: true, status: 204)
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result.ok).toBe(true);
  });

  it('returns ok:true for community tier even when a removal fails (best-effort)', async () => {
    // Removal failures are logged to console but do not flip ok — community gets no add step
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 429 }
    );

    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');
    expect(result.ok).toBe(true);
  });

  it('does NOT fire Sentry when a removal fails (best-effort, console.error only)', async () => {
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-champion',
      { ok: false, status: 500 }
    );

    const Sentry = await import('@sentry/nextjs');
    const { syncRole } = await import('@/lib/discord');
    await syncRole('user-abc', 'community');

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('returns ok:true when add succeeds even if a removal failed (best-effort removal)', async () => {
    // Removal fails but we continue; champion PUT succeeds — result is ok
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
    expect(result.ok).toBe(true);
  });

  it('returns false and fires a Sentry error when role add fails', async () => {
    fetchResponses.set(
      'PUT:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 403 }
    );

    const Sentry = await import('@sentry/nextjs');
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'supporter');

    expect(result.ok).toBe(false);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Discord role assignment failed'),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ action: 'discord-sync-role' }),
      })
    );
  });

  it('returns ok:true when all removals and add succeed', async () => {
    // All calls default to ok — add supporter role
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'supporter');
    expect(result.ok).toBe(true);
  });

  it('treats 404 removal as success — does not fire Sentry', async () => {
    // 404 means the member does not hold that role, which is fine during
    // the "remove all paid roles" sweep when a user only has one paid tier.
    fetchResponses.set(
      'DELETE:https://discord.com/api/v10/guilds/guild-123/members/user-abc/roles/role-supporter',
      { ok: false, status: 404 }
    );

    const Sentry = await import('@sentry/nextjs');
    const { syncRole } = await import('@/lib/discord');
    const result = await syncRole('user-abc', 'community');

    expect(result.ok).toBe(true);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
