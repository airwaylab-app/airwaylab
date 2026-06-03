// ============================================================
// AirwayLab — Auth Callback
// Handles magic link redirects from Supabase Auth.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

/**
 * Validate the `next` redirect parameter to prevent open redirect attacks.
 * Only allows relative paths starting with `/` and no protocol/host tricks.
 */
function sanitizeRedirectPath(raw: string | null): string {
  const fallback = '/analyze';
  if (!raw) return fallback;

  // Must start with `/` and NOT `//` (protocol-relative URL)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

  // Block any URL with protocol schemes
  if (/^\/[a-z]+:/i.test(raw)) return fallback;

  // Block backslash tricks (some browsers normalize `\/` to `//`)
  if (raw.includes('\\')) return fallback;

  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirectPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // PKCE verifier missing is expected on iOS (cross-context cookie partitioning)
    // and when users open magic links in a different browser/device.
    // Downgrade to warning instead of alerting as an exception.
    const isPKCEError = error.name === 'AuthPKCECodeVerifierMissingError'
      || error.message?.includes('PKCE code verifier');

    if (isPKCEError) {
      console.error('[auth/callback] PKCE verifier missing — user likely opened magic link in a different context');
      Sentry.captureMessage('PKCE code verifier missing during auth callback', {
        level: 'warning',
        tags: { route: 'auth-callback' },
        extra: {
          userAgent: request.headers.get('user-agent') ?? 'unknown',
        },
      });
      return NextResponse.redirect(`${origin}/analyze?auth_error=pkce_expired`);
    }

    console.error('[auth/callback] Code exchange failed:', error.message);
    Sentry.captureException(error, {
      tags: { route: 'auth-callback' },
      extra: { hasCode: true },
    });
    return NextResponse.redirect(`${origin}/analyze?auth_error=true`);
  }

  // Checkpoint: code exchange succeeded but user is null (ghost session)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[auth/callback] Code exchange succeeded but getUser() returned null');
    Sentry.captureMessage('Auth ghost session: code exchange succeeded but user is null', {
      level: 'warning',
      tags: { checkpoint: 'auth_ghost_session', route: 'auth-callback' },
    });
  }

  // Fallback: ensure a profile row exists even if the DB trigger failed.
  // The trigger (handle_new_user) is the primary path; this is the safety net
  // for PKCE cross-context signups, transient DB errors, or trigger misfire.
  // Uses service role to bypass RLS.
  //
  // CONSENT GUARD: storage_consent is set ONLY when this insert creates a
  // brand-new profile row. `ignoreDuplicates: true` compiles to
  // `INSERT ... ON CONFLICT DO NOTHING`, so for an EXISTING profile (e.g. a
  // returning user re-authenticating) this is a no-op and the stored
  // storage_consent / storage_consent_at are left untouched. We never silently
  // (re-)grant consent on re-auth. The `true` here only mirrors the trigger's
  // signup auto-grant (migration 056 / 027) for the genuine new-row case.
  // DO NOT switch to `ignoreDuplicates: false` (merge) — that would overwrite
  // an existing user's revoked consent back to true on every login.
  if (user) {
    const adminClient = getSupabaseServiceRole();
    if (adminClient) {
      const { error: upsertError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? '',
            // Insert-only (see CONSENT GUARD above): never reached for existing rows.
            storage_consent: true,
            storage_consent_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      if (upsertError) {
        console.error('[auth/callback] Profile upsert fallback failed:', upsertError.message);
        Sentry.captureMessage('Auth callback profile upsert fallback failed', {
          level: 'warning',
          tags: { route: 'auth-callback', step: 'profile-fallback' },
          extra: { userId: user.id },
        });
      }
    }
  }

  // Detect new signups (account created within the last 60 seconds)
  const isNewSignup = user?.created_at
    ? Date.now() - new Date(user.created_at).getTime() < 60_000
    : false;

  if (isNewSignup) {
    console.error('[auth/callback] New signup', { userId: user?.id });
  }

  // Add auth=success so the client-side AuthProvider can detect a fresh login.
  // Add new_signup=1 so the client can fire the Signup Completed analytics event.
  const separator = next.includes('?') ? '&' : '?';
  const newSignupParam = isNewSignup ? '&new_signup=1' : '';
  return NextResponse.redirect(`${origin}${next}${separator}auth=success${newSignupParam}`);
}
