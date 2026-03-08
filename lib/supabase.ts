// ============================================================
// AirwayLab — Supabase Client
// Only used server-side (API routes). Never imported in client code.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Returns a Supabase client if env vars are configured, null otherwise.
 * This allows the app to gracefully degrade when Supabase isn't set up.
 */
export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
