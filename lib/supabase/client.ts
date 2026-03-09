// ============================================================
// AirwayLab — Browser Supabase Client
// Used in 'use client' components for auth state management.
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Returns null if Supabase env vars are not configured (graceful degradation).
 */
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  if (!client) {
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
