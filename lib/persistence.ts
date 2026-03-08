// ============================================================
// AirwayLab — localStorage Persistence
// Saves/loads analysis results so users can revisit them.
// ============================================================

import type { NightResult } from './types';

const STORAGE_KEY = 'airwaylab_results';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4 MB safety margin (most browsers allow 5-10 MB)

interface PersistedData {
  nights: NightResult[];
  therapyChangeDate: string | null;
  savedAt: number;
}

/**
 * Strip bulky per-breath arrays from NightResult before serialisation.
 * These can be tens of MB for long recordings but aren't needed for
 * the overview dashboard — they're only used during live analysis.
 */
function stripBulkData(nights: NightResult[]): NightResult[] {
  return nights.map((n) => ({
    ...n,
    // Remove raw flow/breath arrays that take most of the space
    ned: {
      ...n.ned,
      breaths: [], // per-breath array can be huge — not needed for persistence
    },
  }));
}

/**
 * Save analysis results to localStorage.
 * Strips bulk data to stay within quota. Returns false if save fails.
 */
export function persistResults(
  nights: NightResult[],
  therapyChangeDate: string | null
): boolean {
  try {
    const data: PersistedData = {
      nights: stripBulkData(nights),
      therapyChangeDate,
      savedAt: Date.now(),
    };
    const json = JSON.stringify(data);

    // Pre-flight size check (each char ≈ 2 bytes in UTF-16)
    if (json.length * 2 > MAX_STORAGE_BYTES) {
      console.warn(
        `[persistence] Data too large (${(json.length * 2 / 1024 / 1024).toFixed(1)} MB). Skipping save.`
      );
      return false;
    }

    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (err) {
    // QuotaExceededError or SecurityError
    console.warn('[persistence] Save failed:', err);
    return false;
  }
}

/**
 * Load persisted results from localStorage.
 * Returns null if nothing is saved, data is too old, or parsing fails.
 */
export function loadPersistedResults(): {
  nights: NightResult[];
  therapyChangeDate: string | null;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as PersistedData;

    // Expire after MAX_AGE_MS
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Validate basic structure
    if (!Array.isArray(data.nights) || data.nights.length === 0) {
      return null;
    }

    // Validate night shape (guard against corrupted data)
    const firstNight = data.nights[0];
    if (
      typeof firstNight.dateStr !== 'string' ||
      typeof firstNight.durationHours !== 'number' ||
      !firstNight.glasgow ||
      !firstNight.wat ||
      !firstNight.ned
    ) {
      console.warn('[persistence] Corrupted data detected. Clearing.');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Restore Date objects (they get serialised as strings)
    for (const night of data.nights) {
      night.date = new Date(night.date);
    }

    return {
      nights: data.nights,
      therapyChangeDate: data.therapyChangeDate,
    };
  } catch {
    return null;
  }
}

/**
 * Clear persisted results.
 */
export function clearPersistedResults(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}
