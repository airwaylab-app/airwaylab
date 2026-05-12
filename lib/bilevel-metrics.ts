// ============================================================
// AirwayLab — Bilevel Breath Classification Metrics
// Aggregates TrigCycEvt signal (AirCurve 10/11 BRP.edf) into
// Spontaneous% and Timed% for display in the All Nights table.
// ============================================================

/**
 * AirCurve 10/11 BRP TrigCycEvt signal event codes (physical values at 25 Hz):
 *   0 = No event (unclassified, or CPAP breath with no bilevel signal)
 *   1 = S  — Spontaneous (patient-triggered inspiration)
 *   2 = T  — Timed (machine backup-rate triggered)
 *   3 = H  — Hypopnea (patient-triggered, reduced flow)
 * Source: OSCAR open-source CPAP analysis project (GPL-3.0), loader_resmed.cpp.
 * Validate against real AirCurve 10 VAuto data before relying on these codes.
 *
 * Each non-zero value run in the 25 Hz signal represents one classified breath.
 * Spontaneous% counts breaths with code 1; Timed% counts breaths with code 2.
 * Hypopnea breaths (code 3) contribute to the total but are not surfaced separately.
 *
 * Returns null if no classified breaths are found (CPAP/APAP device, or signal absent).
 */
export function computeSpontaneousPct(
  data: Float32Array
): { spontaneousPct: number; timedPct: number } | null {
  let spontaneous = 0;
  let timed = 0;
  let hypopnea = 0;
  let prev = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.round(data[i]!);
    if (v !== 0 && v !== prev) {
      if (v === 1) spontaneous++;
      else if (v === 2) timed++;
      else if (v === 3) hypopnea++;
    }
    prev = v;
  }
  const total = spontaneous + timed + hypopnea;
  if (total === 0) return null;
  return {
    spontaneousPct: Math.round((spontaneous / total) * 1000) / 10,
    timedPct: Math.round((timed / total) * 1000) / 10,
  };
}
