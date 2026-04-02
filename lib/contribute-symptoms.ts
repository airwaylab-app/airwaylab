// ============================================================
// AirwayLab — Symptom Contribution Client
// Builds and submits anonymised symptom rating payloads.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type { NightResult } from './types';
import { computeIFLRisk } from './ifl-risk';

/** Bucket a pressure value into a privacy-preserving range string. */
export function bucketPressure(pressure: number): string {
  if (pressure < 6) return '<6';
  if (pressure < 8) return '6-8';
  if (pressure < 10) return '8-10';
  if (pressure < 12) return '10-12';
  if (pressure < 14) return '12-14';
  return '14+';
}

interface SymptomContributionPayload {
  symptom_rating: number;
  ifl_risk: number;
  glasgow_overall: number;
  fl_score: number;
  ned_mean: number;
  regularity: number;
  eai: number;
  rera_index: number;
  combined_fl_pct: number;
  pressure_bucket: string;
  pap_mode: string;
  device_model: string;
  duration_hours: number;
  // Enhanced fields (v0.7.0+)
  hypopnea_index?: number;
  amplitude_cv?: number;
  unstable_epoch_pct?: number;
  tidal_volume_cv?: number;
  trigger_delay_median_ms?: number;
  ie_ratio?: number;
}

/** Build a contribution payload from a night result and symptom rating. */
export function buildContributionPayload(
  night: NightResult,
  symptomRating: number
): SymptomContributionPayload {
  const payload: SymptomContributionPayload = {
    symptom_rating: symptomRating,
    ifl_risk: Math.round(computeIFLRisk(night) * 10) / 10,
    glasgow_overall: Math.round(night.glasgow.overall * 100) / 100,
    fl_score: Math.round(night.wat.flScore * 10) / 10,
    ned_mean: Math.round(night.ned.nedMean * 10) / 10,
    regularity: Math.round(night.wat.regularityScore),
    eai: Math.round((night.ned.estimatedArousalIndex ?? 0) * 10) / 10,
    rera_index: Math.round(night.ned.reraIndex * 10) / 10,
    combined_fl_pct: Math.round(night.ned.combinedFLPct),
    pressure_bucket: bucketPressure(night.settings.epap),
    pap_mode: night.settings.papMode,
    device_model: night.settings.deviceModel,
    duration_hours: Math.round(night.durationHours * 100) / 100,
  };

  // Enhanced fields — only include when available
  if (night.ned.hypopneaIndex !== undefined) {
    payload.hypopnea_index = Math.round(night.ned.hypopneaIndex * 10) / 10;
  }
  if (night.ned.amplitudeCvOverall !== undefined) {
    payload.amplitude_cv = Math.round(night.ned.amplitudeCvOverall * 10) / 10;
  }
  if (night.ned.unstableEpochPct !== undefined) {
    payload.unstable_epoch_pct = Math.round(night.ned.unstableEpochPct);
  }
  if (night.settingsMetrics) {
    payload.tidal_volume_cv = Math.round(night.settingsMetrics.tidalVolumeCv * 10) / 10;
    payload.trigger_delay_median_ms = Math.round(night.settingsMetrics.triggerDelayMedianMs);
    payload.ie_ratio = Math.round(night.settingsMetrics.ieRatio * 100) / 100;
  }

  return payload;
}

/** Submit a symptom contribution to the server. Returns true on success. */
export async function contributeSymptoms(
  night: NightResult,
  symptomRating: number,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const payload = buildContributionPayload(night, symptomRating);
    const res = await fetch('/api/contribute-symptoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, ...payload }),
      signal,
    });
    return res.ok;
  } catch (error) {
    Sentry.captureException(error, { tags: { action: 'contribute-symptoms' } });
    return false;
  }
}
