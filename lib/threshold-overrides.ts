import { THRESHOLDS, type ThresholdDef } from './thresholds';

const STORAGE_KEY = 'airwaylab_custom_thresholds';

export type ThresholdOverrides = Partial<Record<string, ThresholdDef>>;

/** Read custom threshold overrides from localStorage. */
export function loadOverrides(): ThresholdOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    // Only keep keys that are valid threshold names
    const validated: ThresholdOverrides = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (key in THRESHOLDS && val && typeof val === 'object') {
        validated[key] = val as ThresholdDef;
      }
    }
    return validated;
  } catch {
    return {};
  }
}

/** Persist custom threshold overrides to localStorage. */
export function saveOverrides(overrides: ThresholdOverrides): void {
  if (typeof window === 'undefined') return;
  const cleaned = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => key in THRESHOLDS)
  );
  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }
}

/** Remove all custom threshold overrides. */
export function clearOverrides(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Merge default thresholds with overrides. */
export function getMergedThresholds(
  overrides: ThresholdOverrides
): Record<string, ThresholdDef> {
  const merged = { ...THRESHOLDS };
  for (const [key, def] of Object.entries(overrides)) {
    if (key in THRESHOLDS && def) {
      merged[key] = { ...def };
    }
  }
  return merged;
}

/** Convenience: load overrides from localStorage and merge with defaults. */
export function getStoredThresholds(): Record<string, ThresholdDef> {
  return getMergedThresholds(loadOverrides());
}
