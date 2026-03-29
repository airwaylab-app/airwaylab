'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

export type Tier = 'community' | 'supporter' | 'champion';

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
  signIn: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markWalkthroughComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseBrowser();

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;

    // M1: Handle query errors instead of swallowing them
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, tier, stripe_customer_id, show_on_supporters, walkthrough_completed, email_opt_in, discord_id, discord_username')
      .eq('id', userId)
      .single();

    if (profileError) {
      // "Lock was stolen" is transient Supabase SSR lock contention -- suppress
      const isLockError = profileError.message?.includes('Lock was stolen');
      if (!isLockError) {
        console.error('[auth-context] Failed to fetch profile:', profileError.message);
        Sentry.captureMessage(`Profile fetch failed: ${profileError.message}`, {
          level: 'warning',
          tags: { context: 'auth-profile-fetch' },
        });
      }
      return;
    }

    // M2: Safe field mapping instead of unsafe cast
    if (profileData) {
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
      });
    }

    // M1: Use maybeSingle() — .single() errors when 0 rows
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, stripe_price_id, status, tier, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
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
  }, [supabase]);

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
        // "Lock was stolen by another request" is a transient Supabase SSR
        // error from navigator.locks contention across tabs/concurrent requests.
        // The token refresh still succeeds via the winning request -- retry once.
        if (err instanceof Error && err.message.includes('Lock was stolen')) {
          await new Promise((r) => setTimeout(r, 100));
          const retry = await supabase.auth.getSession();
          initialSession = retry.data.session;
        } else {
          throw err;
        }
      }

      // If we just came back from a magic link redirect (auth=success param),
      // but getSession() didn't find a session yet, retry with getUser()
      // which reads the cookie set by the auth callback route.
      if (!initialSession && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('auth')) {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          if (freshUser) {
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            initialSession = freshSession;
          }
          // Clean up the URL param without triggering a navigation
          params.delete('auth');
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
        }
      }
    );

    return () => {
      authSub.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = useCallback(async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication is not configured.' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  const tier: Tier = profile?.tier ?? 'community';
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
