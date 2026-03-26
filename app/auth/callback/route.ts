// ============================================================
// AirwayLab — Auth Callback
// Handles magic link redirects from Supabase Auth.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { sendAlert, formatGrowthEmbed } from '@/lib/discord-webhook';

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

  // Detect new signups: if user was created within the last 60 seconds, it's a new signup
  if (user?.created_at) {
    const createdAt = new Date(user.created_at).getTime();
    const now = Date.now();
    if (now - createdAt < 60_000) {
      void sendAlert('growth', '', [formatGrowthEmbed({
        event: 'new_signup',
        email: user.email ?? undefined,
      })]);
    }
  }

  // Add auth=success param so the client-side AuthProvider can detect
  // a fresh login and retry session pickup if needed.
  const separator = next.includes('?') ? '&' : '?';
  return NextResponse.redirect(`${origin}${next}${separator}auth=success`);
}
