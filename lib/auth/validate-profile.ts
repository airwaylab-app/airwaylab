import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function validateProfileExists(
  supabase: SupabaseClient,
  userId: string,
  context: { route: string }
): Promise<{ valid: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, { tags: { route: context.route, check: 'profile-exists' } });
    return { valid: false, error: 'db_error' };
  }

  if (!data) {
    Sentry.captureMessage('profile-not-found for authenticated user', {
      level: 'error',
      tags: { route: context.route, check: 'profile-exists' },
      extra: { userId },
    });
    return { valid: false, error: 'no_profile' };
  }

  return { valid: true };
}
