import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Whether the user has granted (and not withdrawn) consent to contribute anonymised
 * data to research. Server-enforced source of truth for the contribute-* routes.
 * Granted/withdrawn via /api/consent-audit (consentType='data_contribution'), which
 * writes this flag alongside the GDPR audit row. Mirrors hasStorageConsent.
 *
 * Pass a SERVICE-ROLE client: profiles writes/reads of consent flags are service-role
 * only (migration 050/055).
 */
export async function hasDataContributionConsent(
  serviceRole: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await serviceRole
    .from('profiles')
    .select('data_contribution_consent')
    .eq('id', userId)
    .single();

  return data?.data_contribution_consent === true;
}
