// ============================================================
// AirwayLab — Storage Quota Helpers
// Server-side utilities for checking storage quotas by tier.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tier } from '@/lib/auth/auth-context';
import type { StorageUsage } from './types';

/** Storage quotas per tier in bytes */
export const STORAGE_QUOTAS: Record<Tier, number> = {
  community: 0,                      // No cloud storage for free tier
  supporter: 2 * 1024 * 1024 * 1024, // 2 GB
  champion: 10 * 1024 * 1024 * 1024, // 10 GB
};

/**
 * Get storage usage and quota for a user.
 * Uses service role client to bypass RLS.
 */
export async function getStorageUsage(
  serviceRole: SupabaseClient,
  userId: string,
  tier: Tier
): Promise<StorageUsage> {
  const quotaBytes = STORAGE_QUOTAS[tier];

  const { data } = await serviceRole
    .from('user_storage_usage')
    .select('total_bytes, file_count')
    .eq('user_id', userId)
    .single();

  const totalBytes = data?.total_bytes ?? 0;
  const fileCount = data?.file_count ?? 0;

  return {
    totalBytes,
    fileCount,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - totalBytes),
    isQuotaExceeded: totalBytes >= quotaBytes,
  };
}

/**
 * Get the user's tier from their profile.
 */
export async function getUserTier(
  serviceRole: SupabaseClient,
  userId: string
): Promise<Tier> {
  const { data } = await serviceRole
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  return (data?.tier as Tier) ?? 'community';
}

/**
 * Check if user has storage consent enabled.
 */
export async function hasStorageConsent(
  serviceRole: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await serviceRole
    .from('profiles')
    .select('storage_consent')
    .eq('id', userId)
    .single();

  return data?.storage_consent === true;
}
