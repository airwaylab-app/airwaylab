const OPTED_IN_KEY = 'airwaylab_contribute_optin';
const LEGACY_KEY = 'airwaylab-contribute-optin';

/** Migrate the legacy hyphenated key to the underscore key. */
export function migrateConsentKey(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      localStorage.setItem(OPTED_IN_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* noop — private browsing or storage full */ }
}

/** Read current consent state from localStorage. Returns false on any error. */
export function getConsentState(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns true if consent has ever been explicitly set (to '0' or '1'). */
export function hasExplicitConsent(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) !== null;
  } catch {
    return false;
  }
}

/** Persist consent state to localStorage. Swallows errors. */
export function setConsentState(optedIn: boolean): void {
  try {
    localStorage.setItem(OPTED_IN_KEY, optedIn ? '1' : '0');
  } catch { /* noop */ }
}
