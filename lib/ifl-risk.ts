// ============================================================
// AirwayLab — IFL Symptom Risk Indicator
// Composite metric weighting flow limitation measurements to
// estimate how much FL may be driving symptoms.
// Based on Gold's IFL theory (limbic/HPA axis stress response)
// and Mann et al. 2024 (FL predicts EDS independently of AI).
// ============================================================

import type { NightResult } from './types';

/** Weights for each normalised component (sum = 1.0) */
const W_FL_SCORE = 0.35;
const W_NED_MEAN = 0.30;
const W_FI_MEAN = 0.20;
const W_GLASGOW = 0.15;

/**
 * Safely convert a value to a finite number, defaulting to 0 for NaN/undefined.
 */
function safe(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Compute the IFL Symptom Risk composite (0–100).
 *
 * Inputs are normalised to 0–100 then weighted:
 * - FL Score (0–100): already normalised
 * - NED Mean (0–100): already normalised
 * - FI Mean (0–1): mapped from 0.5–1.0 range to 0–100 (higher FI = flatter = more FL)
 * - Glasgow Overall (0–9): scaled → (overall / 9) × 100
 */
export function computeIFLRisk(night: NightResult): number {
  const flScoreNorm = safe(night.wat.flScore);
  const nedMeanNorm = safe(night.ned.nedMean);
  const fiNorm = Math.max(0, (safe(night.ned.fiMean) - 0.5) / 0.5) * 100;
  const glasgowNorm = (safe(night.glasgow.overall) / 9) * 100;

  const risk =
    flScoreNorm * W_FL_SCORE +
    nedMeanNorm * W_NED_MEAN +
    fiNorm * W_FI_MEAN +
    glasgowNorm * W_GLASGOW;

  // Clamp to 0–100
  return Math.max(0, Math.min(100, Math.round(risk * 10) / 10));
}

/**
 * Return a contextual note when IFL Risk and EAI diverge, or null
 * when they are congruent (no annotation needed).
 */
export function getIFLContextNote(
  iflRisk: number,
  eai: number
): string | null {
  // High FL + Low EAI: FL may be driving symptoms without arousals
  if (iflRisk > 30 && eai <= 5) {
    return 'Flow limitation is elevated despite a low disruption index. Research suggests flow limitation can drive symptoms independently of arousals — discuss flow limitation reduction strategies with your clinician.';
  }

  // Low FL + High EAI: disruptions without FL suggest other causes
  if (iflRisk <= 15 && eai > 10) {
    return 'Your disruption index is elevated without significant flow limitation. This may indicate non-FL causes of sleep disruption — discuss with your clinician.';
  }

  return null;
}
