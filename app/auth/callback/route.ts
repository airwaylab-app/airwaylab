// ============================================================
// AirwayLab — Auth Callback
// Handles magic link redirects from Supabase Auth.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

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

  const cookieStore = cookies();

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
    console.error('[auth/callback] Code exchange failed:', error.message);
    Sentry.captureException(error, {
      tags: { route: 'auth-callback' },
      extra: { hasCode: true },
    });
    return NextResponse.redirect(`${origin}/analyze?auth_error=true`);
  }

  // Add auth=success param so the client-side AuthProvider can detect
  // a fresh login and retry session pickup if needed.
  const separator = next.includes('?') ? '&' : '?';
  return NextResponse.redirect(`${origin}${next}${separator}auth=success`);
}
