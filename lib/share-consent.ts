// ============================================================
// AirwayLab — Share Consent Utilities
// Manages localStorage state for the share link consent flow.
// ============================================================

const STORAGE_KEY = 'airwaylab_share_consent';

export interface ShareConsentState {
  dataShareConsent: boolean;
  shareScope: 'single' | 'all';
  rememberedChoice: boolean;
}

/**
 * Get the current share consent state from localStorage.
 * Returns null if no consent has been given.
 */
export function getShareConsent(): ShareConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Validate shape
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.dataShareConsent !== 'boolean' ||
      (parsed.shareScope !== 'single' && parsed.shareScope !== 'all') ||
      typeof parsed.rememberedChoice !== 'boolean'
    ) {
      return null;
    }

    return parsed as ShareConsentState;
  } catch {
    return null;
  }
}

/**
 * Save share consent state to localStorage.
 */
export function setShareConsent(state: ShareConsentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — fail silently
  }
}

/**
 * Clear share consent state from localStorage.
 */
export function clearShareConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — fail silently
  }
}

/**
 * Check if user has a remembered share choice (skip modal entirely).
 */
export function hasRememberedShareChoice(): boolean {
  const consent = getShareConsent();
  return consent !== null && consent.dataShareConsent && consent.rememberedChoice;
}
