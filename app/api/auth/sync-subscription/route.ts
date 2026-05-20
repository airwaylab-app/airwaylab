import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Tier = 'community' | 'supporter' | 'champion';

const VALID_TIERS: readonly Tier[] = ['community', 'supporter', 'champion'] as const;
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

function isValidTier(t: unknown): t is Tier {
  return VALID_TIERS.includes(t as Tier);
}

/**
 * POST /api/auth/sync-subscription
 *
 * Called at login time to heal profile.tier drift against subscription truth.
 * Returns { healed, from, to }.
 */
export async function POST() {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch active subscription (highest-priority active row)
  const { data: subData, error: subError } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    // Transient DB error: cannot trust whether the user has an active subscription,
    // so bail out without modifying profiles.tier. A downgrade based on unreliable
    // data would be worse than a no-op; the cron integrity job re-syncs later.
    console.error('[sync-subscription] Subscription fetch failed:', subError.message);
    Sentry.captureException(subError, { tags: { context: 'sync-subscription', step: 'subscription-fetch' } });
    return NextResponse.json({ healed: false, reason: 'subscription_fetch_error' });
  }

  const expectedTier: Tier =
    subData && (ACTIVE_STATUSES as readonly string[]).includes(subData.status) && isValidTier(subData.tier)
      ? subData.tier
      : 'community';

  // Fetch current profile tier
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error('[sync-subscription] Profile fetch failed:', profileError?.message);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  const currentTier: Tier = isValidTier(profileData.tier) ? profileData.tier : 'community';

  if (currentTier === expectedTier) {
    return NextResponse.json({ healed: false, from: currentTier, to: expectedTier });
  }

  // Heal the drift toward subscription truth
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ tier: expectedTier })
    .eq('id', user.id);

  if (updateError) {
    console.error('[sync-subscription] Profile update failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to heal tier' }, { status: 500 });
  }

  Sentry.captureMessage('login-sync: tier mismatch healed', {
    level: 'warning',
    extra: { userId: user.id, fromTier: currentTier, toTier: expectedTier },
  });

  return NextResponse.json({ healed: true, from: currentTier, to: expectedTier });
}
