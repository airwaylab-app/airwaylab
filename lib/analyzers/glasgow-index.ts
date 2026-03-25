// ============================================================
// AirwayLab — Glasgow Index Engine
// Ported from DaveSkvn/GlasgowIndex FlowLimits.js (GPL-3.0)
// ============================================================

import type { GlasgowComponents } from '../types';

/** Minimal session interface — accepts both EDFFile and ParsedSession */
interface FlowSession {
  flowData: Float32Array;
  samplingRate: number;
  durationSeconds: number;
}

// --- Constants (from FlowLimits.js) ---
const MIN_WINDOW = 25;
const GREY_ZONE_LOWER = -10;
const GREY_ZONE_UPPER = 5;
const TOP_THRESHOLD_PERCENT_90 = 0.9;
const MIN_PEAK_BUMP = 1;
const EXTRAPOLATION_SAMPLES = 25;
const AMP_WINDOW_LEN = 5;
const MILLIS_PER_SAMPLE = 40; // 25 Hz

// --- Internal types ---
interface Inspiration {
  start: number;
  end: number;
  midPoint: number;
  maxValue: number;
  leftPercent: number;
  top90Percent: number;
  midVar: number;
  multiPeak: boolean;
  preRest: number;
  noExhale: boolean;
  linkedMinAt: number;
  ampVar: number;
  inspirPerMin: number;
}

/**
 * Compute the Glasgow Index for a single EDF session.
 * Returns 9 component scores (each 0-1) and an overall score (0-9).
 */
export function computeGlasgowIndex(flowData: Float32Array, _samplingRate: number): GlasgowComponents {
  const len = flowData.length;
  if (len < MIN_WINDOW * 4) {
    return emptyComponents();
  }

  // Step 1: Find expiration minimums
  const isMin = findMins(flowData);

  // Step 2: Find inspirations and their characteristics
  const inspirations = findInspirations(flowData);

  if (inspirations.length === 0) {
    return emptyComponents();
  }

  // Step 3: Match expirations to inspirations (cycle-based indicators)
  calcCycleBasedIndicators(flowData, isMin, inspirations);

  // Step 4: Calculate amplitude variance
  inspirationAmplitude(inspirations);

  // Step 5: Score each inspiration and compute cumulative indices
  return prepIndices(inspirations);
}

/**
 * Compute weighted Glasgow Index for a multi-session night.
 */
export function computeNightGlasgow(sessions: FlowSession[]): GlasgowComponents {
  if (sessions.length === 0) return emptyComponents();
  if (sessions.length === 1) {
    return computeGlasgowIndex(sessions[0]!.flowData, sessions[0]!.samplingRate);
  }

  // Duration-weighted average across sessions
  const results: { gi: GlasgowComponents; duration: number }[] = [];
  let totalDuration = 0;

  for (const session of sessions) {
    const gi = computeGlasgowIndex(session.flowData, session.samplingRate);
    results.push({ gi, duration: session.durationSeconds });
    totalDuration += session.durationSeconds;
  }

  if (totalDuration === 0) return emptyComponents();

  const weighted: GlasgowComponents = {
    overall: 0,
    skew: 0,
    spike: 0,
    flatTop: 0,
    topHeavy: 0,
    multiPeak: 0,
    noPause: 0,
    inspirRate: 0,
    multiBreath: 0,
    variableAmp: 0,
  };

  for (const { gi, duration } of results) {
    const w = duration / totalDuration;
    weighted.skew += gi.skew * w;
    weighted.spike += gi.spike * w;
    weighted.flatTop += gi.flatTop * w;
    weighted.topHeavy += gi.topHeavy * w;
    weighted.multiPeak += gi.multiPeak * w;
    weighted.noPause += gi.noPause * w;
    weighted.inspirRate += gi.inspirRate * w;
    weighted.multiBreath += gi.multiBreath * w;
    weighted.variableAmp += gi.variableAmp * w;
  }

  // Round to 2 decimal places
  weighted.skew = round2(weighted.skew);
  weighted.spike = round2(weighted.spike);
  weighted.flatTop = round2(weighted.flatTop);
  weighted.topHeavy = round2(weighted.topHeavy);
  weighted.multiPeak = round2(weighted.multiPeak);
  weighted.noPause = round2(weighted.noPause);
  weighted.inspirRate = round2(weighted.inspirRate);
  weighted.multiBreath = round2(weighted.multiBreath);
  weighted.variableAmp = round2(weighted.variableAmp);

  // Overall = sum of all 9 components (matches original Glasgow Index methodology)
  weighted.overall = round2(
    weighted.skew +
      weighted.flatTop +
      weighted.spike +
      weighted.topHeavy +
      weighted.multiPeak +
      weighted.noPause +
      weighted.inspirRate +
      weighted.multiBreath +
      weighted.variableAmp
  );

  return weighted;
}

// ============================================================
// Step 1: Find expiration minimums (peak negative flow)
// Port of findMins() from FlowLimits.js
// ============================================================
function findMins(flowData: Float32Array): Uint8Array {
  const len = flowData.length;
  const isMin = new Uint8Array(len); // 0 = not min, 1 = min

  for (let ptr = MIN_WINDOW; ptr < len - MIN_WINDOW; ptr++) {
    let minDetected = true;
    const val = flowData[ptr];

    for (let winPtr = ptr - MIN_WINDOW; winPtr < ptr + MIN_WINDOW - 1; winPtr++) {
      if (flowData[winPtr]! < val!) {
        minDetected = false;
        break;
      }
    }

    if (minDetected && val! < GREY_ZONE_LOWER) {
      isMin[ptr] = 1;
    }
  }

  return isMin;
}

// ============================================================
// Step 2: Find inspirations and compute per-breath characteristics
// Port of findInspirations() from FlowLimits.js
// ============================================================
function findInspirations(flowData: Float32Array): Inspiration[] {
  const len = flowData.length;
  const inspirations: Inspiration[] = [];
  let ignoreUntil = 0;

  for (let i = 0; i < len - 1; i++) {
    if (i < ignoreUntil) continue;
    if (flowData[i]! <= GREY_ZONE_UPPER) continue;
    if (i === 0 || i === len - 1) continue;

    // Check if this is a local maximum
    if (flowData[i - 1]! > flowData[i]! || flowData[i]! < flowData[i + 1]!) continue;

    const insp: Partial<Inspiration> = {
      maxValue: flowData[i]!,
      multiPeak: false,
      preRest: 0,
      noExhale: false,
      linkedMinAt: -1,
      ampVar: 0,
      inspirPerMin: 0,
    };

    // Look backwards for start (where flow crosses grey zone)
    let foundStart = false;
    for (let downPtr = i; downPtr > 0; downPtr--) {
      if (flowData[downPtr]! > flowData[i]!) break;
      if (flowData[downPtr]! <= GREY_ZONE_UPPER) {
        insp.start = downPtr;
        foundStart = true;
        break;
      }
    }
    if (!foundStart) continue;

    // Look forwards for end
    let foundEnd = false;
    for (let upPtr = i; upPtr < len - 1; upPtr++) {
      if (flowData[upPtr]! > flowData[i]!) break;
      if (flowData[upPtr]! <= GREY_ZONE_UPPER) {
        insp.end = upPtr;
        foundEnd = true;
        break;
      }
    }
    if (!foundEnd) continue;

    // Minimum inspiration length: 8 samples (~0.32s)
    if (insp.end! - insp.start! < 8) continue;

    insp.midPoint = insp.start! + Math.round((insp.end! - insp.start!) / 2);

    // Compute skew (left/right volume distribution)
    let leftVol = 0;
    let rightVol = 0;
    let top90Count = 0;
    const threshold90 = insp.maxValue! * TOP_THRESHOLD_PERCENT_90;

    // Multi-peak detection
    let firstPeakFound = false;
    let lookingForNextPeak = false;
    let lastMax = 0;
    let lowestPostFirstPeak = 0;

    for (let ptr = insp.start!; ptr < insp.end!; ptr++) {
      const val = flowData[ptr]!;

      if (ptr < insp.midPoint!) {
        leftVol += val;
      } else if (ptr > insp.midPoint!) {
        rightVol += val;
      }

      if (val > threshold90) {
        top90Count++;
      }

      // Multi-peak state machine
      if (!firstPeakFound) {
        if (val > lastMax) {
          lastMax = val;
        } else if (val < lastMax) {
          firstPeakFound = true;
        }
      } else if (!lookingForNextPeak && lastMax - val > MIN_PEAK_BUMP) {
        lookingForNextPeak = true;
        lowestPostFirstPeak = val;
      }
      if (lookingForNextPeak && !insp.multiPeak) {
        if (val < lowestPostFirstPeak) {
          lowestPostFirstPeak = val;
        } else if (val > lowestPostFirstPeak + MIN_PEAK_BUMP) {
          insp.multiPeak = true;
        }
      }
    }

    const inspLen = insp.end! - insp.start!;

    if (inspLen > 12) {
      // Only compute skew/topHeavy for inspirations > 0.5s
      const totalVol = leftVol + rightVol;
      insp.leftPercent = totalVol > 0 ? Math.round((10000 * leftVol) / totalVol) / 100 : 50;
      insp.top90Percent = Math.round((10000 * top90Count) / inspLen) / 100;
    } else {
      insp.leftPercent = 50;
      insp.top90Percent = 32;
    }

    // Compute mid-50% variance (flat top detection)
    const varStart = Math.round(insp.midPoint! - 0.25 * inspLen);
    const varEnd = Math.round(insp.midPoint! + 0.25 * inspLen);
    const midLen = 0.5 * inspLen;

    let midSum = 0;
    for (let ptr = varStart; ptr < varEnd; ptr++) {
      midSum += flowData[ptr]!;
    }
    const midMean = midLen > 0 ? midSum / midLen : 0;

    let midVariance = 0;
    for (let ptr = varStart; ptr < varEnd; ptr++) {
      midVariance += (midMean - flowData[ptr]!) ** 2;
    }
    insp.midVar = midLen > 0 ? Math.round((100 * midVariance) / midLen) / 100 : 0;

    inspirations.push(insp as Inspiration);
    ignoreUntil = insp.end!;
  }

  return inspirations;
}

// ============================================================
// Step 3: Match expirations to inspirations
// Port of calcCycleBasedIndicators() from FlowLimits.js
// ============================================================
function calcCycleBasedIndicators(
  flowData: Float32Array,
  isMin: Uint8Array,
  inspirations: Inspiration[]
): void {
  // Collect min indices
  const minsAtIndex: number[] = [];
  for (let i = 0; i < flowData.length; i++) {
    if (isMin[i] === 1) minsAtIndex.push(i);
  }

  let nextInspirIdx = 0;

  for (let i = 0; i < minsAtIndex.length - 1; i++) {
    const indexOfMin = minsAtIndex[i];

    if (nextInspirIdx >= inspirations.length) break;

    let safetyCounter = 10;
    while (nextInspirIdx < inspirations.length && safetyCounter-- > 0) {
      const insp = inspirations[nextInspirIdx]!;

      if (insp.start < indexOfMin!) {
        // Inspiration before this min — orphaned (multi-breath)
        insp.noExhale = true;
        nextInspirIdx++;
      } else if (i < minsAtIndex.length - 1 && insp.start > minsAtIndex[i + 1]!) {
        // Inspiration after next min — skip to next min
        break;
      } else if (insp.start > indexOfMin!) {
        // Link this expiration to inspiration
        insp.noExhale = false;
        insp.linkedMinAt = indexOfMin!;

        // Compute pre-rest (pause between expiration and inspiration)
        if (indexOfMin! + EXTRAPOLATION_SAMPLES < flowData.length) {
          const minValue = flowData[indexOfMin!]!;
          const minValuePlusOneSec = flowData[indexOfMin! + EXTRAPOLATION_SAMPLES]!;

          if (minValuePlusOneSec < 0) {
            // Extrapolate where expiration would cross zero
            const intersection =
              indexOfMin! +
              Math.round((EXTRAPOLATION_SAMPLES * minValue) / (minValue - minValuePlusOneSec));
            insp.preRest = insp.start - intersection;
          } else {
            // Too fast — default
            insp.preRest = -10;
          }
        } else {
          insp.preRest = -10;
        }

        nextInspirIdx++;
        break;
      } else {
        break;
      }
    }
  }
}

// ============================================================
// Step 4: Calculate amplitude variance
// Port of inspirationAmplitude() from FlowLimits.js
// ============================================================
function inspirationAmplitude(inspirations: Inspiration[]): void {
  for (let i = AMP_WINDOW_LEN; i < inspirations.length; i++) {
    // Mean amplitude over window
    let ampMean = 0;
    for (let cnt = 0; cnt < AMP_WINDOW_LEN; cnt++) {
      ampMean += inspirations[i - cnt]!.maxValue;
    }
    ampMean /= AMP_WINDOW_LEN;

    // Variance of amplitude
    let ampVar = 0;
    for (let cnt = 0; cnt < AMP_WINDOW_LEN; cnt++) {
      ampVar += (inspirations[i - cnt]!.maxValue - ampMean) ** 2;
    }
    ampVar = Math.round((100 * ampVar) / AMP_WINDOW_LEN) / 100;
    inspirations[i]!.ampVar = ampVar;

    // Inspiration rate (breaths per minute)
    const samplesForBreaths = inspirations[i]!.start - inspirations[i - AMP_WINDOW_LEN]!.start;
    if (samplesForBreaths > 0) {
      inspirations[i]!.inspirPerMin = Math.round(
        (AMP_WINDOW_LEN * 60 * 1000) / (samplesForBreaths * MILLIS_PER_SAMPLE)
      );
    }
  }
}

// ============================================================
// Step 5: Score each inspiration → cumulative index
// Port of prepIndices() from FlowLimits.js
// ============================================================
function prepIndices(inspirations: Inspiration[]): GlasgowComponents {
  let skewCount = 0;
  let topHeavyCount = 0;
  let flatTopCount = 0;
  let spikeCount = 0;
  let multiPeakCount = 0;
  let noPauseCount = 0;
  let inspirRateCount = 0;
  let multiBreathCount = 0;
  let ampVarCount = 0;

  const total = inspirations.length;

  for (const insp of inspirations) {
    // Skew: asymmetric inspiration (>55% or <45% left volume)
    if (insp.leftPercent < 45 || insp.leftPercent > 55) {
      skewCount++;
    }

    // Top Heavy: >40% of time above 90% of max
    if (insp.top90Percent > 40) {
      topHeavyCount++;
    }

    // Flat Top: low variance in middle 50%
    if (insp.midVar < 0.75) {
      flatTopCount++;
    }

    // Spike: <20% of time above 90% of max
    if (insp.top90Percent < 20) {
      spikeCount++;
    }

    // Multi Peak
    if (insp.multiPeak) {
      multiPeakCount++;
    }

    // No Pause: preRest < 10 samples (only count linked breaths)
    if (insp.preRest !== 0 && insp.preRest < 10) {
      noPauseCount++;
    }

    // Inspir Rate: >20/min
    if (insp.inspirPerMin > 20) {
      inspirRateCount++;
    }

    // Multi Breath (no exhale between inspirations)
    if (insp.noExhale) {
      multiBreathCount++;
    }

    // Variable Amplitude: ampVar > 4
    if (insp.ampVar > 4) {
      ampVarCount++;
    }
  }

  const skew = round2(skewCount / total);
  const topHeavy = round2(topHeavyCount / total);
  const flatTop = round2(flatTopCount / total);
  const spike = round2(spikeCount / total);
  const multiPeak = round2(multiPeakCount / total);
  const noPause = round2(noPauseCount / total);
  const inspirRate = round2(inspirRateCount / total);
  const multiBreath = round2(multiBreathCount / total);
  const variableAmp = round2(ampVarCount / total);

  // Overall = sum of all 9 components (matches original Glasgow Index methodology)
  const overall = round2(
    skew + flatTop + spike + topHeavy + multiPeak + noPause + inspirRate + multiBreath + variableAmp
  );

  return {
    overall,
    skew,
    spike,
    flatTop,
    topHeavy,
    multiPeak,
    noPause,
    inspirRate,
    multiBreath,
    variableAmp,
  };
}

// --- Helpers ---
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyComponents(): GlasgowComponents {
  return {
    overall: 0,
    skew: 0,
    spike: 0,
    flatTop: 0,
    topHeavy: 0,
    multiPeak: 0,
    noPause: 0,
    inspirRate: 0,
    multiBreath: 0,
    variableAmp: 0,
  };
}
