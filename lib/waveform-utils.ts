// ============================================================
// AirwayLab — Waveform Utility Functions
// Decimation, synthetic generation, and formatting helpers
// ============================================================

import type {
  FlowSample,
  WaveformPoint,
  PressurePoint,
  LeakPoint,
  WaveformEvent,
  WaveformStats,
  TidalVolumePoint,
  RespiratoryRatePoint,
  StoredWaveform,
} from './waveform-types';
import { ENGINE_VERSION } from './engine-version';

// ── Zoom-level → sample rate mapping ────────────────────────

/**
 * Determine the target sample rate based on visible duration.
 * Follows the spec's zoom-level mapping table.
 */
export function getTargetRate(visibleDurationSec: number, originalRate: number): number {
  if (visibleDurationSec <= 300) return originalRate;    // < 5 min → full rate (25 Hz)
  if (visibleDurationSec <= 1800) return 5;              // 5–30 min → 5 Hz
  if (visibleDurationSec <= 7200) return 2;              // 30 min–2h → 2 Hz
  return 1;                                               // > 2h → 1 Hz
}

// ── Decimation functions ────────────────────────────────────

/**
 * Decimate a Float32Array by taking every Nth sample.
 * Returns FlowSample[] with actual measured values.
 */
export function decimateFlow(
  data: Float32Array,
  sampleRate: number,
  targetRate: number
): FlowSample[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const step = Math.max(1, Math.round(sampleRate / targetRate));
  const count = Math.ceil(data.length / step);
  const result: FlowSample[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const idx = i * step;
    result[i] = {
      t: +(idx / sampleRate).toFixed(3),
      value: +data[idx].toFixed(2),
    };
  }

  return result;
}

/**
 * Decimate a time range of flow data.
 * More efficient than decimating the full array when zoomed in.
 */
export function decimateFlowRange(
  data: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number,
  targetRate: number
): FlowSample[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
  const endIdx = Math.min(data.length, Math.ceil(endSec * sampleRate));
  const step = Math.max(1, Math.round(sampleRate / targetRate));

  // Align startIdx to step boundary
  const alignedStart = Math.floor(startIdx / step) * step;
  const result: FlowSample[] = [];

  for (let idx = alignedStart; idx < endIdx; idx += step) {
    if (idx < 0) continue;
    result.push({
      t: +(idx / sampleRate).toFixed(3),
      value: +data[idx].toFixed(2),
    });
  }

  return result;
}

/**
 * Decimate pressure data by taking every Nth sample.
 */
export function decimatePressure(
  data: Float32Array,
  sampleRate: number,
  targetRate: number
): PressurePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const step = Math.max(1, Math.round(sampleRate / targetRate));
  const count = Math.ceil(data.length / step);
  const result: PressurePoint[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const idx = i * step;
    result[i] = {
      t: +(idx / sampleRate).toFixed(3),
      avg: +data[idx].toFixed(2),
    };
  }

  return result;
}

/**
 * Decimate a time range of pressure data.
 */
export function decimatePressureRange(
  data: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number,
  targetRate: number
): PressurePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
  const endIdx = Math.min(data.length, Math.ceil(endSec * sampleRate));
  const step = Math.max(1, Math.round(sampleRate / targetRate));
  const alignedStart = Math.floor(startIdx / step) * step;
  const result: PressurePoint[] = [];

  for (let idx = alignedStart; idx < endIdx; idx += step) {
    if (idx < 0) continue;
    result.push({
      t: +(idx / sampleRate).toFixed(3),
      avg: +data[idx].toFixed(2),
    });
  }

  return result;
}

// ── Time-based slicing ──────────────────────────────────────

/**
 * Slice an array of time-stamped points by time range using binary search.
 * Works with any type that has a `t` property.
 */
export function sliceByTime<T extends { t: number }>(
  data: T[],
  startSec: number,
  endSec: number
): T[] {
  if (data.length === 0) return [];

  // Binary search for start index
  let lo = 0;
  let hi = data.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (data[mid].t < startSec) lo = mid + 1;
    else hi = mid;
  }
  const startIdx = lo;

  // Binary search for end index
  hi = data.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (data[mid].t <= endSec) lo = mid + 1;
    else hi = mid;
  }
  const endIdx = lo;

  return data.slice(startIdx, endIdx);
}

// ── Stats computation ───────────────────────────────────────

/**
 * Compute flow summary statistics from decimated FlowSample[].
 */
export function computeFlowStats(
  flow: FlowSample[],
  pressure: PressurePoint[],
  leak: LeakPoint[] = []
): WaveformStats {
  if (flow.length === 0) {
    return { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null, leakMean: null, leakMax: null, leakP95: null };
  }

  let fMin = Infinity;
  let fMax = -Infinity;
  let fSum = 0;
  let zeroCrossings = 0;
  let prevSign = flow[0].value >= 0;

  for (const p of flow) {
    if (p.value < fMin) fMin = p.value;
    if (p.value > fMax) fMax = p.value;
    fSum += p.value;

    const sign = p.value >= 0;
    if (sign !== prevSign) zeroCrossings++;
    prevSign = sign;
  }

  const breathCount = Math.round(zeroCrossings / 2);

  let pMin: number | null = null;
  let pMax: number | null = null;
  if (pressure.length > 0) {
    pMin = Infinity;
    pMax = -Infinity;
    for (const p of pressure) {
      if (p.avg < pMin) pMin = p.avg;
      if (p.avg > pMax) pMax = p.avg;
    }
  }

  let leakMean: number | null = null;
  let leakMax: number | null = null;
  let leakP95: number | null = null;
  if (leak.length > 0) {
    let lSum = 0;
    let lMax = 0;
    for (const l of leak) {
      lSum += l.avg;
      if (l.max > lMax) lMax = l.max;
    }
    leakMean = +(lSum / leak.length).toFixed(1);
    leakMax = +lMax.toFixed(1);
    const sorted = leak.map((l) => l.avg).sort((a, b) => a - b);
    leakP95 = +sorted[Math.floor(sorted.length * 0.95)].toFixed(1);
  }

  return {
    breathCount,
    flowMin: +fMin.toFixed(2),
    flowMax: +fMax.toFixed(2),
    flowMean: +(fSum / flow.length).toFixed(2),
    pressureMin: pMin !== null ? +pMin.toFixed(1) : null,
    pressureMax: pMax !== null ? +pMax.toFixed(1) : null,
    leakMean,
    leakMax,
    leakP95,
  };
}

/**
 * Compute flow summary statistics directly from raw Float32Array.
 * Uses refractory period for breath counting to prevent ~60 br/min artifacts.
 */
export function computeFlowStatsFromRaw(
  flow: Float32Array,
  sampleRate: number,
  pressure: Float32Array | null,
  leak: LeakPoint[] = []
): WaveformStats {
  if (flow.length === 0) {
    return { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null, leakMean: null, leakMax: null, leakP95: null };
  }

  let fMin = Infinity;
  let fMax = -Infinity;
  let fSum = 0;
  let breathCount = 0;
  let prevPositive = flow[0] >= 0;
  const refractorySamples = Math.round(sampleRate * 1.5); // Min 1.5s between breaths
  let samplesSinceLastCrossing = refractorySamples; // Allow first crossing

  for (let i = 0; i < flow.length; i++) {
    const v = flow[i];
    if (v < fMin) fMin = v;
    if (v > fMax) fMax = v;
    fSum += v;

    const positive = v >= 0;
    samplesSinceLastCrossing++;

    // Count negative→positive crossings (start of inspiration) with refractory period
    if (!prevPositive && positive && samplesSinceLastCrossing >= refractorySamples) {
      breathCount++;
      samplesSinceLastCrossing = 0;
    }
    prevPositive = positive;
  }

  let pMin: number | null = null;
  let pMax: number | null = null;
  if (pressure && pressure.length > 0) {
    pMin = Infinity;
    pMax = -Infinity;
    for (let i = 0; i < pressure.length; i++) {
      if (pressure[i] < pMin) pMin = pressure[i];
      if (pressure[i] > pMax) pMax = pressure[i];
    }
  }

  let leakMean: number | null = null;
  let leakMax: number | null = null;
  let leakP95: number | null = null;
  if (leak.length > 0) {
    let lSum = 0;
    let lMax = 0;
    for (const l of leak) {
      lSum += l.avg;
      if (l.max > lMax) lMax = l.max;
    }
    leakMean = +(lSum / leak.length).toFixed(1);
    leakMax = +lMax.toFixed(1);
    const sorted = leak.map((l) => l.avg).sort((a, b) => a - b);
    leakP95 = +sorted[Math.floor(sorted.length * 0.95)].toFixed(1);
  }

  return {
    breathCount,
    flowMin: +fMin.toFixed(2),
    flowMax: +fMax.toFixed(2),
    flowMean: +(fSum / flow.length).toFixed(2),
    pressureMin: pMin !== null ? +pMin.toFixed(1) : null,
    pressureMax: pMax !== null ? +pMax.toFixed(1) : null,
    leakMean,
    leakMax,
    leakP95,
  };
}

// ── Tidal Volume & Respiratory Rate ─────────────────────────

/**
 * Compute estimated tidal volume from raw flow data.
 * Detects individual breaths via zero-crossings, integrates inspiratory
 * flow per breath, then maps per-breath TV onto the output time grid.
 */
export function computeTidalVolume(
  data: Float32Array,
  sampleRate: number,
  bucketSeconds = 2
): TidalVolumePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const dt = 1 / sampleRate;
  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);

  const bucketSum = new Float64Array(totalBuckets);
  const bucketCount = new Uint16Array(totalBuckets);

  const minBreathSamples = Math.round(sampleRate * 1.5);
  const maxBreathSamples = Math.round(sampleRate * 15);

  let breathStart = 0;
  let prevPositive = data[0] >= 0;

  for (let i = 1; i < data.length; i++) {
    const positive = data[i] >= 0;

    if (!prevPositive && positive) {
      const breathLen = i - breathStart;
      if (breathLen >= minBreathSamples && breathLen <= maxBreathSamples) {
        let positiveSum = 0;
        for (let j = breathStart; j < i; j++) {
          if (data[j] > 0) positiveSum += data[j];
        }

        const volumeML = positiveSum * dt * (1000 / 60);

        if (volumeML > 30) {
          const breathMid = (breathStart + i) / 2;
          const bucket = Math.min(
            Math.floor(breathMid / samplesPerBucket),
            totalBuckets - 1
          );
          bucketSum[bucket] += volumeML;
          bucketCount[bucket]++;
        }
      }
      breathStart = i;
    }
    prevPositive = positive;
  }

  const points: TidalVolumePoint[] = new Array(totalBuckets);
  for (let b = 0; b < totalBuckets; b++) {
    points[b] = {
      t: +((b * samplesPerBucket) / sampleRate).toFixed(1),
      avg: bucketCount[b] > 0 ? +(bucketSum[b] / bucketCount[b]).toFixed(0) : 0,
    };
  }

  for (let i = 0; i < points.length; i++) {
    if (points[i].avg === 0) {
      for (let d = 1; d < points.length; d++) {
        if (i - d >= 0 && points[i - d].avg > 0) {
          points[i].avg = points[i - d].avg;
          break;
        }
        if (i + d < points.length && points[i + d].avg > 0) {
          points[i].avg = points[i + d].avg;
          break;
        }
      }
    }
  }

  return points;
}

/**
 * Compute estimated respiratory rate from raw flow data.
 * Uses refractory period (1.5s) to prevent counting noise crossings.
 * Caps effective RR at ~40 br/min.
 */
export function computeRespiratoryRate(
  data: Float32Array,
  sampleRate: number,
  bucketSeconds = 2
): RespiratoryRatePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);
  const windowSamples = Math.round(sampleRate * 30);
  const refractorySamples = Math.round(sampleRate * 1.5); // Min 1.5s between breaths
  const points: RespiratoryRatePoint[] = [];

  for (let b = 0; b < totalBuckets; b++) {
    const center = b * samplesPerBucket + Math.round(samplesPerBucket / 2);
    const wStart = Math.max(0, center - Math.round(windowSamples / 2));
    const wEnd = Math.min(data.length, center + Math.round(windowSamples / 2));

    let crossings = 0;
    let prevPositive = data[wStart] >= 0;
    let samplesSinceLast = refractorySamples; // Allow first crossing

    for (let i = wStart + 1; i < wEnd; i++) {
      const positive = data[i] >= 0;
      samplesSinceLast++;

      // Count positive→negative crossings with refractory period
      if (prevPositive && !positive && samplesSinceLast >= refractorySamples) {
        crossings++;
        samplesSinceLast = 0;
      }
      prevPositive = positive;
    }

    const windowDurationSec = (wEnd - wStart) / sampleRate;
    const breathsPerMin = windowDurationSec > 0 ? (crossings / windowDurationSec) * 60 : 0;

    points.push({
      t: +(b * bucketSeconds).toFixed(1),
      avg: +breathsPerMin.toFixed(1),
    });
  }

  return points;
}

// ── Synthetic waveform generation ───────────────────────────

/**
 * Generate a synthetic StoredWaveform for demo mode.
 * Produces raw Float32Array data that can be decimated like real data.
 */
export function generateSyntheticWaveform(
  durationHours: number,
  breathCount: number,
  options: {
    flPct?: number;
    mShapePct?: number;
    reraCount?: number;
    epap?: number;
    ipap?: number;
  } = {}
): StoredWaveform {
  const { flPct = 20, mShapePct = 5, reraCount = 10, epap = 10, ipap = 16 } = options;
  const durationSeconds = durationHours * 3600;
  const sampleRate = 25;
  const totalSamples = Math.round(durationSeconds * sampleRate);

  // Generate raw flow data
  const flow = new Float32Array(totalSamples);
  const pressure = new Float32Array(totalSamples);
  const breathDuration = durationSeconds / Math.max(breathCount, 1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const breathPhase = (t % breathDuration) / breathDuration;
    const breathIndex = Math.floor(t / breathDuration);

    const isFL = (breathIndex % Math.round(100 / Math.max(flPct, 1))) === 0;
    const isMShape = isFL && (breathIndex % Math.round(100 / Math.max(mShapePct, 1))) === 0;

    let flowValue: number;
    if (breathPhase < 0.4) {
      const inspPhase = breathPhase / 0.4;
      if (isMShape) {
        flowValue = inspPhase < 0.5
          ? Math.sin(inspPhase * 2 * Math.PI) * 30
          : Math.sin((inspPhase - 0.1) * 2 * Math.PI) * 25;
      } else if (isFL) {
        flowValue = Math.min(Math.sin(inspPhase * Math.PI) * 35, 22);
      } else {
        flowValue = Math.sin(inspPhase * Math.PI) * 35;
      }
    } else {
      const expPhase = (breathPhase - 0.4) / 0.6;
      flowValue = -Math.sin(expPhase * Math.PI) * 25;
    }

    const noise = (Math.sin(t * 7.3) + Math.sin(t * 13.1)) * 1.5;
    flow[i] = flowValue + noise;

    // Pressure
    pressure[i] = breathPhase < 0.4
      ? ipap - (ipap - epap) * 0.2 * Math.sin(breathPhase / 0.4 * Math.PI)
      : epap + (ipap - epap) * 0.1 * Math.sin((breathPhase - 0.4) / 0.6 * Math.PI);
  }

  // Generate events
  const events: WaveformEvent[] = [];

  // RERA events
  const reraSpacing = durationSeconds / (reraCount + 1);
  for (let i = 0; i < reraCount; i++) {
    const start = reraSpacing * (i + 0.5 + Math.sin(i * 3.7) * 0.3);
    events.push({
      startSec: +start.toFixed(0),
      endSec: +(start + 12 + Math.sin(i * 2.1) * 4).toFixed(0),
      type: 'rera',
      label: 'RERA',
    });
  }

  // FL events
  const flEvents = Math.round(breathCount * flPct / 100 / 5);
  const flSpacing = durationSeconds / (flEvents + 1);
  for (let i = 0; i < flEvents; i++) {
    const start = flSpacing * (i + 0.3 + Math.sin(i * 5.1) * 0.2);
    events.push({
      startSec: +start.toFixed(0),
      endSec: +(start + 20 + Math.sin(i * 1.7) * 8).toFixed(0),
      type: 'flow-limitation',
      label: 'Flow Limitation',
    });
  }

  events.sort((a, b) => a.startSec - b.startSec);

  // Compute derived metrics from raw data
  const tidalVolume = computeTidalVolume(flow, sampleRate);
  const respiratoryRate = computeRespiratoryRate(flow, sampleRate);
  const stats = computeFlowStatsFromRaw(flow, sampleRate, pressure);
  stats.breathCount = breathCount; // Override with input

  // Synthetic leak
  const leak: LeakPoint[] = [];
  const bucketSeconds = 2;
  const leakBuckets = Math.ceil(durationSeconds / bucketSeconds);
  for (let b = 0; b < leakBuckets; b++) {
    const t = b * bucketSeconds;
    const breathIndex = Math.floor(t / breathDuration);
    const breathPhase = (t % breathDuration) / breathDuration;
    const leakBase = 6 + Math.sin(t * 0.001) * 2;
    const leakSpike = (breathIndex % 40 === 0 && breathPhase < 0.2) ? 15 + Math.sin(t * 0.7) * 5 : 0;
    const leakValue = Math.max(0, leakBase + leakSpike + Math.sin(t * 0.3) * 1.5);
    leak.push({
      t: +(t).toFixed(1),
      avg: +leakValue.toFixed(1),
      max: +(leakValue + Math.abs(Math.sin(t * 1.1)) * 3).toFixed(1),
    });
  }

  return {
    dateStr: '',
    flow,
    pressure,
    sampleRate,
    durationSeconds,
    events,
    stats,
    tidalVolume,
    respiratoryRate,
    leak,
    storedAt: Date.now(),
    engineVersion: ENGINE_VERSION,
  };
}

// ── Deprecated functions (kept for backward compatibility) ──

/**
 * @deprecated Use decimateFlow instead. This function uses min/max/avg bucketing.
 */
export function downsampleFlow(
  data: Float32Array,
  sampleRate: number,
  bucketSeconds = 2
): WaveformPoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);
  const points: WaveformPoint[] = new Array(totalBuckets);

  for (let b = 0; b < totalBuckets; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, data.length);

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (let i = start; i < end; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
    }

    const count = end - start;
    points[b] = {
      t: +(start / sampleRate).toFixed(1),
      min: +min.toFixed(2),
      max: +max.toFixed(2),
      avg: +(sum / count).toFixed(2),
    };
  }

  return points;
}

/**
 * @deprecated Use decimatePressure instead.
 */
export function downsamplePressure(
  data: Float32Array,
  sampleRate: number,
  bucketSeconds = 2
): PressurePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);
  const points: PressurePoint[] = new Array(totalBuckets);

  for (let b = 0; b < totalBuckets; b++) {
    const start = b * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, data.length);

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }

    points[b] = {
      t: +(start / sampleRate).toFixed(1),
      avg: +(sum / (end - start)).toFixed(2),
    };
  }

  return points;
}

// ── Format helpers ──────────────────────────────────────────

/**
 * Format elapsed seconds as HH:MM:SS for chart labels.
 */
export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format elapsed seconds as H:MM for compact chart labels.
 */
export function formatElapsedTimeShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * M-shape detection for waveform worker.
 * Matches NED engine logic: valley < 80% of Qpeak in middle 50% of inspiration,
 * with bi-modal verification (peaks on both sides must exceed 80% threshold).
 * Minimum 12 samples required.
 */
export function detectMShapeInWorker(inspFlow: Float32Array, qPeak: number): boolean {
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
    // Find valley index
    let valleyIdx = start25;
    for (let i = start25; i < end75; i++) {
      if (inspFlow[i] === minInMiddle) {
        valleyIdx = i;
        break;
      }
    }

    // Verify peaks on both sides of the valley
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
