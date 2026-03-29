/**
 * GET /api/cron/discord-sync
 *
 * Runs every 15 minutes via Vercel Cron. Finds paid users who have a
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
import { sendAlert, COLORS } from '@/lib/discord-webhook';

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
      return NextResponse.json({ resolved: 0, checked: 0, errors: 0, not_found: 0 });
    }

    let resolved = 0;
    let errors = 0;
    let notFound = 0;

    for (const profile of unlinked) {
      try {
        const result = await searchGuildMember(profile.discord_username!);

        if (result.status === 'error') {
          errors++;
          console.error(`[discord-sync] Discord API error for ${profile.discord_username}: ${result.message}`);
          Sentry.captureMessage(`Discord sync: API error for ${profile.discord_username}`, {
            level: 'warning',
            tags: { action: 'discord-sync-cron' },
            extra: { username: profile.discord_username, error: result.message },
          });
          continue;
        }

        if (result.status === 'not_found') {
          notFound++;
          continue;
        }

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
        console.log(`[discord-sync] Auto-linked ${profile.discord_username} (${profile.tier})`);
      } catch (err) {
        errors++;
        console.error(`[discord-sync] Failed for ${profile.discord_username}:`, err);
        Sentry.captureException(err, {
          tags: { action: 'discord-sync-cron' },
          extra: { username: profile.discord_username },
        });
      }
    }

    // Alert ops if Discord API errors are blocking resolution
    if (errors > 0) {
      await sendAlert('ops', '', [{
        title: ':warning: Discord Sync — API Errors',
        description: `${errors} of ${unlinked.length} users could not be resolved due to Discord API errors. Paying users may be stuck without roles.`,
        color: COLORS.amber,
        fields: [
          { name: 'Checked', value: String(unlinked.length), inline: true },
          { name: 'Resolved', value: String(resolved), inline: true },
          { name: 'Errors', value: String(errors), inline: true },
          { name: 'Not found', value: String(notFound), inline: true },
        ],
        footer: { text: 'discord-sync cron' },
        timestamp: new Date().toISOString(),
      }]);
    }

    return NextResponse.json({ resolved, checked: unlinked.length, errors, not_found: notFound });
  } catch (err) {
    console.error('[discord-sync] Cron failed:', err);
    Sentry.captureException(err, { tags: { action: 'discord-sync-cron' } });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
