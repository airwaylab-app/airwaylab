// ============================================================
// AirwayLab — Waveform Utility Functions
// Downsampling, synthetic generation, and formatting helpers
// ============================================================

import type {
  WaveformPoint,
  PressurePoint,
  LeakPoint,
  WaveformData,
  WaveformEvent,
  TidalVolumePoint,
  RespiratoryRatePoint,
} from './waveform-types';

/**
 * Downsample a Float32Array using min/max/avg bucketing.
 * Preserves peaks and valleys (like OSCAR's zoomed-out rendering).
 *
 * @param data - Raw samples
 * @param sampleRate - Samples per second
 * @param bucketSeconds - Seconds per output bucket (default: 2)
 * @returns Array of WaveformPoints
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
 * Downsample pressure data to averaged buckets.
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

/**
 * Compute flow summary statistics.
 */
export function computeFlowStats(
  flow: WaveformPoint[],
  pressure: PressurePoint[],
  leak: LeakPoint[] = []
): WaveformData['stats'] {
  if (flow.length === 0) {
    return { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null, leakMean: null, leakMax: null, leakP95: null };
  }

  let fMin = Infinity;
  let fMax = -Infinity;
  let fSum = 0;
  let zeroCrossings = 0;
  let prevSign = flow[0].avg >= 0;

  for (const p of flow) {
    if (p.min < fMin) fMin = p.min;
    if (p.max > fMax) fMax = p.max;
    fSum += p.avg;

    const sign = p.avg >= 0;
    if (sign !== prevSign) zeroCrossings++;
    prevSign = sign;
  }

  // Approximate breath count: each breath has 2 zero crossings (insp→exp, exp→insp)
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
    // P95 from sorted avg values
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

  const dt = 1 / sampleRate; // seconds per sample
  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);

  // Accumulators: sum of TV values and count of breaths per bucket
  const bucketSum = new Float64Array(totalBuckets);
  const bucketCount = new Uint16Array(totalBuckets);

  // Detect breaths via negative→positive zero-crossings (start of inspiration)
  const minBreathSamples = Math.round(sampleRate * 1.5); // min ~1.5s breath
  const maxBreathSamples = Math.round(sampleRate * 15);  // max ~15s breath

  let breathStart = 0;
  let prevPositive = data[0] >= 0;

  for (let i = 1; i < data.length; i++) {
    const positive = data[i] >= 0;

    // Negative→positive crossing = start of new breath
    if (!prevPositive && positive) {
      const breathLen = i - breathStart;
      if (breathLen >= minBreathSamples && breathLen <= maxBreathSamples) {
        // Integrate positive flow (inspiration) for this breath
        let positiveSum = 0;
        for (let j = breathStart; j < i; j++) {
          if (data[j] > 0) positiveSum += data[j];
        }

        // Convert: flow (L/min) × dt (s) × (1 min / 60 s) × 1000 mL/L
        const volumeML = positiveSum * dt * (1000 / 60);

        if (volumeML > 30) { // filter noise-only sub-breaths
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

  // Build output: average TV per bucket
  const points: TidalVolumePoint[] = new Array(totalBuckets);
  for (let b = 0; b < totalBuckets; b++) {
    points[b] = {
      t: +((b * samplesPerBucket) / sampleRate).toFixed(1),
      avg: bucketCount[b] > 0 ? +(bucketSum[b] / bucketCount[b]).toFixed(0) : 0,
    };
  }

  // Fill empty buckets with nearest neighbour (breaths don't land in every 2s bucket)
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
 * Counts zero-crossings (positive→negative transitions) in a sliding window.
 */
export function computeRespiratoryRate(
  data: Float32Array,
  sampleRate: number,
  bucketSeconds = 2
): RespiratoryRatePoint[] {
  if (data.length === 0 || sampleRate <= 0) return [];

  const samplesPerBucket = Math.max(1, Math.round(sampleRate * bucketSeconds));
  const totalBuckets = Math.ceil(data.length / samplesPerBucket);
  // Use a 30-second window for counting breaths
  const windowSamples = Math.round(sampleRate * 30);
  const points: RespiratoryRatePoint[] = [];

  for (let b = 0; b < totalBuckets; b++) {
    const center = b * samplesPerBucket + Math.round(samplesPerBucket / 2);
    const wStart = Math.max(0, center - Math.round(windowSamples / 2));
    const wEnd = Math.min(data.length, center + Math.round(windowSamples / 2));

    // Count positive→negative zero-crossings (start of expiration = 1 breath)
    let crossings = 0;
    let prevPositive = data[wStart] >= 0;
    for (let i = wStart + 1; i < wEnd; i++) {
      const positive = data[i] >= 0;
      if (prevPositive && !positive) crossings++;
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

/**
 * Generate a synthetic flow waveform for demo mode.
 * Simulates realistic PAP breathing patterns with occasional flow limitation.
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
): WaveformData {
  const { flPct = 20, mShapePct = 5, reraCount = 10, epap = 10, ipap = 16 } = options;
  const durationSeconds = durationHours * 3600;
  const bucketSeconds = 2;
  const totalBuckets = Math.ceil(durationSeconds / bucketSeconds);

  const flow: WaveformPoint[] = [];
  const pressure: PressurePoint[] = [];
  const leak: LeakPoint[] = [];
  const events: WaveformEvent[] = [];
  const tidalVolume: TidalVolumePoint[] = [];
  const respiratoryRate: RespiratoryRatePoint[] = [];

  const breathDuration = durationSeconds / breathCount;

  // Generate flow data bucket by bucket
  for (let b = 0; b < totalBuckets; b++) {
    const t = b * bucketSeconds;
    const breathPhase = (t % breathDuration) / breathDuration;
    const breathIndex = Math.floor(t / breathDuration);

    // Determine if this breath has flow limitation
    const isFL = (breathIndex % Math.round(100 / Math.max(flPct, 1))) === 0;
    const isMShape = isFL && (breathIndex % Math.round(100 / Math.max(mShapePct, 1))) === 0;

    // Inspiration phase (0-0.4 of breath) / Expiration phase (0.4-1.0)
    let flowValue: number;
    if (breathPhase < 0.4) {
      // Inspiration
      const inspPhase = breathPhase / 0.4;
      if (isMShape) {
        // M-shape: double peak
        flowValue = inspPhase < 0.5
          ? Math.sin(inspPhase * 2 * Math.PI) * 30
          : Math.sin((inspPhase - 0.1) * 2 * Math.PI) * 25;
      } else if (isFL) {
        // Flow limited: flattened top
        flowValue = Math.min(Math.sin(inspPhase * Math.PI) * 35, 22);
      } else {
        // Normal: smooth sinusoidal inspiration
        flowValue = Math.sin(inspPhase * Math.PI) * 35;
      }
    } else {
      // Expiration (negative flow)
      const expPhase = (breathPhase - 0.4) / 0.6;
      flowValue = -Math.sin(expPhase * Math.PI) * 25;
    }

    // Add some noise
    const noise = (Math.sin(t * 7.3) + Math.sin(t * 13.1)) * 1.5;
    const noisy = flowValue + noise;

    flow.push({
      t: +(t).toFixed(1),
      min: +(noisy - Math.abs(noise) * 0.5 - 2).toFixed(2),
      max: +(noisy + Math.abs(noise) * 0.5 + 2).toFixed(2),
      avg: +noisy.toFixed(2),
    });

    // Pressure: oscillates between EPAP (expiration) and IPAP (inspiration)
    const pressureValue = breathPhase < 0.4
      ? ipap - (ipap - epap) * 0.2 * Math.sin(breathPhase / 0.4 * Math.PI)
      : epap + (ipap - epap) * 0.1 * Math.sin((breathPhase - 0.4) / 0.6 * Math.PI);

    pressure.push({
      t: +(t).toFixed(1),
      avg: +pressureValue.toFixed(2),
    });

    // Synthetic leak: baseline 4-8 L/min with occasional spikes
    const leakBase = 6 + Math.sin(t * 0.001) * 2;
    const leakSpike = (breathIndex % 40 === 0 && breathPhase < 0.2) ? 15 + Math.sin(t * 0.7) * 5 : 0;
    const leakValue = Math.max(0, leakBase + leakSpike + Math.sin(t * 0.3) * 1.5);
    leak.push({
      t: +(t).toFixed(1),
      avg: +leakValue.toFixed(1),
      max: +(leakValue + Math.abs(Math.sin(t * 1.1)) * 3).toFixed(1),
    });

    // Synthetic tidal volume: ~400-600 mL normal, lower for FL
    const tvBase = isFL ? 280 + Math.sin(t * 0.01) * 40 : 450 + Math.sin(t * 0.01) * 80;
    tidalVolume.push({
      t: +(t).toFixed(1),
      avg: +tvBase.toFixed(0),
    });

    // Synthetic respiratory rate: ~14-18 br/min
    const rrBase = 15 + Math.sin(t * 0.005) * 2;
    respiratoryRate.push({
      t: +(t).toFixed(1),
      avg: +rrBase.toFixed(1),
    });
  }

  // Generate RERA events at semi-random intervals
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

  // Generate FL events
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

  // Sort events by start time
  events.sort((a, b) => a.startSec - b.startSec);

  const stats = computeFlowStats(flow, pressure, leak);
  // Override breath count with the actual input
  stats.breathCount = breathCount;

  return {
    dateStr: '',
    durationSeconds,
    originalSampleRate: 25,
    flow,
    pressure,
    leak,
    events,
    tidalVolume,
    respiratoryRate,
    stats,
  };
}

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
