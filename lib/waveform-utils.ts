// ============================================================
// AirwayLab — Waveform Utility Functions
// Downsampling, synthetic generation, and formatting helpers
// ============================================================

import type { WaveformPoint, PressurePoint, WaveformData, WaveformEvent } from './waveform-types';

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
  pressure: PressurePoint[]
): WaveformData['stats'] {
  if (flow.length === 0) {
    return { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null };
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

  return {
    breathCount,
    flowMin: +fMin.toFixed(2),
    flowMax: +fMax.toFixed(2),
    flowMean: +(fSum / flow.length).toFixed(2),
    pressureMin: pMin !== null ? +pMin.toFixed(1) : null,
    pressureMax: pMax !== null ? +pMax.toFixed(1) : null,
  };
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
  const events: WaveformEvent[] = [];

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

  const stats = computeFlowStats(flow, pressure);
  // Override breath count with the actual input
  stats.breathCount = breathCount;

  return {
    dateStr: '',
    durationSeconds,
    originalSampleRate: 25,
    flow,
    pressure,
    events,
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
