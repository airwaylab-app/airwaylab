/**
 * Discord OAuth2 initiation endpoint.
 * Redirects the user to Discord's authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  // Verify user is authenticated
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const redirectUri = process.env.DISCORD_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Discord not configured' }, { status: 503 });
  }

  // Generate CSRF state token
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
    state,
  });

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
}
