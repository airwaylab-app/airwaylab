// ============================================================
// AirwayLab — Settings Validation Engine
// Per-breath BiPAP settings validation using 25Hz BRP flow + pressure.
// Computes trigger delay, cycle timing, IPAP dwell, ventilation metrics.
// ============================================================

import type { SettingsMetrics } from '../types';

// --- Helpers ---

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Linear interpolation percentile on a sorted array */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i]!;
  return sum / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i]! - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
}

// --- Pressure Detection ---

interface DetectedPressures {
  epap: number;
  ipap: number;
  ps: number;
}

/**
 * Detect EPAP/IPAP from BRP pressure channel using P10/P90 percentiles.
 * Correctly handles bimodal distribution (EPAP during expiration, IPAP during inspiration).
 * Returns null if insufficient data or PS < 1 cmH2O (CPAP / no pressure support).
 */
function detectPressures(pressureData: Float32Array): DetectedPressures | null {
  const valid: number[] = [];
  for (let i = 0; i < pressureData.length; i++) {
    const p = pressureData[i]!;
    if (p > 3 && p < 30) valid.push(p);
  }
  if (valid.length < 1000) return null;

  valid.sort((a, b) => a - b);
  const epap = valid[Math.floor(valid.length * 0.10)]!;
  const ipap = valid[Math.floor(valid.length * 0.90)]!;
  const ps = ipap - epap;
  if (ps < 1) return null;

  return { epap: round1(epap), ipap: round1(ipap), ps: round1(ps) };
}

// --- Flow Smoothing ---

/**
 * Moving average smoothing for zero-crossing detection.
 * Kernel size: ~40ms window (same approach as Python reference).
 */
function smoothFlow(flowData: Float32Array, samplingRate: number): Float32Array {
  const kernelSize = Math.max(3, (Math.floor(samplingRate * 0.04) | 1));
  const halfK = Math.floor(kernelSize / 2);
  const len = flowData.length;
  const smoothed = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const lo = Math.max(0, i - halfK);
    const hi = Math.min(len - 1, i + halfK);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += flowData[j]!;
    smoothed[i] = sum / (hi - lo + 1);
  }

  return smoothed;
}

// --- Main Engine ---

/**
 * Compute BiPAP settings validation metrics from 25Hz BRP flow + pressure.
 *
 * Returns null when:
 * - pressureData is null/empty
 * - Detected PS < 1 cmH2O (CPAP or negligible pressure support)
 * - Fewer than 10 valid breaths detected
 * - Recording is too short (< 60s of flow data)
 */
export function computeSettingsMetrics(
  flowData: Float32Array,
  pressureData: Float32Array,
  samplingRate: number
): SettingsMetrics | null {
  if (!pressureData || pressureData.length === 0) return null;
  if (flowData.length < samplingRate * 60) return null;

  // Step 1: Detect EPAP/IPAP from pressure distribution
  const pressures = detectPressures(pressureData);
  if (!pressures) return null;

  const { epap, ipap, ps } = pressures;

  // Pressure thresholds
  const pressRiseThreshold = epap + 0.15 * ps;
  const pressIpapThreshold = epap + 0.90 * ps;
  const pressCycleThreshold = epap + 0.50 * ps;

  // Step 2: Smooth flow for zero-crossing detection
  const smoothed = smoothFlow(flowData, samplingRate);

  // Step 3: Find inspiration starts (positive-going zero crossings in smoothed flow)
  const inspStarts: number[] = [];
  // Compute sign array, propagating forward through zeros
  const len = smoothed.length;
  const signs = new Int8Array(len);
  for (let i = 0; i < len; i++) {
    if (smoothed[i]! > 0) signs[i] = 1;
    else if (smoothed[i]! < 0) signs[i] = -1;
    else signs[i] = i > 0 ? signs[i - 1]! : 0;
  }

  for (let i = 0; i < len - 1; i++) {
    if (signs[i]! <= 0 && signs[i + 1]! > 0) {
      inspStarts.push(i + 1);
    }
  }

  // Step 4: Per-breath analysis
  const triggerDelays: number[] = [];
  let autoTriggers = 0;
  const tiValues: number[] = [];
  const teValues: number[] = [];
  const timeAtIpapValues: number[] = [];
  const ipapDwellPcts: number[] = [];
  let prematureCycles = 0;
  let lateCycles = 0;
  const tidalVolumes: number[] = [];
  const endExpPressures: number[] = [];
  let totalBreaths = 0;

  for (let idx = 0; idx < inspStarts.length - 1; idx++) {
    const start = inspStarts[idx]!;
    const end = inspStarts[idx + 1]!;
    const durS = (end - start) / samplingRate;

    // Validate breath duration (1.0-10.0s)
    if (durS < 1.0 || durS > 10.0) continue;

    // Find expiration start (negative-going zero crossing within this breath)
    let expStartRel: number | null = null;
    for (let j = 1; j < end - start; j++) {
      const absJ = start + j;
      if (smoothed[absJ - 1]! > 0 && smoothed[absJ]! <= 0) {
        expStartRel = j;
        break;
      }
    }
    if (expStartRel === null || expStartRel < 5) continue;

    // Validate inspiration
    const inspLen = expStartRel;
    let peakFlow = 0;
    for (let j = 0; j < inspLen; j++) {
      if (flowData[start + j]! > peakFlow) peakFlow = flowData[start + j]!;
    }
    if (peakFlow < 0.05) continue;

    totalBreaths++;
    const tiS = expStartRel / samplingRate;
    const teS = (end - start - expStartRel) / samplingRate;
    tiValues.push(tiS);
    teValues.push(teS);

    // === TRIGGER METRICS ===
    let triggerSample: number | null = null;
    for (let k = 0; k < inspLen; k++) {
      if (pressureData[start + k]! >= pressRiseThreshold) {
        triggerSample = k;
        break;
      }
    }

    if (triggerSample !== null) {
      const delayMs = Math.round(triggerSample / samplingRate * 1000);
      triggerDelays.push(delayMs);
    }

    // Auto-trigger: pressure already above rise threshold at flow onset
    if (inspLen > 2 && pressureData[start]! > pressRiseThreshold) {
      autoTriggers++;
    }

    // === CYCLE METRICS ===
    // Time at IPAP: count samples where pressure >= 90% IPAP threshold during inspiration
    let atIpapCount = 0;
    for (let k = 0; k < inspLen; k++) {
      if (pressureData[start + k]! >= pressIpapThreshold) atIpapCount++;
    }
    const timeAtIpapMs = Math.round(atIpapCount / samplingRate * 1000);
    timeAtIpapValues.push(timeAtIpapMs);
    const dwellPct = inspLen > 0 ? (atIpapCount / inspLen * 100) : 0;
    ipapDwellPcts.push(dwellPct);

    // Premature cycle: pressure drops below cycle threshold while flow still >25% peak
    const flowThreshold = 0.25 * peakFlow;
    let pressDropSample: number | null = null;
    const searchStart = Math.max(Math.floor(inspLen / 3), 0);
    for (let k = inspLen - 1; k > searchStart; k--) {
      if (pressureData[start + k]! < pressCycleThreshold &&
          k > 0 && pressureData[start + k - 1]! >= pressCycleThreshold) {
        pressDropSample = k;
        break;
      }
    }
    if (pressDropSample !== null && pressDropSample < inspLen) {
      // Check remaining flow after pressure drop
      let remainingFlowSum = 0;
      let remainingCount = 0;
      for (let k = pressDropSample; k < inspLen; k++) {
        remainingFlowSum += flowData[start + k]!;
        remainingCount++;
      }
      if (remainingCount > 0 && (remainingFlowSum / remainingCount) > flowThreshold) {
        prematureCycles++;
      }
    }

    // Late cycle: pressure still high in first 100ms of expiration
    const expAbsStart = start + expStartRel;
    const expAbsEnd = end;
    const expLen = expAbsEnd - expAbsStart;
    if (expLen > 3) {
      const checkSamples = Math.min(Math.floor(0.1 * samplingRate), expLen);
      let earlyExpPressSum = 0;
      for (let k = 0; k < checkSamples; k++) {
        earlyExpPressSum += pressureData[expAbsStart + k]!;
      }
      if (checkSamples > 0 && (earlyExpPressSum / checkSamples) > pressCycleThreshold) {
        lateCycles++;
      }
    }

    // === VENTILATION METRICS ===
    // Tidal volume proxy: integral of inspiratory flow (L/min → litres)
    let flowSum = 0;
    for (let k = 0; k < inspLen; k++) {
      flowSum += flowData[start + k]!;
    }
    const tv = flowSum / (60 * samplingRate);
    tidalVolumes.push(tv);

    // === EPAP METRICS ===
    // End-expiratory pressure: last 200ms before this inspiration start
    const preInspSamples = Math.floor(0.2 * samplingRate);
    if (start >= preInspSamples) {
      let eepSum = 0;
      for (let k = start - preInspSamples; k < start; k++) {
        eepSum += pressureData[k]!;
      }
      endExpPressures.push(eepSum / preInspSamples);
    }
  }

  // Step 5: Aggregate
  if (totalBreaths < 10) return null;

  const tiSorted = [...tiValues].sort((a, b) => a - b);
  const teSorted = [...teValues].sort((a, b) => a - b);
  const tdSorted = triggerDelays.length > 0
    ? [...triggerDelays].sort((a, b) => a - b)
    : [0];
  const tatSorted = [...timeAtIpapValues].sort((a, b) => a - b);
  const dwellSorted = [...ipapDwellPcts].sort((a, b) => a - b);
  const tvSorted = tidalVolumes.length > 0
    ? [...tidalVolumes].sort((a, b) => a - b)
    : [0];

  const tiMedian = percentile(tiSorted, 50);
  const teMedian = percentile(teSorted, 50);

  // Total recording time for minute ventilation
  const totalTimeSec = tiValues.reduce((a, b) => a + b, 0) + teValues.reduce((a, b) => a + b, 0);
  const totalTimeHrs = totalTimeSec / 3600;

  return {
    breathCount: totalBreaths,

    epapDetected: epap,
    ipapDetected: ipap,
    psDetected: ps,

    triggerDelayMedianMs: Math.round(percentile(tdSorted, 50)),
    triggerDelayP10Ms: Math.round(percentile(tdSorted, 10)),
    triggerDelayP90Ms: Math.round(percentile(tdSorted, 90)),
    autoTriggerPct: round1(autoTriggers / totalBreaths * 100),

    tiMedianMs: Math.round(tiMedian * 1000),
    tiP25Ms: Math.round(percentile(tiSorted, 25) * 1000),
    tiP75Ms: Math.round(percentile(tiSorted, 75) * 1000),
    teMedianMs: Math.round(teMedian * 1000),
    ieRatio: tiMedian > 0 ? round2(teMedian / tiMedian) : 0,
    timeAtIpapMedianMs: Math.round(percentile(tatSorted, 50)),
    timeAtIpapP25Ms: Math.round(percentile(tatSorted, 25)),
    ipapDwellMedianPct: round1(percentile(dwellSorted, 50)),
    ipapDwellP10Pct: round1(percentile(dwellSorted, 10)),
    prematureCyclePct: round1(prematureCycles / totalBreaths * 100),
    lateCyclePct: round1(lateCycles / totalBreaths * 100),

    endExpPressureMean: round2(mean(endExpPressures)),
    endExpPressureSd: round2(std(endExpPressures)),

    tidalVolumeMedianMl: Math.round(percentile(tvSorted, 50) * 1000),
    tidalVolumeP25Ml: Math.round(percentile(tvSorted, 25) * 1000),
    tidalVolumeP75Ml: Math.round(percentile(tvSorted, 75) * 1000),
    tidalVolumeCv: mean(tidalVolumes) > 0
      ? round1(std(tidalVolumes) / mean(tidalVolumes) * 100)
      : 0,
    minuteVentProxy: totalTimeHrs > 0
      ? round1(tidalVolumes.reduce((a, b) => a + b, 0) / totalTimeHrs)
      : 0,
  };
}
