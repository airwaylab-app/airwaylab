/**
 * Regression tests for searchGuildMember error categorization.
 *
 * Covers: config missing, HTTP 401, HTTP 403, HTTP 429, 200 with match,
 * 200 without match, network error (fetch throws).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Sentry before importing discord module ─────────────────
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn(),
}));

import { searchGuildMember } from '@/lib/discord';

// ── Global fetch mock ───────────────────────────────────────────
const mockFetch = vi.fn();

function makeResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('searchGuildMember error categorization', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    // Set required env vars so isDiscordConfigured() returns true by default
    process.env.DISCORD_BOT_TOKEN = 'test-token';
    process.env.DISCORD_GUILD_ID = 'test-guild';
    process.env.DISCORD_SUPPORTER_ROLE_ID = 'role-supporter';
    process.env.DISCORD_CHAMPION_ROLE_ID = 'role-champion';
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_SUPPORTER_ROLE_ID;
    delete process.env.DISCORD_CHAMPION_ROLE_ID;
  });

  it('returns category "config" when Discord is not configured', async () => {
    // isDiscordConfigured() checks env vars directly — clear them to simulate missing config
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_SUPPORTER_ROLE_ID;
    delete process.env.DISCORD_CHAMPION_ROLE_ID;

    const result = await searchGuildMember('someuser');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.category).toBe('config');
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns category "auth" for HTTP 401', async () => {
    mockFetch.mockResolvedValue(makeResponse(401, 'Unauthorized'));

    const result = await searchGuildMember('someuser');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.category).toBe('auth');
    }
  });

  it('returns category "auth" for HTTP 403', async () => {
    mockFetch.mockResolvedValue(makeResponse(403, 'Missing Access'));

    const result = await searchGuildMember('someuser');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.category).toBe('auth');
    }
  });

  it('returns category "rate_limit" for HTTP 429', async () => {
    mockFetch.mockResolvedValue(makeResponse(429, 'You are being rate limited.'));

    const result = await searchGuildMember('someuser');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.category).toBe('rate_limit');
    }
  });

  it('returns status "found" with discordId when username matches', async () => {
    const members = [
      { user: { id: 'discord-123', username: 'cpapuser', global_name: null } },
    ];
    mockFetch.mockResolvedValue(makeResponse(200, members));

    const result = await searchGuildMember('cpapuser');

    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.discordId).toBe('discord-123');
    }
  });

  it('returns status "not_found" when no member matches the username', async () => {
    const members = [
      { user: { id: 'discord-456', username: 'otheruser', global_name: null } },
    ];
    mockFetch.mockResolvedValue(makeResponse(200, members));

    const result = await searchGuildMember('cpapuser');

    expect(result.status).toBe('not_found');
  });

  it('returns category "network" when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await searchGuildMember('someuser');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.category).toBe('network');
    }
  });
});
