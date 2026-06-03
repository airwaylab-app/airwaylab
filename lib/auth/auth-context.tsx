'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';

export type Tier = 'community' | 'supporter' | 'champion';

// Entitlement resolution status, distinct from tier itself.
// 'resolved'  — the profile fetch succeeded; `tier` reflects the server.
// 'unknown'   — the profile fetch errored or returned no row; `tier` is a
//               last-known / subscription fallback, NOT a confirmed downgrade.
// Gates must treat 'unknown' as "do not downgrade a previously-paid user".
export type EntitlementStatus = 'resolved' | 'unknown';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  tier: Tier;
  stripe_customer_id: string | null;
  show_on_supporters: boolean;
  walkthrough_completed: boolean;
  email_opt_in: boolean;
  discord_id: string | null;
  discord_username: string | null;
  ai_insights_consent: boolean;
}

interface Subscription {
  id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: string;
  tier: Tier;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  subscription: Subscription | null;
  session: Session | null;
  isLoading: boolean;
  tier: Tier;
  isPaid: boolean;
  entitlementStatus: EntitlementStatus;
  signIn: (email: string, redirectPath?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markWalkthroughComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Supabase uses navigator.locks internally; two variants surface as AbortErrors:
//   "Lock was stolen by another request" (older Supabase GoTrue)
//   "Lock broken by another request with the 'steal' option." (newer GoTrue / Chrome 116+)
// Both are transient cross-tab races that self-heal — retry once, then suppress Sentry.
function isLockContention(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes('Lock was stolen') || message.includes("'steal' option");
}

// Transient network blips (e.g. Supabase EU connectivity hiccup, mobile handoff) surface as
// "NetworkError when attempting to fetch resource" or "Failed to fetch" in the error message.
// One retry with 1 s backoff eliminates most false positives without masking real outages.
function isNetworkError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('NetworkError') ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('fetch failed')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Last tier resolved from a SUCCESSFUL profile fetch. Survives transient
  // fetch failures so a paid user is never silently downgraded to 'community'
  // (A1). null only before the first successful resolution for this user.
  const [lastKnownTier, setLastKnownTier] = useState<Tier | null>(null);
  // 'unknown' while a profile fetch has failed / not yet succeeded; gates must
  // not treat it as a confirmed downgrade.
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus>('unknown');

  const supabase = getSupabaseBrowser();

  // Subscription tier lookup used as an entitlement fallback when the profile
  // fetch fails (A1). Returns the active subscription tier, or null if none /
  // unreadable. Shares the same navigator.locks transient-error retry.
  const fetchSubscriptionTier = useCallback(async (userId: string): Promise<Tier | null> => {
    if (!supabase) return null;
    const SUB_COLS = 'id, stripe_subscription_id, stripe_price_id, status, tier, current_period_end, cancel_at_period_end';
    const query = () => supabase
      .from('subscriptions')
      .select(SUB_COLS)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let res = await query();
    if (res.error?.message?.includes('Lock was stolen')) {
      await new Promise((r) => setTimeout(r, 100));
      res = await query();
    }
    if (res.error || !res.data) return null;

    const validTiers: Tier[] = ['community', 'supporter', 'champion'];
    const tier = validTiers.includes(res.data.tier) ? (res.data.tier as Tier) : 'community';
    setSubscription({
      id: res.data.id,
      stripe_subscription_id: res.data.stripe_subscription_id,
      stripe_price_id: res.data.stripe_price_id,
      status: res.data.status,
      tier,
      current_period_end: res.data.current_period_end,
      cancel_at_period_end: res.data.cancel_at_period_end,
    });
    return tier;
  }, [supabase]);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;

    const PROFILE_COLS = 'id, email, display_name, tier, stripe_customer_id, show_on_supporters, walkthrough_completed, email_opt_in, discord_id, discord_username, ai_insights_consent';

    let profileResult = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('id', userId)
      .maybeSingle();

    // Lock contention is transient cross-tab races — retry once before giving up.
    // Without the retry the profile stays null, silently downgrading the user's tier to 'community'.
    if (isLockContention(profileResult.error?.message)) {
      await new Promise((r) => setTimeout(r, 100));
      profileResult = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('id', userId)
        .maybeSingle();
    } else if (isNetworkError(profileResult.error?.message)) {
      // Transient network blip (e.g. Supabase EU hiccup) — retry once with 1 s backoff.
      await new Promise((r) => setTimeout(r, 1000));
      profileResult = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('id', userId)
        .maybeSingle();
    }

    const { data: profileData, error: profileError } = profileResult;

    if (profileError) {
      // A1: a failed profile fetch must NOT silently downgrade a paid user.
      // Mark entitlement 'unknown' (not a confirmed downgrade) and keep
      // lastKnownTier. We do not setProfile(null) here for the same reason.
      setEntitlementStatus('unknown');
      // A2: lock contention is transient (already retried once above) — suppress
      // its Sentry noise, but still fall through to the subscription read below so
      // a paid user is never downgraded on a transient lock.
      if (!isLockContention(profileError.message)) {
        console.error('[auth-context] Failed to fetch profile:', profileError.message);
        Sentry.captureMessage(`Profile fetch failed: ${profileError.message}`, {
          level: 'warning',
          tags: {
            context: 'auth-profile-fetch',
            // after_retry=true means the single backoff retry also failed — a real outage.
            after_retry: String(isNetworkError(profileError.message)),
          },
        });
      }
      // A1: the subscription row is the server-side source of truth for paid
      // access and may be readable even when the profile read failed, so a
      // previously-unseen paid user is not locked out on cold start.
      await fetchSubscriptionTier(userId);
      return;
    }

    if (!profileData) {
      // Profile row missing — auth trigger may not have fired for this user.
      // Treat as unknown (not a confirmed downgrade) so a paid user with a
      // transiently-missing row keeps their last-known / subscription entitlement.
      setEntitlementStatus('unknown');
      console.error('[auth-context] No profile row found for user:', userId);
      Sentry.captureMessage('Profile row missing for authenticated user', {
        level: 'warning',
        tags: { context: 'auth-profile-fetch' },
      });
      await fetchSubscriptionTier(userId);
      return;
    }

    const validTiers: Tier[] = ['community', 'supporter', 'champion'];
    const profileTier = validTiers.includes(profileData.tier) ? profileData.tier : 'community';
    setProfile({
      id: profileData.id,
      email: profileData.email,
      display_name: profileData.display_name,
      tier: profileTier,
      stripe_customer_id: profileData.stripe_customer_id,
      show_on_supporters: profileData.show_on_supporters,
      walkthrough_completed: profileData.walkthrough_completed ?? false,
      email_opt_in: profileData.email_opt_in ?? false,
      discord_id: profileData.discord_id ?? null,
      discord_username: profileData.discord_username ?? null,
      ai_insights_consent: profileData.ai_insights_consent ?? false,
    });
    // Successful fetch: entitlement is now confirmed from the server.
    setLastKnownTier(profileTier);
    setEntitlementStatus('resolved');

    const SUB_COLS = 'id, stripe_subscription_id, stripe_price_id, status, tier, current_period_end, cancel_at_period_end';

    let subResult = await supabase
      .from('subscriptions')
      .select(SUB_COLS)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Same lock contention guard for the subscription query
    if (isLockContention(subResult.error?.message)) {
      await new Promise((r) => setTimeout(r, 100));
      subResult = await supabase
        .from('subscriptions')
        .select(SUB_COLS)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    } else if (isNetworkError(subResult.error?.message)) {
      await new Promise((r) => setTimeout(r, 1000));
      subResult = await supabase
        .from('subscriptions')
        .select(SUB_COLS)
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    const { data: subData, error: subError } = subResult;

    if (subError) {
      // Suppress Sentry for lock contention — transient, self-heals on next auth state change
      if (isLockContention(subError.message)) { setSubscription(null); return; }
      console.error('[auth-context] Failed to fetch subscription:', subError.message);
      Sentry.captureMessage(`Subscription fetch failed: ${subError.message}`, {
        level: 'warning',
        tags: { context: 'auth-subscription-fetch' },
      });
      setSubscription(null);
      return;
    }

    if (subData) {
      const validSubTiers: Tier[] = ['community', 'supporter', 'champion'];
      const subTier = validSubTiers.includes(subData.tier) ? subData.tier : 'community';
      setSubscription({
        id: subData.id,
        stripe_subscription_id: subData.stripe_subscription_id,
        stripe_price_id: subData.stripe_price_id,
        status: subData.status,
        tier: subTier,
        current_period_end: subData.current_period_end,
        cancel_at_period_end: subData.cancel_at_period_end,
      });
    } else {
      setSubscription(null);
    }

    // Login-time drift check: heal profile.tier toward subscription truth
    const validTierValues: Tier[] = ['community', 'supporter', 'champion'];
    const expectedTier: Tier =
      subData && ['active', 'trialing', 'past_due'].includes(subData.status) && validTierValues.includes(subData.tier as Tier)
        ? (subData.tier as Tier)
        : 'community';

    if (profileTier !== expectedTier) {
      // Optimistic update — correct locally without blocking the login flow
      setProfile((prev) => (prev ? { ...prev, tier: expectedTier } : prev));
      // Keep last-known entitlement aligned with the healed tier.
      setLastKnownTier(expectedTier);
      // Fire-and-forget sync to persist the correction server-side.
      const syncPromise = fetch('/api/auth/sync-subscription', { method: 'POST', credentials: 'same-origin' });
      // eslint-disable-next-line airwaylab/no-silent-catch -- fire-and-forget: non-critical; optimistic update already applied and cron job re-syncs on failure
      syncPromise.catch((err: unknown) => {
        console.error('[auth-context] login-sync: fire-and-forget failed:', err);
      });
    }
  }, [supabase, fetchSubscriptionTier]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session (with retry for Supabase lock contention)
    async function initSession() {
      let initialSession: Session | null = null;

      try {
        const result = await supabase.auth.getSession();
        initialSession = result.data.session;
      } catch (err) {
        // Lock contention is a transient cross-tab race from navigator.locks.
        // The token refresh still succeeds via the winning request — retry once.
        if (err instanceof Error && isLockContention(err.message)) {
          await new Promise((r) => setTimeout(r, 100));
          const retry = await supabase.auth.getSession();
          initialSession = retry.data.session;
        } else {
          throw err;
        }
      }

      // getSession() reads from local storage without contacting the server.
      // A stale session with an expired access token would cause fetchNightsFromCloud()
      // to get a 401 before the browser client has refreshed the token (AIR-2275).
      // If the session exists but the access token is expired (or expiring within 60s),
      // call getUser() which validates with the server and triggers a refresh.
      // Only needed for the expired-token window; skipped for fresh sessions to avoid latency.
      if (initialSession?.expires_at) {
        const nowSecs = Math.floor(Date.now() / 1000);
        const secsUntilExpiry = initialSession.expires_at - nowSecs;
        if (secsUntilExpiry < 60) {
          try {
            const { data: { user: validUser } } = await supabase.auth.getUser();
            if (!validUser) {
              // Both access + refresh token expired — clear stale session
              initialSession = null;
            } else {
              // Refresh succeeded; read the updated session back from storage
              const { data: { session: refreshed } } = await supabase.auth.getSession();
              initialSession = refreshed;
            }
          } catch {
            // Network failure during validation — keep the session optimistically;
            // the route handler will return 401 if the token is truly invalid.
          }
        }
      }

      // Handle return from magic-link auth callback (auth=success param).
      // Runs regardless of whether getSession() already found a session so that
      // URL cleanup and the Signup Completed event fire even when the cookie
      // arrives before this useEffect (fast cookie propagation path).
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('auth')) {
          const isNewSignup = params.has('new_signup');

          if (!initialSession) {
            // Session not in cookie yet — retry via getUser()
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            if (freshUser) {
              const { data: { session: freshSession } } = await supabase.auth.getSession();
              initialSession = freshSession;
            }
          }

          // Fire Signup Completed for new accounts (flag set by server auth callback)
          if (isNewSignup && initialSession) {
            events.signupCompleted('magic_link');
          }

          // Clean up auth callback params without triggering a navigation
          params.delete('auth');
          params.delete('new_signup');
          const cleanUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        Sentry.setUser({ id: initialSession.user.id });
      } else {
        Sentry.setUser(null);
      }
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).then(() => {
          // Check if user signed up via EmailOptIn (pending email opt-in)
          try {
            if (localStorage.getItem('airwaylab_email_opt_in_pending') === '1') {
              localStorage.removeItem('airwaylab_email_opt_in_pending');
              fetch('/api/email/opt-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ opt_in: true }),
              }).catch(() => { /* non-critical */ });
            }
          } catch { /* localStorage unavailable */ }
        }).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }

    initSession();

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, s: Session | null) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          Sentry.setUser({ id: s.user.id });
          fetchProfile(s.user.id);
        } else {
          Sentry.setUser(null);
          setProfile(null);
          setSubscription(null);
          // Logout: drop entitlement so the next user can't inherit a paid tier.
          setLastKnownTier(null);
          setEntitlementStatus('unknown');
        }
      }
    );

    return () => {
      authSub.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(async (email: string, redirectPath?: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication is not configured.' };
    }

    const emailRedirectTo = redirectPath
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`
      : `${window.location.origin}/auth/callback`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        // Rate limits and security cooldowns are expected user behavior — not bugs
        const msg = error.message.toLowerCase();
        const isExpected = msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('too many');
        if (!isExpected) {
          Sentry.captureException(error, {
            tags: { context: 'auth-sign-in' },
            extra: { emailDomain: email.split('@')[1] },
          });
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { context: 'auth-sign-in', type: 'unexpected' },
        extra: { emailDomain: email.split('@')[1] },
      });
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth-context] Sign-out failed:', error.message);
      Sentry.captureException(error, { tags: { context: 'auth-sign-out' } });
    }
    Sentry.setUser(null);
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription(null);
    setLastKnownTier(null);
    setEntitlementStatus('unknown');
  }, [supabase]);

  const markWalkthroughComplete = useCallback(async () => {
    // Always set localStorage as immediate fallback
    try { localStorage.setItem('airwaylab_walkthrough_done', '1'); } catch { /* noop */ }

    // Update server-side for logged-in users
    if (supabase && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ walkthrough_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('[auth-context] Failed to save walkthrough state:', error.message);
      } else if (profile) {
        setProfile({ ...profile, walkthrough_completed: true });
      }
    }
  }, [supabase, user, profile]);

  // Entitlement derivation (A1).
  // A profile-fetch FAILURE must never silently downgrade a paid user to
  // 'community'. We only trust 'community' when the fetch actually resolved.
  // On 'unknown' (fetch failed / not yet resolved) we fall back, in order, to:
  //   1. an active subscription row (server truth that survived the profile error),
  //   2. the last tier we successfully resolved for this user,
  //   3. 'community' (genuine default for a brand-new / anonymous user with
  //      no prior resolution and no subscription).
  let tier: Tier;
  if (entitlementStatus === 'resolved' && profile) {
    tier = profile.tier;
  } else {
    tier = subscription?.tier ?? lastKnownTier ?? 'community';
  }
  const isPaid = tier === 'supporter' || tier === 'champion';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        session,
        isLoading,
        tier,
        isPaid,
        entitlementStatus,
        signIn,
        signOut,
        refreshProfile,
        markWalkthroughComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
