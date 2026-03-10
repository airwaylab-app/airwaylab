// ============================================================
// AirwayLab — Server Supabase Clients
// Cookie-based auth client for route handlers + service role client.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client that reads auth from cookies.
 * Use in Server Components, Route Handlers, and Server Actions.
 * Returns null if env vars are not configured.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Can't set cookies in Server Components — only in Route Handlers / Server Actions
        }
      },
    },
  });
}

/**
 * Service role client for admin operations (webhook handlers, etc.).
 * Bypasses RLS — use with caution.
 * Returns null if env vars are not configured.
 */
export function getSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Lightweight admin client for anonymous API routes (stats, tracking, etc.).
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Returns null if env vars are not configured.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
