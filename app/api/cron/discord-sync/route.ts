/**
 * GET /api/cron/discord-sync
 *
 * Runs every 6 hours via Vercel Cron. Finds paid users who have a
 * discord_username but no discord_id, searches the guild for each,
 * and auto-links + assigns the correct tier role.
 *
 * This closes the gap where users join Discord via invite link
 * but never manually click "Connect" on their account page.
 *
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import {
  isDiscordConfigured,
  searchGuildMember,
  syncRole,
} from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDiscordConfigured()) {
    return NextResponse.json({ error: 'Discord not configured' }, { status: 503 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Find paid users with a saved username but no discord_id
    const { data: unlinked, error: queryError } = await supabase
      .from('profiles')
      .select('id, discord_username, tier')
      .not('discord_username', 'is', null)
      .is('discord_id', null)
      .in('tier', ['supporter', 'champion']);

    if (queryError) {
      console.error('[discord-sync] Query failed:', queryError);
      Sentry.captureException(queryError, { tags: { action: 'discord-sync-cron' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({ resolved: 0, checked: 0 });
    }

    let resolved = 0;

    for (const profile of unlinked) {
      try {
        const result = await searchGuildMember(profile.discord_username!);

        if (result.status !== 'found') continue;

        // Check this Discord ID isn't already linked to another account
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('discord_id', result.discordId)
          .neq('id', profile.id)
          .maybeSingle();

        if (existing) continue; // Already linked to someone else

        // Auto-link
        await supabase.from('profiles').update({
          discord_id: result.discordId,
          discord_linked_at: new Date().toISOString(),
        }).eq('id', profile.id);

        // Assign role
        await syncRole(result.discordId, profile.tier);

        // Audit log
        await supabase.from('discord_role_events').insert({
          user_id: profile.id,
          discord_id: result.discordId,
          role_id: profile.tier,
          action: 'assign',
          reason: 'cron_auto_resolve',
        });

        // Clean up pending roles
        await supabase.from('discord_pending_roles').delete().eq('user_id', profile.id);

        resolved++;
        console.info(`[discord-sync] Auto-linked ${profile.discord_username} (${profile.tier})`);
      } catch (err) {
        // Don't let one user's failure stop the rest
        console.error(`[discord-sync] Failed for ${profile.discord_username}:`, err);
        Sentry.captureException(err, {
          tags: { action: 'discord-sync-cron' },
          extra: { username: profile.discord_username },
        });
      }
    }

    return NextResponse.json({ resolved, checked: unlinked.length });
  } catch (err) {
    console.error('[discord-sync] Cron failed:', err);
    Sentry.captureException(err, { tags: { action: 'discord-sync-cron' } });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
