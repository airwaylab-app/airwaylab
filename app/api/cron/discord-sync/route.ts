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
 * Persistent-failure backoff: after DISCORD_SYNC_ERROR_THRESHOLD consecutive
 * Discord API errors the row is excluded from the query. This prevents
 * permanently-failing usernames from generating unbounded Sentry noise.
 * An operator can reset a user by zeroing discord_sync_error_count in the DB.
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

/** Stop retrying after this many consecutive Discord API errors. */
const DISCORD_SYNC_ERROR_THRESHOLD = 5;

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
    // Find paid users with a saved username but no discord_id who haven't
    // exceeded the consecutive-error threshold.
    const { data: unlinked, error: queryError } = await supabase
      .from('profiles')
      .select('id, discord_username, tier, discord_sync_error_count')
      .not('discord_username', 'is', null)
      .is('discord_id', null)
      .in('tier', ['supporter', 'champion'])
      .lt('discord_sync_error_count', DISCORD_SYNC_ERROR_THRESHOLD);

    if (queryError) {
      console.error('[discord-sync] Query failed:', queryError);
      Sentry.captureException(queryError, { tags: { action: 'discord-sync-cron' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({ resolved: 0, checked: 0, errors: 0, not_found: 0, skipped: 0 });
    }

    let resolved = 0;
    let errors = 0;
    let notFound = 0;

    for (const profile of unlinked) {
      try {
        const result = await searchGuildMember(profile.discord_username!);

        if (result.status === 'error') {
          errors++;
          const newCount = (profile.discord_sync_error_count ?? 0) + 1;
          const hitThreshold = newCount >= DISCORD_SYNC_ERROR_THRESHOLD;

          console.error(
            `[discord-sync] Discord API error for ${profile.discord_username}: ${result.message}` +
            ` (error count now ${newCount}${hitThreshold ? ', threshold reached — will skip future runs' : ''})`
          );

          // Persist the incremented error count and timestamp
          await supabase.from('profiles').update({
            discord_sync_error_count: newCount,
            discord_sync_last_error: new Date().toISOString(),
          }).eq('id', profile.id);

          // Only fire Sentry on the first failure and when the threshold is hit,
          // not on every intermediate retry, to suppress repetitive noise.
          if (newCount === 1 || hitThreshold) {
            Sentry.captureMessage(
              hitThreshold
                ? `Discord sync: threshold reached for ${profile.discord_username} — no further retries`
                : `Discord sync: first API error for ${profile.discord_username}`,
              {
                level: hitThreshold ? 'error' : 'warning',
                tags: { action: 'discord-sync-cron' },
                extra: {
                  username: profile.discord_username,
                  error: result.message,
                  errorCount: newCount,
                },
              }
            );
          }

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
          // Reset error counter on success so any previous transient failures
          // don't permanently taint the row if it later resolves.
          discord_sync_error_count: 0,
          discord_sync_last_error: null,
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
        errors++;
        const newCount = (profile.discord_sync_error_count ?? 0) + 1;
        console.error(`[discord-sync] Failed for ${profile.discord_username}:`, err);

        await supabase.from('profiles').update({
          discord_sync_error_count: newCount,
          discord_sync_last_error: new Date().toISOString(),
        }).eq('id', profile.id);

        Sentry.captureException(err, {
          tags: { action: 'discord-sync-cron' },
          extra: { username: profile.discord_username, errorCount: newCount },
        });
      }
    }

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
        footer: { text: `discord-sync cron (threshold: ${DISCORD_SYNC_ERROR_THRESHOLD} failures)` },
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
