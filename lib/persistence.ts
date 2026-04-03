// ============================================================
// AirwayLab — localStorage Persistence
// Saves/loads analysis results so users can revisit them.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type { NightResult } from './types';
import { ENGINE_VERSION } from './engine-version';

const STORAGE_KEY = 'airwaylab_results';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_STORAGE_BYTES = 4 * 1024 * 1024; // 4 MB safety margin (most browsers allow 5-10 MB)

interface PersistResult {
  saved: boolean;
  nightsSaved: number;
  nightsDropped: number;
  reason?: string;
}

interface PersistedData {
  nights: NightResult[];
  therapyChangeDate: string | null;
  savedAt: number;
  engineVersion?: string;
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
      breaths: [], // Per-breath data stored in IndexedDB (breath-data-idb.ts), not localStorage
    },
    oximetryTrace: null, // trace data too large for localStorage — re-extract on demand
    // settingsMetrics is a small summary object — keep it for persistence
  }));
}

/**
 * Try to serialise nights into JSON that fits within the storage cap.
 * Returns the JSON string, or null if even a single night doesn't fit.
 */
function trySerialise(
  nights: NightResult[],
  therapyChangeDate: string | null
): { json: string; nightCount: number } | null {
  const stripped = stripBulkData(nights);

  const data: PersistedData = {
    nights: stripped,
    therapyChangeDate,
    savedAt: Date.now(),
    engineVersion: ENGINE_VERSION,
  };
  const json = JSON.stringify(data);

  if (json.length * 2 <= MAX_STORAGE_BYTES) {
    return { json, nightCount: nights.length };
  }
  return null;
}

/**
 * Save analysis results to localStorage.
 * Strips bulk data to stay within quota. If the full dataset exceeds
 * 4 MB, progressively drops the oldest nights until it fits.
 * Returns details about what was saved so the UI can warn the user.
 */
export function persistResults(
  nights: NightResult[],
  therapyChangeDate: string | null
): PersistResult {
  Sentry.addBreadcrumb({ message: 'Results persisted', category: 'persistence', data: { nightCount: nights.length } });

  try {
    // Try full dataset first
    const full = trySerialise(nights, therapyChangeDate);
    if (full) {
      localStorage.setItem(STORAGE_KEY, full.json);
      return { saved: true, nightsSaved: nights.length, nightsDropped: 0 };
    }

    // Progressive: drop oldest nights (sorted most-recent-first already)
    // until it fits. Binary search for the max count that fits.
    let lo = 1;
    let hi = nights.length - 1;
    let bestFit: { json: string; count: number } | null = null;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const attempt = trySerialise(nights.slice(0, mid), therapyChangeDate);
      if (attempt) {
        bestFit = { json: attempt.json, count: mid };
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (bestFit) {
      localStorage.setItem(STORAGE_KEY, bestFit.json);
      const dropped = nights.length - bestFit.count;

      // Expected behavior for large datasets — not a bug
      console.warn(
        `[persistence] Data too large for ${nights.length} nights. Saved ${bestFit.count} most recent, dropped ${dropped} oldest.`
      );

      return {
        saved: true,
        nightsSaved: bestFit.count,
        nightsDropped: dropped,
        reason: `Only the ${bestFit.count} most recent nights could be saved. ${dropped} older night${dropped !== 1 ? 's' : ''} will need to be re-uploaded next time.`,
      };
    }

    // Even a single night doesn't fit — total failure
    console.error('[persistence] Cannot save even 1 night — data too large.');
    Sentry.captureMessage('Persistence: total failure — cannot save any nights', {
      level: 'error',
      extra: { totalNights: nights.length },
    });

    return {
      saved: false,
      nightsSaved: 0,
      nightsDropped: nights.length,
      reason: 'Your results are too large to save in this browser. They will be available until you close the tab, but you\'ll need to re-upload next time.',
    };
  } catch (err) {
    // QuotaExceededError or SecurityError
    console.error('[persistence] Save failed:', err);
    Sentry.captureException(err, {
      extra: { context: 'persistResults', totalNights: nights.length },
    });

    return {
      saved: false,
      nightsSaved: 0,
      nightsDropped: nights.length,
      reason: 'Could not save results to browser storage. They will be available until you close the tab.',
    };
  }
}

/**
 * Load persisted results from localStorage.
 * Returns null if nothing is saved, data is too old, or parsing fails.
 * Returns { engineUpgraded: true } if data exists but was analyzed with an
 * older engine version — the UI should prompt re-upload instead of showing
 * an empty dashboard.
 */
export function loadPersistedResults(): {
  nights: NightResult[];
  therapyChangeDate: string | null;
  engineUpgraded?: boolean;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // Validate basic shape
    if (!data || typeof data !== 'object' || typeof data.savedAt !== 'number') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Expire after MAX_AGE_MS
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Engine version mismatch: clear stale data but signal to UI (FB-22)
    if (data.engineVersion && data.engineVersion !== ENGINE_VERSION) {
      const nightCount = Array.isArray(data.nights) ? data.nights.length : 0;
      localStorage.removeItem(STORAGE_KEY);
      if (nightCount > 0) {
        return { nights: [], therapyChangeDate: null, engineUpgraded: true };
      }
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
      console.warn('[persistence] Corrupted data detected, clearing');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Restore Date objects and migrate missing fields
    for (const night of data.nights) {
      night.date = new Date(night.date);
      // Migrate: estimatedArousalIndex added in v0.6.0
      if (night.ned && night.ned.estimatedArousalIndex === undefined) {
        night.ned.estimatedArousalIndex = 0;
      }
      // Migrate: settingsSource added in v0.8.0
      if (night.settings && night.settings.settingsSource === undefined) {
        night.settings.settingsSource = 'extracted';
      }
      // Migrate: crossDevice added in cross-device RERA-arousal matching
      if (night.crossDevice === undefined) {
        night.crossDevice = null;
      }
      // Migrate: machineSummary + settingsFingerprint added in comprehensive-settings-extraction
      if ((night as Record<string, unknown>).machineSummary === undefined) {
        night.machineSummary = null;
      }
      if ((night as Record<string, unknown>).settingsFingerprint === undefined) {
        night.settingsFingerprint = null;
      }
      // Migrate: csl added for CSL.edf Cheyne-Stokes data
      if ((night as Record<string, unknown>).csl === undefined) {
        night.csl = null;
      }
      // Migrate: pldSummary added for PLD.edf low-resolution therapy data
      if ((night as Record<string, unknown>).pldSummary === undefined) {
        night.pldSummary = null;
      }
      // Migrate: hypopnea & amplitude stability fields added in v0.7.0
      if (night.ned && night.ned.briefObstructionIndex === undefined) {
        night.ned.hypopneaCount = 0;
        night.ned.hypopneaIndex = 0;
        night.ned.hypopneaSource = 'algorithm';
        night.ned.hypopneaNedInvisibleCount = 0;
        night.ned.hypopneaNedInvisiblePct = 0;
        night.ned.hypopneaMeanDropPct = 0;
        night.ned.hypopneaMeanDurationS = 0;
        night.ned.hypopneaH1Index = 0;
        night.ned.hypopneaH2Index = 0;
        night.ned.briefObstructionCount = 0;
        night.ned.briefObstructionIndex = 0;
        night.ned.briefObstructionH1Index = 0;
        night.ned.briefObstructionH2Index = 0;
        night.ned.amplitudeCvOverall = 0;
        night.ned.amplitudeCvMedianEpoch = 0;
        night.ned.unstableEpochPct = 0;
      }
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
 * Incrementally persist nights by merging into existing cached data.
 * New nights replace existing ones by dateStr; unknown dates are appended.
 * Uses the same 4MB cap handling as persistResults().
 */
export function persistNightsIncremental(nights: NightResult[]): PersistResult {
  const existing = loadPersistedResults();
  const existingNights = existing?.nights ?? [];
  const therapyChangeDate = existing?.therapyChangeDate ?? null;

  // Build map: existing first, incoming overwrites by dateStr
  const map = new Map<string, NightResult>();
  for (const n of existingNights) map.set(n.dateStr, n);
  for (const n of nights) map.set(n.dateStr, n);

  const merged = Array.from(map.values());
  merged.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return persistResults(merged, therapyChangeDate);
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
