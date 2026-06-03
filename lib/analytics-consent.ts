// ============================================================
// AirwayLab — Analytics Consent
// Opt-out by default: analytics (PostHog) must NOT initialise or
// capture until the user has explicitly granted analytics consent.
// State lives in localStorage, mirroring lib/share-consent.ts.
// ============================================================

const STORAGE_KEY = 'airwaylab_analytics_consent';

/** Emitted on the window when analytics consent changes (same tab). */
export const ANALYTICS_CONSENT_EVENT = 'airwaylab:analytics-consent';

/**
 * Whether the user has granted analytics consent.
 * Returns false (opt-out) unless an explicit grant is stored.
 */
export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'granted';
  } catch {
    return false;
  }
}

/** Grant or revoke analytics consent and notify listeners in this tab. */
export function setAnalyticsConsent(granted: boolean): void {
  try {
    if (granted) {
      localStorage.setItem(STORAGE_KEY, 'granted');
    } else {
      localStorage.setItem(STORAGE_KEY, 'denied');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: { granted } })
      );
    }
  } catch {
    // localStorage unavailable — fail silently (stays opted out)
  }
}
