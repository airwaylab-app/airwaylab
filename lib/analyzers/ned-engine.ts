// ============================================================
// AirwayLab — NED (Negative Effort Dependence) Engine
// Breath segmentation, NED, FI, Tpeak/Ti, M-shape, RERA detection
// Hypopnea & amplitude stability detection (v0.7.0+)
// ============================================================

import type { Breath, RERACandidate, NEDResults, MachineHypopneaSummary } from '../types';

// ============================================================
// Internal types for hypopnea detection (not exported/persisted)
// ============================================================
interface HypopneaEvent {
  startBreathIdx: number;
  endBreathIdx: number;
  nBreaths: number;
  durationS: number;
  timestampS: number;
  baselineQpeak: number;
  nadirQpeak: number;
  dropPct: number;
  maxNedDuring: number;
  nedVisible: boolean;
  half: 'H1' | 'H2';
}

interface HypopneaDetectionResult {
  hypopneas: HypopneaEvent[];
  briefObstructions: number;
  briefObstructionH1: number;
  briefObstructionH2: number;
}

interface AmplitudeStabilityResult {
  cvOverall: number;
  cvMedianEpoch: number;
  unstableEpochPct: number;
}

/**
 * Run the complete NED analysis on flow data.
 * Optionally accepts machine-reported hypopnea events from EVE.edf.
 * When machine events are present, they are used for hypopnea count
 * (machine-preferred). When absent, amplitude-based detection is used.
 */
export function computeNED(
  flowData: Float32Array,
  samplingRate: number,
  machineHypopneaEvents?: MachineHypopneaSummary[]
): NEDResults {
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

  const totalSeconds = flowData.length / samplingRate;

  // Hypopnea & amplitude stability detection (v0.7.0+)
  const amplitudeDetection = detectHypopneas(breaths, samplingRate);
  const stability = computeAmplitudeStability(breaths, samplingRate, totalSeconds);

  // Resolve hypopnea source: machine-preferred, algorithm-fallback
  const machineEvents = machineHypopneaEvents ?? [];
  const useMachine = machineEvents.length > 0;

  let hypopneaMetrics: {
    count: number;
    index: number;
    source: 'machine' | 'algorithm';
    nedInvisibleCount: number;
    nedInvisiblePct: number;
    meanDropPct: number;
    meanDurationS: number;
    h1Index: number;
    h2Index: number;
  };

  const totalHours = totalSeconds / 3600;

  if (useMachine) {
    // Machine path: use device-reported count
    const machineNedCheck = checkNedVisibilityForMachineEvents(machineEvents, breaths, samplingRate);
    const midTimeSec = totalSeconds / 2;
    let h1Count = 0;
    let h2Count = 0;
    for (const e of machineEvents) {
      if (e.onsetSec < midTimeSec) h1Count++;
      else h2Count++;
    }
    const halfHours = totalHours / 2;

    hypopneaMetrics = {
      count: machineEvents.length,
      index: totalHours > 0 ? round2(machineEvents.length / totalHours) : 0,
      source: 'machine',
      nedInvisibleCount: machineNedCheck.nedInvisibleCount,
      nedInvisiblePct: machineEvents.length > 0
        ? round2((machineNedCheck.nedInvisibleCount / machineEvents.length) * 100)
        : 0,
      meanDropPct: 0, // not available on machine path
      meanDurationS: 0, // not available on machine path
      h1Index: halfHours > 0 ? round2(h1Count / halfHours) : 0,
      h2Index: halfHours > 0 ? round2(h2Count / halfHours) : 0,
    };
  } else {
    // Algorithm path: use amplitude-based detection
    const events = amplitudeDetection.hypopneas;
    const nedInvisible = events.filter((e) => !e.nedVisible).length;

    const halfHours = totalHours / 2;
    const h1Events = events.filter((e) => e.half === 'H1').length;
    const h2Events = events.filter((e) => e.half === 'H2').length;

    hypopneaMetrics = {
      count: events.length,
      index: totalHours > 0 ? round2(events.length / totalHours) : 0,
      source: 'algorithm',
      nedInvisibleCount: nedInvisible,
      nedInvisiblePct: events.length > 0 ? round2((nedInvisible / events.length) * 100) : 0,
      meanDropPct: events.length > 0
        ? round2(mean(events.map((e) => e.dropPct)))
        : 0,
      meanDurationS: events.length > 0
        ? round2(mean(events.map((e) => e.durationS)))
        : 0,
      h1Index: halfHours > 0 ? round2(h1Events / halfHours) : 0,
      h2Index: halfHours > 0 ? round2(h2Events / halfHours) : 0,
    };
  }

  // Brief obstructions: always algorithm-detected
  const halfHours = totalHours / 2;
  const briefMetrics = {
    count: amplitudeDetection.briefObstructions,
    index: totalHours > 0 ? round2(amplitudeDetection.briefObstructions / totalHours) : 0,
    h1Index: halfHours > 0 ? round2(amplitudeDetection.briefObstructionH1 / halfHours) : 0,
    h2Index: halfHours > 0 ? round2(amplitudeDetection.briefObstructionH2 / halfHours) : 0,
  };

  // Compute night summary with new metrics
  return summarize(breaths, reras, totalSeconds, eai, hypopneaMetrics, briefMetrics, stability);
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
    return leftPeak > threshold && rightPeak > threshold;
  }

  return false;
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
// Hypopnea & Brief Obstruction Detection (v0.7.0)
// Detects amplitude-drop events that NED shape analysis misses.
// ============================================================

const BASELINE_WINDOW_BREATHS = 30;
const DROP_THRESHOLD = 0.30; // 30% drop from baseline
const BRIEF_DROP_THRESHOLD = 0.40; // 40% drop for brief obstructions
const MIN_HYPOPNEA_DURATION_S = 10;
const COOLDOWN_BREATHS = 5;

function detectHypopneas(
  breaths: Breath[],
  samplingRate: number
): HypopneaDetectionResult {
  const empty: HypopneaDetectionResult = {
    hypopneas: [],
    briefObstructions: 0,
    briefObstructionH1: 0,
    briefObstructionH2: 0,
  };

  if (breaths.length < BASELINE_WINDOW_BREATHS + 5) return empty;

  const qPeaks = breaths.map((b) => b.qPeak);
  const totalSeconds =
    (breaths[breaths.length - 1].inspStart - breaths[0].inspStart) / samplingRate;
  const midTimeSec = totalSeconds / 2 + breaths[0].inspStart / samplingRate;

  const hypopneas: HypopneaEvent[] = [];
  let briefObstructions = 0;
  let briefObstructionH1 = 0;
  let briefObstructionH2 = 0;

  let i = BASELINE_WINDOW_BREATHS;

  while (i < breaths.length) {
    // Rolling baseline: median of previous N breaths (robust to outliers)
    const baselineStart = Math.max(0, i - BASELINE_WINDOW_BREATHS);
    const baselineSlice = qPeaks.slice(baselineStart, i);
    const baseline = median(baselineSlice);

    if (baseline < 0.1) {
      i++;
      continue;
    }

    const threshold = baseline * (1 - DROP_THRESHOLD);

    if (qPeaks[i] < threshold) {
      // Start of potential event
      const eventStart = i;
      let j = i + 1;

      while (j < breaths.length && qPeaks[j] < threshold) {
        j++;
      }

      const eventEnd = j - 1;
      const eventBreaths = breaths.slice(eventStart, eventEnd + 1);

      const durationS =
        (eventBreaths[eventBreaths.length - 1].inspStart - eventBreaths[0].inspStart) / samplingRate;

      // Mean drop from baseline
      let qPeakSum = 0;
      let nadirQpeak = Infinity;
      for (const b of eventBreaths) {
        qPeakSum += b.qPeak;
        if (b.qPeak < nadirQpeak) nadirQpeak = b.qPeak;
      }
      const meanEventQpeak = qPeakSum / eventBreaths.length;
      const meanDrop = ((baseline - meanEventQpeak) / baseline) * 100;

      // Max NED during event
      let maxNedDuring = 0;
      for (const b of eventBreaths) {
        if (b.ned > maxNedDuring) maxNedDuring = b.ned;
      }
      const nedVisible = maxNedDuring >= 34;

      const timestampS = eventBreaths[0].inspStart / samplingRate;
      const half: 'H1' | 'H2' = timestampS < midTimeSec ? 'H1' : 'H2';

      if (durationS >= MIN_HYPOPNEA_DURATION_S) {
        hypopneas.push({
          startBreathIdx: eventStart,
          endBreathIdx: eventEnd,
          nBreaths: eventBreaths.length,
          durationS: round2(durationS),
          timestampS: round2(timestampS),
          baselineQpeak: round2(baseline),
          nadirQpeak: round2(nadirQpeak),
          dropPct: round2(meanDrop),
          maxNedDuring: round2(maxNedDuring),
          nedVisible,
          half,
        });
      } else if (eventBreaths.length <= 2 && meanDrop > BRIEF_DROP_THRESHOLD * 100) {
        briefObstructions++;
        if (half === 'H1') briefObstructionH1++;
        else briefObstructionH2++;
      }

      // Skip cooldown
      i = j + COOLDOWN_BREATHS;
    } else {
      i++;
    }
  }

  return { hypopneas, briefObstructions, briefObstructionH1, briefObstructionH2 };
}

// ============================================================
// NED-invisible check for machine-reported events
// Maps EVE.edf timestamps to breath indices and checks NED
// ============================================================

function checkNedVisibilityForMachineEvents(
  machineEvents: MachineHypopneaSummary[],
  breaths: Breath[],
  samplingRate: number
): { nedInvisibleCount: number } {
  let nedInvisibleCount = 0;

  for (const event of machineEvents) {
    const eventStartSec = event.onsetSec;
    const eventEndSec = event.onsetSec + event.durationSec;

    // Find breaths that fall within the event window
    let maxNed = 0;
    let matchedBreaths = 0;

    for (const b of breaths) {
      const breathTimeSec = b.inspStart / samplingRate;
      if (breathTimeSec >= eventStartSec && breathTimeSec <= eventEndSec) {
        matchedBreaths++;
        if (b.ned > maxNed) maxNed = b.ned;
      }
    }

    // If no breaths matched or max NED < 34%, this event is NED-invisible
    if (matchedBreaths === 0 || maxNed < 34) {
      nedInvisibleCount++;
    }
  }

  return { nedInvisibleCount };
}

// ============================================================
// Amplitude Stability (v0.7.0)
// Epoch-level flow amplitude variability
// ============================================================

function computeAmplitudeStability(
  breaths: Breath[],
  samplingRate: number,
  totalSeconds: number
): AmplitudeStabilityResult {
  const empty: AmplitudeStabilityResult = { cvOverall: 0, cvMedianEpoch: 0, unstableEpochPct: 0 };

  if (breaths.length < BASELINE_WINDOW_BREATHS + 5) return empty;

  const qPeaks = breaths.map((b) => b.qPeak);

  // Overall CV
  const overallMean = mean(qPeaks);
  const overallStd = std(qPeaks, overallMean);
  const cvOverall = overallMean > 0 ? round2((overallStd / overallMean) * 100) : 0;

  // Epoch-level CV (5-minute epochs)
  const EPOCH_S = 300;
  const MIN_BREATHS_PER_EPOCH = 5;
  const UNSTABLE_CV_THRESHOLD = 25;

  const nEpochs = Math.ceil(totalSeconds / EPOCH_S);
  const epochCvs: number[] = [];
  let unstableEpochs = 0;

  for (let ep = 0; ep < nEpochs; ep++) {
    const t0 = ep * EPOCH_S;
    const t1 = t0 + EPOCH_S;

    // Find breaths in this epoch by timestamp
    const epochQPeaks: number[] = [];
    for (const b of breaths) {
      const breathTimeSec = b.inspStart / samplingRate;
      if (breathTimeSec >= t0 && breathTimeSec < t1) {
        epochQPeaks.push(b.qPeak);
      }
    }

    if (epochQPeaks.length < MIN_BREATHS_PER_EPOCH) continue;

    const epMean = mean(epochQPeaks);
    const epStd = std(epochQPeaks, epMean);
    const epCv = epMean > 0 ? (epStd / epMean) * 100 : 0;

    epochCvs.push(epCv);

    if (epCv > UNSTABLE_CV_THRESHOLD) {
      unstableEpochs++;
    }
  }

  const cvMedianEpoch = epochCvs.length > 0 ? round2(median(epochCvs)) : 0;
  const unstableEpochPct = epochCvs.length > 0
    ? round2((unstableEpochs / epochCvs.length) * 100)
    : 0;

  return { cvOverall, cvMedianEpoch, unstableEpochPct };
}

// ============================================================
// Night summary
// ============================================================
function summarize(
  breaths: Breath[],
  reras: RERACandidate[],
  totalSeconds: number,
  estimatedArousalIndex: number,
  hypopneaMetrics?: {
    count: number;
    index: number;
    source: 'machine' | 'algorithm';
    nedInvisibleCount: number;
    nedInvisiblePct: number;
    meanDropPct: number;
    meanDurationS: number;
    h1Index: number;
    h2Index: number;
  },
  briefMetrics?: {
    count: number;
    index: number;
    h1Index: number;
    h2Index: number;
  },
  stabilityMetrics?: AmplitudeStabilityResult
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

    // Hypopnea metrics (v0.7.0+)
    hypopneaCount: hypopneaMetrics?.count ?? 0,
    hypopneaIndex: hypopneaMetrics?.index ?? 0,
    hypopneaSource: hypopneaMetrics?.source ?? 'algorithm',
    hypopneaNedInvisibleCount: hypopneaMetrics?.nedInvisibleCount ?? 0,
    hypopneaNedInvisiblePct: hypopneaMetrics?.nedInvisiblePct ?? 0,
    hypopneaMeanDropPct: hypopneaMetrics?.meanDropPct ?? 0,
    hypopneaMeanDurationS: hypopneaMetrics?.meanDurationS ?? 0,
    hypopneaH1Index: hypopneaMetrics?.h1Index ?? 0,
    hypopneaH2Index: hypopneaMetrics?.h2Index ?? 0,

    // Brief obstruction metrics (v0.7.0+)
    briefObstructionCount: briefMetrics?.count ?? 0,
    briefObstructionIndex: briefMetrics?.index ?? 0,
    briefObstructionH1Index: briefMetrics?.h1Index ?? 0,
    briefObstructionH2Index: briefMetrics?.h2Index ?? 0,

    // Amplitude stability metrics (v0.7.0+)
    amplitudeCvOverall: stabilityMetrics?.cvOverall ?? 0,
    amplitudeCvMedianEpoch: stabilityMetrics?.cvMedianEpoch ?? 0,
    unstableEpochPct: stabilityMetrics?.unstableEpochPct ?? 0,
  };
}

// --- Helpers ---
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function std(arr: number[], avg?: number): number {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  let sumSq = 0;
  for (const v of arr) {
    const d = v - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / arr.length);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
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
    hypopneaCount: 0,
    hypopneaIndex: 0,
    hypopneaSource: 'algorithm',
    hypopneaNedInvisibleCount: 0,
    hypopneaNedInvisiblePct: 0,
    hypopneaMeanDropPct: 0,
    hypopneaMeanDurationS: 0,
    hypopneaH1Index: 0,
    hypopneaH2Index: 0,
    briefObstructionCount: 0,
    briefObstructionIndex: 0,
    briefObstructionH1Index: 0,
    briefObstructionH2Index: 0,
    amplitudeCvOverall: 0,
    amplitudeCvMedianEpoch: 0,
    unstableEpochPct: 0,
  };
}
