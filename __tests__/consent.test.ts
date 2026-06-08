import { describe, it, expect, vi } from 'vitest';
import { hasDataContributionConsent } from '@/lib/consent';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Minimal service-role client stub returning a fixed profiles row. */
function clientReturning(row: { data_contribution_consent?: boolean } | null): SupabaseClient {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as SupabaseClient;
}

describe('hasDataContributionConsent', () => {
  it('returns true only when the flag is exactly true', async () => {
    expect(await hasDataContributionConsent(clientReturning({ data_contribution_consent: true }), 'u1')).toBe(true);
  });

  it('returns false when the flag is false', async () => {
    expect(await hasDataContributionConsent(clientReturning({ data_contribution_consent: false }), 'u1')).toBe(false);
  });

  it('returns false when the row or flag is missing (fail closed)', async () => {
    expect(await hasDataContributionConsent(clientReturning(null), 'u1')).toBe(false);
    expect(await hasDataContributionConsent(clientReturning({}), 'u1')).toBe(false);
  });

  it('queries the profiles row for the given user id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { data_contribution_consent: true }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    await hasDataContributionConsent(client, 'user-123');

    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('data_contribution_consent');
    expect(eq).toHaveBeenCalledWith('id', 'user-123');
  });
});
