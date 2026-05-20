'use client';

import { usePostHog } from 'posthog-js/react';

/**
 * Reads the PostHog feature flag `tier_history_window_days` and returns the
 * resolved number of days for the community tier history window.
 *
 * Returns `undefined` when PostHog is unavailable or the flag is unset —
 * callers should fall back to the hardcoded default from `getAnalysisWindowDays`.
 */
export function useTierHistoryWindowDays(): number | undefined {
  const posthog = usePostHog();
  if (!posthog) return undefined;

  const flag = posthog.getFeatureFlag('tier_history_window_days');

  if (typeof flag === 'string') {
    const n = parseInt(flag, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  if (typeof flag === 'number' && flag > 0) return flag;

  return undefined;
}
