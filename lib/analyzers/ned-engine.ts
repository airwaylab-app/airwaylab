// ============================================================
// AirwayLab — NED (Negative Effort Dependence) Engine
// Breath segmentation, NED, FI, Tpeak/Ti, M-shape, RERA detection
// ============================================================

import type { Breath, RERACandidate, NEDResults } from '../types';

/**
 * Run the complete NED analysis on flow data.
 */
export function computeNED(flowData: Float32Array, samplingRate: number): NEDResults {
  const breaths = detectBreaths(flowData, samplingRate);

  if (breaths.length === 0) {
    return emptyNEDResults();
  }

  // Compute per-breath metrics
  for (const breath of breaths) {
    computeBreathMetrics(breath, samplingRate);
  }

  // Detect RERA sequences
  const reras = detectRERASequences(breaths, samplingRate);

  // Compute Respiratory Disruption Index
  const eai = computeEAI(breaths, samplingRate);

  // Compute night summary
  return summarize(breaths, reras, flowData.length / samplingRate, eai);
}

// ============================================================
// Breath detection using zero-crossing
// ============================================================
function detectBreaths(flowData: Float32Array, samplingRate: number): Breath[] {
  const breaths: Breath[] = [];
  const minInspSamples = 10; // minimum inspiration length
  const minQPeak = 0.1; // minimum peak flow (L/min)

  let i = 0;
  const len = flowData.length;

  while (i < len - 1) {
    // Find inspiration start: positive-going zero crossing
    while (i < len - 1 && !(flowData[i] <= 0 && flowData[i + 1] > 0)) i++;
    if (i >= len - 1) break;
    const inspStart = i + 1;
    i = inspStart;

    // Find inspiration end: negative-going zero crossing
    while (i < len - 1 && flowData[i] > 0) i++;
    if (i >= len - 1) break;
    const inspEnd = i;

    // Minimum inspiration length check
    if (inspEnd - inspStart < minInspSamples) continue;

    // Find expiration end: next positive-going zero crossing
    const expStart = inspEnd;
    let expEnd = expStart;
    while (expEnd < len - 1 && flowData[expEnd] <= 0) expEnd++;
    if (expEnd >= len - 1) break;

    // Extract inspiratory flow segment
    const inspFlow = flowData.subarray(inspStart, inspEnd);

    // Find peak flow
    let qPeak = 0;
    for (let j = 0; j < inspFlow.length; j++) {
      if (inspFlow[j] > qPeak) qPeak = inspFlow[j];
    }

    if (qPeak < minQPeak) continue;

    // Flow at 50% of Ti
    const midIdx = Math.floor(inspFlow.length / 2);
    const qMid = inspFlow[midIdx];

    // Time to peak
    let peakIdx = 0;
    for (let j = 1; j < inspFlow.length; j++) {
      if (inspFlow[j] > inspFlow[peakIdx]) peakIdx = j;
    }

    const ti = inspFlow.length / samplingRate;
    const tPeakTi = ti > 0 ? (peakIdx / samplingRate) / ti : 0;

    breaths.push({
      inspStart,
      inspEnd,
      expStart,
      expEnd,
      inspFlow,
      qPeak,
      qMid,
      ti,
      tPeakTi,
      ned: 0,
      fi: 0,
      isMShape: false,
      isEarlyPeakFL: false,
    });
  }

  return breaths;
}

// ============================================================
// Per-breath metric computation
// ============================================================
function computeBreathMetrics(breath: Breath, _samplingRate: number): void {
  const { inspFlow, qPeak, qMid, tPeakTi } = breath;

  // NED = (Qpeak - Qmid) / Qpeak × 100
  breath.ned = qPeak > 0 ? ((qPeak - qMid) / qPeak) * 100 : 0;

  // Flatness Index = mean_insp / peak_insp
  let sum = 0;
  for (let i = 0; i < inspFlow.length; i++) {
    sum += inspFlow[i];
  }
  const meanFlow = inspFlow.length > 0 ? sum / inspFlow.length : 0;
  breath.fi = qPeak > 0 ? meanFlow / qPeak : 0;

  // M-shape detection: valley < 80% Qpeak between 25-75% Ti
  breath.isMShape = detectMShape(inspFlow, qPeak);

  // Early peak FL: Tpeak/Ti > 0.45
  breath.isEarlyPeakFL = tPeakTi > 0.45;
}

// ============================================================
// M-shape detection
// Bi-modal inspiration with valley < 80% of Qpeak in middle 50%
// ============================================================
function detectMShape(inspFlow: Float32Array, qPeak: number): boolean {
  const len = inspFlow.length;
  if (len < 12) return false;

  const start25 = Math.floor(len * 0.25);
  const end75 = Math.floor(len * 0.75);
  const threshold = qPeak * 0.8;

  // Look for a valley below threshold in the middle 50%
  let hasValley = false;
  let minInMiddle = qPeak;
  for (let i = start25; i < end75; i++) {
    if (inspFlow[i] < minInMiddle) minInMiddle = inspFlow[i];
  }

  if (minInMiddle < threshold) {
    // Verify there are peaks on both sides of the valley
    let valleyIdx = start25;
    for (let i = start25; i < end75; i++) {
      if (inspFlow[i] === minInMiddle) {
        valleyIdx = i;
        break;
      }
    }

    let leftPeak = 0;
    for (let i = 0; i < valleyIdx; i++) {
      if (inspFlow[i] > leftPeak) leftPeak = inspFlow[i];
    }

    let rightPeak = 0;
    for (let i = valleyIdx; i < len; i++) {
      if (inspFlow[i] > rightPeak) rightPeak = inspFlow[i];
    }

    // Both sides must have peaks above the threshold
    hasValley = leftPeak > threshold && rightPeak > threshold;
  }

  return hasValley;
}

// ============================================================
// RERA Sequence Detection
// Finds runs of 3-15 breaths with flow limitation features
// ============================================================
function detectRERASequences(
  breaths: Breath[],
  samplingRate: number
): RERACandidate[] {
  const reras: RERACandidate[] = [];
  const minRunLength = 3;
  const maxRunLength = 15;

  let runStart = -1;

  for (let i = 0; i < breaths.length; i++) {
    const isFL = breaths[i].ned > 20 || breaths[i].tPeakTi > 0.40;

    if (isFL) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart >= 0) {
        const runLen = i - runStart;
        if (runLen >= minRunLength && runLen <= maxRunLength) {
          const candidate = evaluateRERACandidate(breaths, runStart, i, samplingRate);
          if (candidate) reras.push(candidate);
        }
        runStart = -1;
      }
    }
  }

  // Handle run extending to end
  if (runStart >= 0) {
    const runLen = breaths.length - runStart;
    if (runLen >= minRunLength && runLen <= maxRunLength) {
      const candidate = evaluateRERACandidate(breaths, runStart, breaths.length, samplingRate);
      if (candidate) reras.push(candidate);
    }
  }

  return reras;
}

function evaluateRERACandidate(
  breaths: Breath[],
  start: number,
  end: number,
  _samplingRate: number
): RERACandidate | null {
  const seqBreaths = breaths.slice(start, end);
  const breathCount = seqBreaths.length;

  // Compute NED slope across sequence (linear regression on NED)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < breathCount; i++) {
    sumX += i;
    sumY += seqBreaths[i].ned;
    sumXY += i * seqBreaths[i].ned;
    sumXX += i * i;
  }
  const nedSlope =
    breathCount > 1
      ? (breathCount * sumXY - sumX * sumY) / (breathCount * sumXX - sumX * sumX)
      : 0;

  // Check recovery: next breath NED < 10%
  const hasRecovery = end < breaths.length && breaths[end].ned < 10;

  // Check sigh: post-sequence Qpeak > 1.5× sequence mean Qpeak
  let meanQPeak = 0;
  for (const b of seqBreaths) meanQPeak += b.qPeak;
  meanQPeak /= breathCount;

  const hasSigh = end < breaths.length && breaths[end].qPeak > 1.5 * meanQPeak;

  // Max NED in sequence
  let maxNED = 0;
  for (const b of seqBreaths) {
    if (b.ned > maxNED) maxNED = b.ned;
  }

  // RERA candidate criteria:
  // slope > 0.5 OR (recovery + sigh) OR sustained NED > 34%
  const isRERA = nedSlope > 0.5 || (hasRecovery && hasSigh) || maxNED > 34;

  if (!isRERA) return null;

  return {
    startBreathIdx: start,
    endBreathIdx: end - 1,
    breathCount,
    nedSlope,
    hasRecovery,
    hasSigh,
    maxNED,
  };
}

// ============================================================
// Respiratory Disruption Index (RDI-est)
// Estimates respiratory disruptions from flow data only.
// Requires preceding flow limitation (NED >= 20% or FI >= 0.85)
// followed by a spike in BOTH respiratory rate AND tidal volume,
// consistent with a recovery breath after flow-limited breathing.
//
// This is NOT equivalent to PSG arousal index (which requires EEG).
// Respiratory-only methods typically detect 2-3x more events than
// EEG-confirmed arousals (Mansour et al. 2019, Jordan et al. 2011).
// ============================================================
function computeEAI(breaths: Breath[], samplingRate: number): number {
  if (breaths.length < 10) return 0;

  // Compute per-breath respiratory rate, tidal volume, and FL status
  const breathData: { time: number; rate: number; volume: number; isFL: boolean }[] = [];

  for (let i = 1; i < breaths.length; i++) {
    const prev = breaths[i - 1];
    const curr = breaths[i];

    // Breath period = time from one insp start to next
    const period = (curr.inspStart - prev.inspStart) / samplingRate;
    if (period <= 0 || period > 30) continue; // skip invalid

    const rate = 60 / period; // breaths per minute

    // Tidal volume = integral of inspiratory flow
    let volume = 0;
    for (let j = 0; j < curr.inspFlow.length; j++) {
      volume += curr.inspFlow[j] / samplingRate;
    }

    // Flow limitation: NED >= 20% or FI >= 0.85
    const isFL = curr.ned >= 20 || curr.fi >= 0.85;

    breathData.push({
      time: curr.inspStart / samplingRate,
      rate,
      volume,
      isFL,
    });
  }

  if (breathData.length < 10) return 0;

  const BASELINE_WINDOW = 120; // seconds
  const RATE_THRESHOLD = 0.25; // 25% rate increase
  const VOLUME_THRESHOLD = 0.40; // 40% volume increase
  const REFRACTORY = 30; // seconds between events
  const MIN_FL_PRECEDING = 2; // minimum flow-limited breaths before spike

  let arousalCount = 0;
  let lastArousalTime = -Infinity;

  for (let i = 0; i < breathData.length; i++) {
    const current = breathData[i];

    // Check for preceding flow limitation: >= MIN_FL_PRECEDING of
    // the last 5 breaths must be flow-limited
    let flCount = 0;
    for (let k = Math.max(0, i - 5); k < i; k++) {
      if (breathData[k].isFL) flCount++;
    }
    if (flCount < MIN_FL_PRECEDING) continue;

    // Compute rolling baseline from preceding window
    let rateSum = 0, volSum = 0, count = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (current.time - breathData[j].time > BASELINE_WINDOW) break;
      rateSum += breathData[j].rate;
      volSum += breathData[j].volume;
      count++;
    }

    if (count < 5) continue; // need minimum baseline

    const baseRate = rateSum / count;
    const baseVol = volSum / count;

    const rateSpike = baseRate > 0 && (current.rate - baseRate) / baseRate > RATE_THRESHOLD;
    const volSpike = baseVol > 0 && (current.volume - baseVol) / baseVol > VOLUME_THRESHOLD;

    // Require BOTH rate AND volume spike (not OR)
    if (rateSpike && volSpike && current.time - lastArousalTime > REFRACTORY) {
      arousalCount++;
      lastArousalTime = current.time;
    }
  }

  const totalHours =
    (breathData[breathData.length - 1].time - breathData[0].time) / 3600;
  if (totalHours <= 0) return 0;

  return round2(arousalCount / totalHours);
}

// ============================================================
// Night summary
// ============================================================
function summarize(
  breaths: Breath[],
  reras: RERACandidate[],
  totalSeconds: number,
  estimatedArousalIndex: number
): NEDResults {
  const breathCount = breaths.length;
  if (breathCount === 0) return emptyNEDResults();

  const neds = breaths.map((b) => b.ned);
  const fis = breaths.map((b) => b.fi);

  // Sort NED for percentiles
  const sortedNED = [...neds].sort((a, b) => a - b);

  const nedMean = mean(neds);
  const nedMedian = sortedNED[Math.floor(sortedNED.length / 2)];
  const nedP95 = sortedNED[Math.floor(sortedNED.length * 0.95)];

  // Classification percentages
  let clearFL = 0;
  let borderline = 0;
  let fiFL85 = 0;
  let mShapeCount = 0;

  for (const b of breaths) {
    if (b.ned >= 34) clearFL++;
    else if (b.ned >= 10) borderline++;
    if (b.fi >= 0.85) fiFL85++;
    if (b.isMShape) mShapeCount++;
  }

  const nedClearFLPct = round2((clearFL / breathCount) * 100);
  const nedBorderlinePct = round2((borderline / breathCount) * 100);
  const fiMean = round2(mean(fis));
  const fiFL85Pct = round2((fiFL85 / breathCount) * 100);
  const tpeakMean = round2(mean(breaths.map((b) => b.tPeakTi)));
  const mShapePct = round2((mShapeCount / breathCount) * 100);

  // RERA index (per hour)
  const totalHours = totalSeconds / 3600;
  const reraCount = reras.length;
  const reraIndex = totalHours > 0 ? round2(reraCount / totalHours) : 0;

  // H1/H2 split (first half vs second half of breaths)
  const halfIdx = Math.floor(breathCount / 2);
  const h1Breaths = breaths.slice(0, halfIdx);
  const h2Breaths = breaths.slice(halfIdx);

  const h1NedMean = round2(mean(h1Breaths.map((b) => b.ned)));
  const h2NedMean = round2(mean(h2Breaths.map((b) => b.ned)));

  // Combined FL: NED ≥ 34% OR FI ≥ 0.85
  let combinedFL = 0;
  for (const b of breaths) {
    if (b.ned >= 34 || b.fi >= 0.85) combinedFL++;
  }
  const combinedFLPct = round2((combinedFL / breathCount) * 100);

  return {
    breathCount,
    nedMean: round2(nedMean),
    nedMedian: round2(nedMedian),
    nedP95: round2(nedP95),
    nedClearFLPct,
    nedBorderlinePct,
    fiMean,
    fiFL85Pct,
    tpeakMean,
    mShapePct,
    reraIndex,
    reraCount,
    h1NedMean,
    h2NedMean,
    combinedFLPct,
    estimatedArousalIndex,
  };
}

// --- Helpers ---
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyNEDResults(): NEDResults {
  return {
    breathCount: 0,
    nedMean: 0,
    nedMedian: 0,
    nedP95: 0,
    nedClearFLPct: 0,
    nedBorderlinePct: 0,
    fiMean: 0,
    fiFL85Pct: 0,
    tpeakMean: 0,
    mShapePct: 0,
    reraIndex: 0,
    reraCount: 0,
    h1NedMean: 0,
    h2NedMean: 0,
    combinedFLPct: 0,
    estimatedArousalIndex: 0,
  };
}
