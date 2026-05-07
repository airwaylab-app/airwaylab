/**
 * Discord REST API utility for AirwayLab community integration.
 *
 * Handles role assignment/revocation, guild member management,
 * and tier-to-role mapping. All operations are non-blocking
 * and fail gracefully (never block Stripe webhook processing).
 */

import * as Sentry from '@sentry/nextjs';

const API = 'https://discord.com/api/v10';

function getConfig() {
  return {
    botToken: process.env.DISCORD_BOT_TOKEN ?? '',
    guildId: process.env.DISCORD_GUILD_ID ?? '',
    supporterRoleId: process.env.DISCORD_SUPPORTER_ROLE_ID ?? '',
    championRoleId: process.env.DISCORD_CHAMPION_ROLE_ID ?? '',
  };
}

/** Check if Discord integration is configured (all env vars present). */
export function isDiscordConfigured(): boolean {
  const c = getConfig();
  return !!(c.botToken && c.guildId && c.supporterRoleId && c.championRoleId);
}

async function discordFetch(
  path: string,
  method: 'GET' | 'PUT' | 'DELETE' | 'POST' | 'PATCH' = 'GET',
  body?: Record<string, unknown>
): Promise<Response> {
  const { botToken } = getConfig();
  const opts: RequestInit = {
    method,
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(8000),
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API}${path}`, opts);
}

/** Map a subscription tier to the corresponding Discord role ID. */
export function getTierRoleId(tier: string): string | null {
  const c = getConfig();
  if (tier === 'supporter') return c.supporterRoleId;
  if (tier === 'champion') return c.championRoleId;
  return null;
}

/** Get all paid role IDs. */
function getAllPaidRoleIds(): string[] {
  const c = getConfig();
  return [c.supporterRoleId, c.championRoleId].filter(Boolean);
}

/** Add a role to a guild member. */
export async function addMemberRole(discordId: string, roleId: string): Promise<boolean> {
  const { guildId } = getConfig();
  const res = await discordFetch(
    `/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
    'PUT'
  );
  return res.ok || res.status === 204;
}

/** Remove a role from a guild member. */
export async function removeMemberRole(discordId: string, roleId: string): Promise<boolean> {
  const { guildId } = getConfig();
  const res = await discordFetch(
    `/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
    'DELETE'
  );
  return res.ok || res.status === 204;
}

/**
 * Add a user to the guild using their OAuth2 access token.
 * Requires the `guilds.join` scope. Assigns roles in the same call.
 */
export async function addMemberToGuild(
  discordId: string,
  accessToken: string,
  roleIds: string[] = []
): Promise<boolean> {
  const { guildId } = getConfig();
  const body: Record<string, unknown> = { access_token: accessToken };
  if (roleIds.length > 0) body.roles = roleIds;

  const res = await discordFetch(
    `/guilds/${guildId}/members/${discordId}`,
    'PUT',
    body
  );

  // 201 = added, 204 = already in guild
  if (res.status === 201 || res.status === 204) {
    // If 204 (already in guild), roles weren't set by the PUT -- add them manually
    if (res.status === 204 && roleIds.length > 0) {
      for (const roleId of roleIds) {
        await addMemberRole(discordId, roleId);
      }
    }
    return true;
  }

  const text = await res.text();
  console.error(`[discord] addMemberToGuild failed (${res.status}): ${text}`);
  return false;
}

/**
 * Sync a user's Discord roles to match their subscription tier.
 * Removes all paid roles first, then adds the correct one.
 */
export async function syncRole(discordId: string, tier: string): Promise<boolean> {
  if (!isDiscordConfigured()) return false;

  try {
    const allPaidRoles = getAllPaidRoleIds();
    const targetRoleId = getTierRoleId(tier);

    // Remove all paid roles
    for (const roleId of allPaidRoles) {
      await removeMemberRole(discordId, roleId);
    }

    // Add the correct role (if any -- community tier gets no role)
    if (targetRoleId) {
      return await addMemberRole(discordId, targetRoleId);
    }

    return true;
  } catch (err) {
    console.error('[discord] syncRole failed:', err);
    Sentry.captureException(err, {
      tags: { action: 'discord-sync-role' },
      extra: { discordId, tier },
    });
    return false;
  }
}

/**
 * Remove all paid roles from a user (on subscription cancellation).
 */
export async function revokeAllPaidRoles(discordId: string): Promise<boolean> {
  return syncRole(discordId, 'community');
}

export type GuildSearchResult =
  | { status: 'found'; discordId: string }
  | { status: 'not_found' }
  | { status: 'error'; message: string; httpStatus?: number };

/**
 * Search the guild for a member by exact username match.
 * Returns a discriminated result so callers can distinguish
 * "not found" from "search failed" (different UX messages).
 *
 * Uses the guild member search endpoint which matches against
 * username and nickname. We filter results for an exact username match.
 */
export async function searchGuildMember(username: string): Promise<GuildSearchResult> {
  if (!isDiscordConfigured()) return { status: 'error', message: 'Discord not configured' };

  try {
    const { guildId } = getConfig();
    const res = await discordFetch(
      `/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=100`
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[discord] searchGuildMember failed (${res.status}): ${errText}`);
      Sentry.captureMessage(`Discord API error in searchGuildMember: ${res.status}`, {
        level: 'error',
        tags: { action: 'discord-search-member', httpStatus: String(res.status) },
        extra: { username, responseBody: errText.slice(0, 500) },
      });
      return { status: 'error', message: `Discord API error (${res.status})`, httpStatus: res.status };
    }

    const members = await res.json() as Array<{
      user: { id: string; username: string; global_name: string | null };
    }>;

    // The search endpoint returns partial matches — find the exact username match
    const match = members.find(
      (m) => m.user.username.toLowerCase() === username.toLowerCase()
        || (m.user.global_name && m.user.global_name.toLowerCase() === username.toLowerCase())
    );

    if (match) {
      return { status: 'found', discordId: match.user.id };
    }
    return { status: 'not_found' };
  } catch (err) {
    console.error('[discord] searchGuildMember error:', err);
    Sentry.captureException(err, {
      tags: { action: 'discord-search-member' },
      extra: { username },
    });
    return { status: 'error', message: 'Failed to search Discord server' };
  }
}

const DM_FOOTER = '\n\n—\nNeed help? Reply in #general or email dev@airwaylab.app — this bot can\'t read replies.';

/**
 * Send a DM to a Discord user via the bot.
 * Appends a standard footer directing replies to #general or email.
 * Fail-open: returns false on error, never throws.
 */
export async function sendDM(discordId: string, message: string): Promise<boolean> {
  if (!isDiscordConfigured()) return false;

  try {
    // Create or get existing DM channel
    const channelRes = await discordFetch('/users/@me/channels', 'POST', {
      recipient_id: discordId,
    });

    if (!channelRes.ok) {
      const errText = await channelRes.text();
      console.error(`[discord] sendDM: failed to open DM channel (${channelRes.status}): ${errText}`);
      return false;
    }

    const channel = await channelRes.json() as { id: string };

    // Send message with reply-to footer
    const msgRes = await discordFetch(`/channels/${channel.id}/messages`, 'POST', {
      content: message + DM_FOOTER,
    });

    if (!msgRes.ok) {
      const errText = await msgRes.text();
      console.error(`[discord] sendDM: failed to send message (${msgRes.status}): ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[discord] sendDM error:', err);
    Sentry.captureException(err, {
      tags: { action: 'discord-send-dm' },
      extra: { discordId },
    });
    return false;
  }
}
