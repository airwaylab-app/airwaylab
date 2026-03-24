/**
 * Discord username-based linking endpoint.
 *
 * Replaces the OAuth flow with a simpler approach:
 * 1. User joins the Discord server via invite link
 * 2. User enters their Discord username in AirwayLab
 * 3. We search the guild for their username and assign the correct tier role
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import {
  isDiscordConfigured,
  searchGuildMember,
  syncRole,
  getTierRoleId,
} from '@/lib/discord';

const linkSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must be 32 characters or fewer')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Discord usernames can only contain letters, numbers, underscores, and periods'),
});

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (!isDiscordConfigured()) {
    return NextResponse.json({ error: 'Discord integration is not configured' }, { status: 503 });
  }

  // Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid username' },
      { status: 400 }
    );
  }

  const { username } = parsed.data;

  try {
    // Search guild for the username
    const searchResult = await searchGuildMember(username);

    if (searchResult.status === 'error') {
      // Discord API failure — save username but tell the user about the real issue
      await serviceRole
        .from('profiles')
        .update({
          discord_username: username,
          discord_id: null,
          discord_linked_at: null,
        })
        .eq('id', user.id);

      return NextResponse.json({
        status: 'discord_error',
        message: 'Could not reach Discord right now. Your username has been saved. Please try again in a few minutes.',
      });
    }

    if (searchResult.status === 'not_found') {
      // Save the username even if not found yet — they might join later
      await serviceRole
        .from('profiles')
        .update({
          discord_username: username,
          discord_id: null,
          discord_linked_at: null,
        })
        .eq('id', user.id);

      return NextResponse.json({
        status: 'not_found',
        message: 'We could not find that username in the AirwayLab Discord server. Make sure you have joined the server first, then try again.',
      });
    }

    const discordId = searchResult.discordId;

    // Check if this Discord ID is already linked to another account
    const { data: existing } = await serviceRole
      .from('profiles')
      .select('id')
      .eq('discord_id', discordId)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        status: 'already_linked',
        message: 'This Discord account is already linked to another AirwayLab user.',
      }, { status: 409 });
    }

    // Get user's current tier for role assignment
    const { data: profile } = await serviceRole
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.tier ?? 'community';

    // Save Discord info to profile
    const { error: updateError } = await serviceRole
      .from('profiles')
      .update({
        discord_id: discordId,
        discord_username: username,
        discord_linked_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[discord-link-username] Profile update failed:', updateError);
      Sentry.captureException(updateError, { tags: { action: 'discord-link-username' } });
      return NextResponse.json({ error: 'Failed to save Discord link' }, { status: 500 });
    }

    // Assign the correct tier role
    const roleId = getTierRoleId(tier);
    if (roleId) {
      await syncRole(discordId, tier);
    }

    // Resolve any pending roles
    await serviceRole
      .from('discord_pending_roles')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({
      status: 'connected',
      discord_username: username,
    });
  } catch (err) {
    console.error('[discord-link-username] Unexpected error:', err);
    Sentry.captureException(err, { tags: { action: 'discord-link-username' } });
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
