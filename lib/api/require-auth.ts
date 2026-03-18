import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';

type AuthSuccess = { user: User; supabase: SupabaseClient; error?: undefined };
type AuthServiceSuccess = AuthSuccess & { serviceRole: SupabaseClient };
type AuthError = { error: NextResponse };

/**
 * Require an authenticated user. Returns the user and Supabase client,
 * or an error response that should be returned from the route handler.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth.error) return auth.error;
 *   const { user, supabase } = auth;
 */
export async function requireAuth(): Promise<AuthSuccess | AuthError> {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return { error: NextResponse.json({ error: 'Auth not configured' }, { status: 503 }) };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, supabase };
}

/**
 * Require an authenticated user plus service role client.
 * Use when the route needs to bypass RLS (e.g., admin operations).
 *
 * Usage:
 *   const auth = await requireAuthWithServiceRole();
 *   if (auth.error) return auth.error;
 *   const { user, supabase, serviceRole } = auth;
 */
export async function requireAuthWithServiceRole(): Promise<AuthServiceSuccess | AuthError> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const serviceRole = getSupabaseServiceRole();
  if (!serviceRole) {
    return { error: NextResponse.json({ error: 'Service not configured' }, { status: 503 }) };
  }

  return { ...auth, serviceRole };
}
