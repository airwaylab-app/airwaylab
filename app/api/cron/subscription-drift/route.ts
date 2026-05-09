import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendAlert, COLORS } from '@/lib/discord-webhook';
import { syncRole, isDiscordConfigured } from '@/lib/discord';

export const dynamic = 'force-dynamic';

interface DriftMismatch {
  user_id: string;
  profile_tier: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  drift_type: 'downgrade_missed' | 'upgrade_missed';
  fixed: boolean;
}

/**
 * Derive the correct tier from active subscriptions.
 * If a user has multiple active subs (edge case), take the highest tier.
 */
function deriveTierFromSubscriptions(
  activeSubs: Array<{ tier: string; status: string }>
): 'community' | 'supporter' | 'champion' {
  if (activeSubs.length === 0) return 'community';

  const hasChampion = activeSubs.some((s) => s.tier === 'champion');
  if (hasChampion) return 'champion';
  return 'supporter';
}

/**
 * GET /api/cron/subscription-drift
 *
 * Runs daily via Vercel Cron (05:00 UTC). Detects tier drift between
 * profiles.tier and subscriptions.status that can occur when Stripe
 * webhooks partially fail.
 *
 * Two drift types:
 *   - downgrade_missed: profile says supporter/champion, but no active subscription
 *   - upgrade_missed:   active subscription exists, but profile says community
 *
 * Auto-fixes mismatches and logs each one to Sentry. Sends a Discord
 * ops alert summarising the run if any mismatches were found.
 *
 * Protected by CRON_SECRET.
 *
 * Schedule: 0 5 * * * (daily at 05:00 UTC)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // 1. Get all profiles with a paid tier
    const { data: paidProfiles, error: paidError } = await supabase
      .from('profiles')
      .select('id, tier, email, discord_id')
      .in('tier', ['supporter', 'champion']);

    if (paidError) {
      console.error('[subscription-drift] Failed to query paid profiles:', paidError);
      Sentry.captureException(paidError, { tags: { route: 'cron-subscription-drift' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    // 2. Get all profiles with community tier that have any subscription
    const { data: communityWithSubs, error: communityError } = await supabase
      .from('profiles')
      .select('id, tier, email, subscriptions(id, status, tier)')
      .eq('tier', 'community')
      .not('subscriptions', 'is', null);

    if (communityError) {
      console.error('[subscription-drift] Failed to query community profiles:', communityError);
      Sentry.captureException(communityError, { tags: { route: 'cron-subscription-drift' } });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const mismatches: DriftMismatch[] = [];
    let fixed = 0;

    // 3. Check paid profiles for missing active subscriptions (downgrade_missed)
    for (const profile of paidProfiles ?? []) {
      const { data: activeSubs, error: subError } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', profile.id)
        .in('status', ['active', 'trialing']);

      if (subError) {
        console.error(`[subscription-drift] Sub query failed for ${profile.id}:`, subError);
        continue;
      }

      const correctTier = deriveTierFromSubscriptions(activeSubs ?? []);

      if (correctTier === 'community') {
        // Profile says paid, but no active subscription -- downgrade missed
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: null,
          subscription_tier: null,
          drift_type: 'downgrade_missed',
          fixed: false,
        };

        // Auto-fix: downgrade to community
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: 'community' })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'downgrade_missed' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;

          // Revoke Discord role if user has one linked
          if (profile.discord_id && isDiscordConfigured()) {
            const discordResult = await syncRole(profile.discord_id, 'community');
            await supabase.from('discord_role_events').insert({
              user_id: profile.id,
              discord_id: profile.discord_id,
              role_id: 'community',
              action: discordResult.ok ? 'revoke' : 'revoke_failed',
              reason: 'drift_cron_cleanup',
            });
            if (!discordResult.ok) {
              Sentry.captureMessage('Discord role revocation failed in drift cron', {
                level: 'warning',
                tags: { route: 'cron-subscription-drift', action: 'discord-remove-role-failed' },
                extra: { user_id: profile.id, discord_id: profile.discord_id },
              });
            }
          }
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: 'warning',
          tags: { route: 'cron-subscription-drift', drift_type: 'downgrade_missed' },
          extra: {
            user_id: profile.id,
            profile_tier: profile.tier,
            active_subscriptions: 0,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      } else if (correctTier !== profile.tier) {
        // Profile has wrong paid tier (e.g. says champion but sub is supporter)
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: profile.tier,
          subscription_status: 'active',
          subscription_tier: correctTier,
          drift_type: 'downgrade_missed', // tier mismatch within paid tiers
          fixed: false,
        };

        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: correctTier })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Tier fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'tier_mismatch' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: 'warning',
          tags: { route: 'cron-subscription-drift', drift_type: 'tier_mismatch' },
          extra: {
            user_id: profile.id,
            profile_tier: profile.tier,
            correct_tier: correctTier,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      }
    }

    // 4. Check community profiles with active subscriptions (upgrade_missed)
    for (const profile of communityWithSubs ?? []) {
      const subs = (profile as Record<string, unknown>).subscriptions as
        | Array<{ id: string; status: string; tier: string }>
        | null;

      if (!subs || subs.length === 0) continue;

      const activeSubs = subs.filter((s) =>
        s.status === 'active' || s.status === 'trialing'
      );

      if (activeSubs.length === 0) continue;

      const correctTier = deriveTierFromSubscriptions(activeSubs);

      if (correctTier !== 'community') {
        const mismatch: DriftMismatch = {
          user_id: profile.id,
          profile_tier: 'community',
          subscription_status: activeSubs[0]!.status,
          subscription_tier: correctTier,
          drift_type: 'upgrade_missed',
          fixed: false,
        };

        // Auto-fix: upgrade to correct tier
        const { error: fixError } = await supabase
          .from('profiles')
          .update({ tier: correctTier })
          .eq('id', profile.id);

        if (fixError) {
          console.error(`[subscription-drift] Upgrade fix failed for ${profile.id}:`, fixError);
          Sentry.captureException(fixError, {
            tags: { route: 'cron-subscription-drift', drift_type: 'upgrade_missed' },
            extra: { user_id: profile.id },
          });
        } else {
          mismatch.fixed = true;
          fixed++;
        }

        Sentry.captureMessage('Subscription tier drift detected', {
          level: 'warning',
          tags: { route: 'cron-subscription-drift', drift_type: 'upgrade_missed' },
          extra: {
            user_id: profile.id,
            profile_tier: 'community',
            subscription_tier: correctTier,
            subscription_status: activeSubs[0]!.status,
            fixed: mismatch.fixed,
          },
        });

        mismatches.push(mismatch);
      }
    }

    const checked = (paidProfiles?.length ?? 0) + (communityWithSubs?.length ?? 0);

    // 5. Send Discord ops alert if any drift was found
    if (mismatches.length > 0) {
      const downgradeMissed = mismatches.filter((m) => m.drift_type === 'downgrade_missed').length;
      const upgradeMissed = mismatches.filter((m) => m.drift_type === 'upgrade_missed').length;

      await sendAlert('ops', '', [
        {
          title: ':warning: Subscription Tier Drift Detected',
          description: `Found ${mismatches.length} profile(s) where tier does not match subscription status. ${fixed} auto-fixed.`,
          color: COLORS.amber,
          fields: [
            { name: 'Checked', value: String(checked), inline: true },
            { name: 'Mismatches', value: String(mismatches.length), inline: true },
            { name: 'Fixed', value: String(fixed), inline: true },
            { name: 'Downgrade missed', value: String(downgradeMissed), inline: true },
            { name: 'Upgrade missed', value: String(upgradeMissed), inline: true },
          ],
          footer: { text: 'subscription-drift cron' },
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    console.error(
      `[subscription-drift] completed: checked=${checked}, mismatches=${mismatches.length}, fixed=${fixed}`
    );

    return NextResponse.json({
      ok: true,
      checked,
      mismatches: mismatches.length,
      fixed,
    });
  } catch (err) {
    console.error('[subscription-drift] Cron failed:', err);
    Sentry.captureException(err, { tags: { route: 'cron-subscription-drift' } });
    return NextResponse.json({ error: 'Drift check failed' }, { status: 500 });
  }
}
