'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

export type Tier = 'community' | 'supporter' | 'champion';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  tier: Tier;
  stripe_customer_id: string | null;
  show_on_supporters: boolean;
}

export interface Subscription {
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
      .select('id, email, display_name, tier, stripe_customer_id, show_on_supporters')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[auth-context] Failed to fetch profile:', profileError.message);
      Sentry.captureException(profileError, { tags: { context: 'auth-profile-fetch' } });
      return;
    }

    // M2: Safe field mapping instead of unsafe cast
    if (profileData) {
      setProfile({
        id: profileData.id,
        email: profileData.email,
        display_name: profileData.display_name,
        tier: profileData.tier ?? 'community',
        stripe_customer_id: profileData.stripe_customer_id,
        show_on_supporters: profileData.show_on_supporters,
      } as Profile);
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
      Sentry.captureException(subError, { tags: { context: 'auth-subscription-fetch' } });
      setSubscription(null);
      return;
    }

    if (subData) {
      setSubscription({
        id: subData.id,
        stripe_subscription_id: subData.stripe_subscription_id,
        stripe_price_id: subData.stripe_price_id,
        status: subData.status,
        tier: subData.tier ?? 'community',
        current_period_end: subData.current_period_end,
        cancel_at_period_end: subData.cancel_at_period_end,
      } as Subscription);
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

    // Get initial session
    supabase.auth.getSession().then(async (result: { data: { session: Session | null } }) => {
      let initialSession = result.data.session;

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
        fetchProfile(initialSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, s: Session | null) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { context: 'auth-sign-in' },
        extra: { emailDomain: email.split('@')[1] },
      });
      return { error: error.message };
    }
    return { error: null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription(null);
  }, [supabase]);

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
