import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileValidationResult =
  | { valid: true }
  | { valid: false; error: 'no_profile' | 'db_error' };

/**
 * Checks whether a profile row exists for the given userId.
 * Distinguishes between a genuine no-row result (PGRST116) and a DB error,
 * capturing appropriate Sentry events for each case.
 */
export async function validateProfileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileValidationResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { check: 'profile-existence', userId },
    });
    return { valid: false, error: 'db_error' };
  }

  if (!data) {
    Sentry.captureMessage('Profile existence check: no row found for user', {
      level: 'warning',
      tags: { check: 'profile-existence', userId },
    });
    return { valid: false, error: 'no_profile' };
  }

  return { valid: true };
}
