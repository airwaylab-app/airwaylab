// ============================================================
// AirwayLab — Anonymous Token for Longitudinal Linking
// Generates a stable, anonymous identifier stored in localStorage.
// This allows linking contributions from the same user over time
// without revealing any personal information.
// ============================================================

const STORAGE_KEY = 'airwaylab-anonymous-token';

/**
 * Get or create a stable anonymous token for longitudinal data linking.
 * The token is a random hex string stored in localStorage — it cannot
 * be traced back to any user identity, device serial, or IP address.
 *
 * Returns null if localStorage is unavailable (SSR, private browsing).
 */
export function getAnonymousToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-f0-9]{64}$/.test(existing)) {
      return existing;
    }

    // Generate a 256-bit random hex token
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    return null;
  }
}
