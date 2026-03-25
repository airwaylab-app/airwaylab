// ============================================================
// AirwayLab — Comparison Guard
// Determines which metrics are valid for multi-night comparisons
// based on settings fingerprint changes.
// ============================================================

import type { NightResult } from './types';
import { METRIC_REGISTRY, RT_SENSITIVE_METRICS } from './metric-registry';
import { detectSettingsChanges } from './settings-fingerprint';

export interface ComparisonContext {
  nights: NightResult[];
  settingsChanged: {
    riseTime: boolean;
    ps: boolean;
    cycle: boolean;
    epap: boolean;
  };
}

export interface ComparisonResult {
  valid: string[];
  cautious: string[];
  invalid: string[];
}

/**
 * Build a ComparisonContext from a set of nights.
 * Checks all consecutive pairs for settings changes.
 */
export function buildComparisonContext(nights: NightResult[]): ComparisonContext {
  const settingsChanged = { riseTime: false, ps: false, cycle: false, epap: false };

  for (let i = 0; i < nights.length - 1; i++) {
    const a = nights[i]!.settingsFingerprint;
    const b = nights[i + 1]!.settingsFingerprint;
    const changes = detectSettingsChanges(a, b);
    if (changes.riseTime) settingsChanged.riseTime = true;
    if (changes.ps) settingsChanged.ps = true;
    if (changes.cycle) settingsChanged.cycle = true;
    if (changes.epap) settingsChanged.epap = true;
  }

  return { nights, settingsChanged };
}

/**
 * Get which metrics are valid, cautious, or invalid for the given comparison context.
 */
export function getValidMetrics(context: ComparisonContext): ComparisonResult {
  const valid: string[] = [];
  const cautious: string[] = [];
  const invalid: string[] = [];

  for (const [id, metric] of Object.entries(METRIC_REGISTRY)) {
    // Tier 4 always excluded
    if (metric.tier === 4) {
      invalid.push(id);
      continue;
    }

    // If Rise Time changed, NED-derived metrics with crossRT 'invalid' are invalid
    if (context.settingsChanged.riseTime && RT_SENSITIVE_METRICS.has(id)) {
      invalid.push(id);
      continue;
    }

    // If PS changed, check crossPS
    if (context.settingsChanged.ps) {
      if (metric.crossPS === 'invalid') {
        invalid.push(id);
        continue;
      }
      if (metric.crossPS === 'uncertain') {
        cautious.push(id);
        continue;
      }
    }

    // Tier 3 metrics are always cautious in comparisons
    if (metric.tier === 3) {
      cautious.push(id);
      continue;
    }

    valid.push(id);
  }

  return { valid, cautious, invalid };
}

/**
 * Find settings change boundaries in a sorted array of nights.
 * Returns indices where the settings fingerprint hash changed.
 */
export function findSettingsChangeBoundaries(
  nights: NightResult[]
): { index: number; label: string }[] {
  const boundaries: { index: number; label: string }[] = [];

  for (let i = 0; i < nights.length - 1; i++) {
    const a = nights[i]!.settingsFingerprint;
    const b = nights[i + 1]!.settingsFingerprint;
    const changes = detectSettingsChanges(a, b);
    if (changes.changed) {
      boundaries.push({ index: i + 1, label: changes.label });
    }
  }

  return boundaries;
}
