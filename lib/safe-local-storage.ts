// ============================================================
// AirwayLab — Safe localStorage Wrapper
// Handles SecurityError (private browsing) and QuotaExceededError.
// ============================================================

/**
 * Safe localStorage.getItem wrapper.
 * Returns null on any error (private browsing, SecurityError, quota).
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe localStorage.setItem wrapper.
 * Returns true on success, false on any error.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe localStorage.removeItem wrapper.
 * Silently ignores errors.
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Non-fatal
  }
}
