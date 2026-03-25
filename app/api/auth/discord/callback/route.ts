/**
 * Discord OAuth2 callback handler.
 *
 * Exchanges the auth code for a token, fetches the user's Discord identity,
 * saves it to the profile, adds the user to the guild with the correct role,
 * and resolves any pending role assignments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import {
  isDiscordConfigured,
  addMemberToGuild,
  getTierRoleId,
} from '@/lib/discord';

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/account`
  : 'https://airwaylab.app/account';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user cancellation
  if (error) {
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=cancelled`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }

  // CSRF verification
  const cookieStore = await cookies();
  const storedState = cookieStore.get('discord_oauth_state')?.value;
  cookieStore.delete('discord_oauth_state');

  if (state !== storedState) {
    console.error('[discord-callback] State mismatch');
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }

  // Verify authenticated user
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const redirectUri = process.env.DISCORD_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri || !isDiscordConfigured()) {
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[discord-callback] Token exchange failed:', errText);
      return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      token_type: string;
    };

    // Fetch Discord user identity
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('[discord-callback] User fetch failed:', await userRes.text());
      return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
    }

    const discordUser = await userRes.json() as {
      id: string;
      username: string;
      global_name: string | null;
    };

    // Save to profile (service role to bypass RLS for the update)
    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
    }

    // Check if this Discord ID is already linked to another account
    const { data: existing } = await serviceRole
      .from('profiles')
      .select('id')
      .eq('discord_id', discordUser.id)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      // Discord account already linked to a different AirwayLab account
      return NextResponse.redirect(`${ACCOUNT_URL}?discord=already_linked`);
    }

    // Update profile with Discord info
    const { error: updateError } = await serviceRole
      .from('profiles')
      .update({
        discord_id: discordUser.id,
        discord_username: discordUser.global_name || discordUser.username,
        discord_linked_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[discord-callback] Profile update failed:', updateError);
      Sentry.captureException(updateError, { tags: { action: 'discord-link' } });
      return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
    }

    // Get user's current tier to determine role
    const { data: profile } = await serviceRole
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.tier ?? 'community';
    const roleId = getTierRoleId(tier);
    const roles = roleId ? [roleId] : [];

    // Add user to guild with role (guilds.join scope)
    await addMemberToGuild(discordUser.id, tokenData.access_token, roles);

    // Resolve any pending roles from before Discord was linked
    const { data: pendingRoles } = await serviceRole
      .from('discord_pending_roles')
      .select('role_id')
      .eq('user_id', user.id);

    if (pendingRoles && pendingRoles.length > 0) {
      // The pending role may be different from current tier if subscription changed
      // Just sync to current tier (already done above via addMemberToGuild)
      await serviceRole
        .from('discord_pending_roles')
        .delete()
        .eq('user_id', user.id);
    }

    return NextResponse.redirect(`${ACCOUNT_URL}?discord=connected`);
  } catch (err) {
    console.error('[discord-callback] Unexpected error:', err);
    Sentry.captureException(err, { tags: { action: 'discord-callback' } });
    return NextResponse.redirect(`${ACCOUNT_URL}?discord=error`);
  }
}
