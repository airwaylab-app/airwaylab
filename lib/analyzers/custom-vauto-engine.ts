// ============================================================
// AirwayLab — airbreak-plus Custom VAuto Analysis Engine
// Models and analyzes delivered therapy for sessions using
// airbreak-plus Custom VAuto firmware (m-kozlowski/airbreak-plus).
// Reconstructs breath-by-breath adaptive boost, expiratory relief (EPS),
// exhale shape descent retention, pre-trigger assist, and Max IPAP headroom/clipping.
// ============================================================

import type { CustomVAutoMetrics, MachineSettings } from '../types';

export interface BreathInfo {
  inspStart: number;
  expStart: number;
  inspEnd: number;
  ti: number;
  te: number;
  peakFlow: number;
  tidalVolume: number;
  peakPressure: number;
  endExpPressure: number;
}

// PID constants matching airbreak-plus patches/my_asv.h
const ASV_PID_P = 0.5;
const ASV_PID_I = 0.1;
const ASV_PID_D = 0.2;
const ASV_PID_MIN = 0.0;
const ASV_PID_MAX = 1.5;
const ASV_LOW = 0.94;
const ASV_HIGH = 0.96;
const TR_COEFF = 0.025; // moving average weight per valid breath
const ASV_DAMPEN_MAX = 0.4;

function clamp(val: number, minVal: number, maxVal: number): number {
  return Math.max(minVal, Math.min(maxVal, val));
}

function remap01c(s: number, start: number, end: number): number {
  if (Math.abs(end - start) < 1e-6) return 0;
  return clamp((s - start) / (end - start), 0.0, 1.0);
}

/**
 * Reconstructs airbreak-plus Custom VAuto metrics across a session.
 */
export function computeCustomVAutoMetrics(
  breaths: BreathInfo[],
  machineSettings: MachineSettings,
  _samplingRate: number
): CustomVAutoMetrics | null {
  const custom = machineSettings.customVAuto;
  if (!custom || !custom.enabled) {
    return null;
  }

  const basePs = machineSettings.pressureSupport > 0
    ? machineSettings.pressureSupport
    : (machineSettings.extendedSettings?.['S.VA.PS'] ?? 3.2);

  const minEpap = machineSettings.epap > 0
    ? machineSettings.epap
    : (machineSettings.extendedSettings?.['S.VA.MinEPAP'] ?? 8.8);

  const maxIpap = machineSettings.ipap > 0
    ? machineSettings.ipap
    : (machineSettings.extendedSettings?.['S.VA.MaxIPAP'] ?? 15.0);

  const asvMax = custom.asvMax;
  const sensMultiplier = custom.asvSensMultiplier;

  // EPS from RDH (0.0-3.0 cmH2O; 0 = Off). Firmware 0xFFFF fallback when unconfigured is 1.0 cmH2O.
  const configuredEps = custom.eps !== undefined ? clamp(custom.eps, 0.0, 3.0) : 1.0;

  // Exh. Shape from RDW (0-7, default 0). Quadratic curve coefficient s = -0.75 + 0.25 * level.
  const exhaleShape = custom.exhaleShape !== undefined ? clamp(Math.round(custom.exhaleShape), 0, 7) : 0;
  const exhaleShapeExponent = Math.round((-0.75 + 0.25 * exhaleShape) * 100) / 100;
  // Area under normalized expiratory support curve x_exp = xc + s * xc * (1 - xc) on [0, 1] is 0.5 + s/6
  const expiratoryRetentionPct = Math.round((0.5 + exhaleShapeExponent / 6.0) * 1000) / 10;

  if (breaths.length < 10) {
    return null;
  }

  // Tracking state for ASV adaptive volume model
  let targetVol = 0.35; // moving target volume in liters
  let lastError = 0.0;
  let cumulativeError = 0.0;
  let asvDampen = 0.0;

  const deliveredBoosts: number[] = [];
  const effectivePsList: number[] = [];
  const epsReliefList: number[] = [];
  const maxIpapHeadroomList: number[] = [];

  let boostedBreaths = 0;
  let clippedBreaths = 0;
  let exceededBreaths = 0;
  let shortTiBreaths = 0;
  let preTriggerAssists = 0;
  let dampenedBreaths = 0;

  for (let bIdx = 0; bIdx < breaths.length; bIdx++) {
    const b = breaths[bIdx]!;
    const ti = b.ti;
    const tv = b.tidalVolume;

    // 1. Ti 0.7s Gate for EPS Expiratory Relief and Valid Breath Update
    const qualifiesForEps = ti >= 0.7;
    if (!qualifiesForEps) {
      shortTiBreaths++;
    }

    // Post-hyperpnea dampening offset (matching patches/my_asv.c)
    const asvMod = asvDampen > 0.1 ? -ASV_DAMPEN_MAX * asvDampen : 0.0;
    if (asvMod < 0) {
      dampenedBreaths++;
    }

    // 2. Adaptive Boost Simulation (matching my_asv.c)
    // Error is difference between current volume and moving reference volume
    let breathBoost = 0.0;
    if (asvMax > 0 && targetVol > 0.05) {
      const volRatio = tv / targetVol;
      // Below (0.94 + asvMod) -> request boost; Above (0.96 + 0.5*asvMod) -> reduce boost
      const err =
        remap01c(volRatio, ASV_LOW + asvMod, 0.4 + asvMod) -
        remap01c(volRatio, ASV_HIGH + asvMod * 0.5, 1.4 + asvMod * 0.5);

      cumulativeError += ASV_PID_I * err;
      cumulativeError = clamp(cumulativeError, ASV_PID_MIN, ASV_PID_MAX);

      const pTerm = ASV_PID_P * err;
      const dTerm = ASV_PID_D * (err - lastError);
      lastError = err;

      const rawSignal = clamp(pTerm + cumulativeError + dTerm, ASV_PID_MIN, ASV_PID_MAX);
      const pidSignal = rawSignal * sensMultiplier;

      // Boost is added above base pressure shape, capped by ASV Max
      const requestedBoost = pidSignal * (basePs * 0.8);
      breathBoost = clamp(requestedBoost, 0.0, asvMax);
    }

    // 3. Headroom to Max IPAP Ceiling
    // Delivered IPAP = configured Min EPAP + basePs + breathBoost
    const nominalIpap = minEpap + basePs + breathBoost;
    maxIpapHeadroomList.push(Math.max(0, maxIpap - nominalIpap));

    if (nominalIpap > maxIpap) {
      exceededBreaths++;
    }

    if (breathBoost > 0.1) {
      boostedBreaths++;
      // Check if Max IPAP clipped the boost
      if (nominalIpap >= maxIpap - 0.1) {
        clippedBreaths++;
        breathBoost = Math.max(0, maxIpap - (minEpap + basePs));
      }
    }

    deliveredBoosts.push(breathBoost);
    const effectivePs = basePs + breathBoost;
    effectivePsList.push(effectivePs);

    // 4. Expiratory Pressure Relief (EPS) calculation (patches/wrapper_limit_max_pdiff.c)
    // In airbreak-plus:
    //   relief = max(0, EPS - 0.25 * max(0, peak_support - PS))
    //   pressure_floor = min(4.0, cmd_epap_ramp + orig_ps)
    let epsRelief = 0.0;
    if (qualifiesForEps && configuredEps > 0) {
      const rawRelief = Math.max(0.0, configuredEps - breathBoost * 0.25);
      const maxFloorRelief = Math.max(0.0, minEpap - 4.0);
      epsRelief = Math.min(rawRelief, maxFloorRelief);
    }
    epsReliefList.push(epsRelief);

    // 5. Pre-trigger assist: if customTriggerCycle is on and breath has rapid onset
    if (custom.customTriggerCycle && b.peakFlow > 15 && bIdx > 0) {
      preTriggerAssists++;
    }

    // Update moving reference target and hyperpnea dampening for valid breaths (Ti >= 0.7s)
    if (qualifiesForEps && tv > 0.1 && tv < 1.2) {
      if (bIdx >= 20) {
        let errorVol = (tv - targetVol) / (targetVol + 0.001);
        if (errorVol > 0) {
          errorVol = Math.max(errorVol - 0.1, 0) * 1.25;
        } else {
          errorVol = (errorVol - 0.025) * 0.75;
        }
        asvDampen = clamp(asvDampen * 0.9 + errorVol, 0.0, 1.0);
      }
      targetVol = targetVol + (tv - targetVol) * TR_COEFF;
    }
  }

  const total = breaths.length;
  deliveredBoosts.sort((a, b) => a - b);
  effectivePsList.sort((a, b) => a - b);
  epsReliefList.sort((a, b) => a - b);
  maxIpapHeadroomList.sort((a, b) => a - b);

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const percentile = (sorted: number[], p: number) => {
    if (sorted.length === 0) return 0;
    const idx = Math.floor((p / 100) * (sorted.length - 1));
    return sorted[idx]!;
  };

  return {
    active: true,
    asvBoostMean: round2(mean(deliveredBoosts)),
    asvBoostMax: round1(deliveredBoosts[deliveredBoosts.length - 1] ?? 0),
    boostedBreathPct: round1((boostedBreaths / total) * 100),
    maxIpapClippedPct: round1((clippedBreaths / total) * 100),
    maxIpapExceededPct: round1((exceededBreaths / total) * 100),
    epsReliefMean: round2(mean(epsReliefList)),
    epsReliefMax: round1(epsReliefList[epsReliefList.length - 1] ?? 0),
    effectivePsMedian: round1(percentile(effectivePsList, 50)),
    effectivePsP95: round1(percentile(effectivePsList, 95)),
    shortTiUnder07sPct: round1((shortTiBreaths / total) * 100),
    preTriggerAssistPct: round1((preTriggerAssists / total) * 100),
    maxIpapHeadroomMedian: round1(percentile(maxIpapHeadroomList, 50)),
    epsConfigured: round1(configuredEps),
    exhaleShape,
    exhaleShapeExponent,
    expiratoryRetentionPct,
    dampenedBreathPct: round1((dampenedBreaths / total) * 100),
  };
}
