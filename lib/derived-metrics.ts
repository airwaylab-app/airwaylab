import type { NEDResults } from './types';

/**
 * Estimated RDI (Respiratory Disturbance Index) from flow waveform analysis.
 *
 * AASM defines RDI = Apnea Index + Hypopnea Index + RERA Index.
 * AirwayLab cannot detect apneas (complete airflow cessation ≥10s) from flow
 * data, so this is a conservative lower-bound estimate:
 *
 *   Est. RDI = RERA Index + Hypopnea Index
 *
 * Most accurate for UARS patients where apneas are rare and RERAs dominate.
 */
export function computeEstimatedRDI(ned: NEDResults): number {
  return ned.reraIndex + (ned.hypopneaIndex ?? 0);
}
