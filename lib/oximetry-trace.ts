// ============================================================
// AirwayLab — Oximetry Trace Builder
// Converts raw OximetrySample[] into downsampled OximetryTraceData
// for charting. Reimplements cleaning logic independently from
// the protected oximetry engine (lib/analyzers/oximetry-engine.ts).
// ============================================================

import type { OximetrySample } from '@/lib/parsers/oximetry-csv-parser';
import type { OximetryTracePoint, OximetryTraceData } from '@/lib/types';

/** Maximum trace points to emit (keeps charts responsive) */
const MAX_TRACE_POINTS = 10_000;

/** Minimum cleaned samples required to produce a trace */
const MIN_SAMPLES = 60;

/** Buffer zone: trim first 15 minutes */
const BUFFER_START_MS = 15 * 60 * 1000;

/** Buffer zone: trim last 5 minutes */
const BUFFER_END_MS = 5 * 60 * 1000;

/** Maximum motion value to retain a sample */
const MAX_MOTION = 5;

/** Rolling baseline window for HR double-tracking correction (ms) */
const HR_BASELINE_WINDOW_MS = 30 * 1000;

/** Rolling baseline window for ODI detection (seconds) */
const ODI_BASELINE_WINDOW_S = 120;

/** Cooldown between ODI events (seconds) */
const ODI_COOLDOWN_S = 30;

// ------------------------------------------------------------------
// Cleaning pipeline
// ------------------------------------------------------------------

interface CleanedSample {
  timeMs: number;
  spo2: number;
  hr: number;
}

function cleanSamples(samples: OximetrySample[]): CleanedSample[] {
  if (samples.length === 0) return [];

  const startMs = samples[0].time.getTime();
  const endMs = samples[samples.length - 1].time.getTime();

  const trimStart = startMs + BUFFER_START_MS;
  const trimEnd = endMs - BUFFER_END_MS;

  // Step 1-3: buffer zones, motion filter, validity, SpO2 range
  const filtered: CleanedSample[] = [];
  for (const s of samples) {
    const ms = s.time.getTime();
    if (ms < trimStart || ms > trimEnd) continue;
    if (s.motion > MAX_MOTION) continue;
    if (!s.valid) continue;
    if (s.spo2 < 50 || s.spo2 > 100) continue;
    filtered.push({ timeMs: ms, spo2: s.spo2, hr: s.hr });
  }

  // Step 4: HR double-tracking correction
  correctDoubleTracking(filtered);

  return filtered;
}

/**
 * HR double-tracking correction using a 30-second rolling baseline.
 * If HR > baseline * 1.7 and HR > 110, try halving.
 * Accept halved value if it falls within 40-110 bpm.
 * Mutates the array in place.
 */
function correctDoubleTracking(samples: CleanedSample[]): void {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.hr <= 110) continue;

    // Build 30-second rolling baseline from preceding samples
    const windowStart = s.timeMs - HR_BASELINE_WINDOW_MS;
    let sum = 0;
    let count = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (samples[j].timeMs < windowStart) break;
      if (samples[j].hr > 0) {
        sum += samples[j].hr;
        count++;
      }
    }

    if (count === 0) continue;

    const baseline = sum / count;
    if (s.hr > baseline * 1.7) {
      const halved = s.hr / 2;
      if (halved >= 40 && halved <= 110) {
        s.hr = Math.round(halved);
      }
    }
  }
}

// ------------------------------------------------------------------
// Downsampling
// ------------------------------------------------------------------

function downsample(
  cleaned: CleanedSample[],
  startMs: number
): OximetryTracePoint[] {
  if (cleaned.length <= MAX_TRACE_POINTS) {
    return cleaned.map((s) => ({
      t: Math.round((s.timeMs - startMs) / 1000),
      spo2: s.spo2,
      hr: s.hr,
    }));
  }

  const durationMs = cleaned[cleaned.length - 1].timeMs - startMs;
  const bucketMs = durationMs / MAX_TRACE_POINTS;
  const points: OximetryTracePoint[] = [];

  let bucketStart = startMs;
  let spo2Sum = 0;
  let hrSum = 0;
  let count = 0;
  let bucketIdx = 0;

  for (const s of cleaned) {
    const bucketEnd = startMs + (bucketIdx + 1) * bucketMs;

    if (s.timeMs >= bucketEnd && count > 0) {
      // Emit the current bucket
      points.push({
        t: Math.round((bucketStart + (bucketEnd - bucketStart) / 2 - startMs) / 1000),
        spo2: Math.round(spo2Sum / count),
        hr: Math.round(hrSum / count),
      });
      // Advance to the bucket containing this sample
      bucketIdx = Math.floor((s.timeMs - startMs) / bucketMs);
      bucketStart = startMs + bucketIdx * bucketMs;
      spo2Sum = 0;
      hrSum = 0;
      count = 0;
    }

    spo2Sum += s.spo2;
    hrSum += s.hr;
    count++;
  }

  // Emit final bucket
  if (count > 0) {
    const bucketEnd = startMs + (bucketIdx + 1) * bucketMs;
    points.push({
      t: Math.round((bucketStart + (bucketEnd - bucketStart) / 2 - startMs) / 1000),
      spo2: Math.round(spo2Sum / count),
      hr: Math.round(hrSum / count),
    });
  }

  return points;
}

// ------------------------------------------------------------------
// ODI event detection
// ------------------------------------------------------------------

interface ODIEvents {
  odi3: number[];
  odi4: number[];
}

/**
 * Detect ODI-3 and ODI-4 events using a 2-minute rolling median baseline.
 * Returns elapsed-second timestamps of each event.
 */
function detectODIEvents(
  cleaned: CleanedSample[],
  startMs: number
): ODIEvents {
  const odi3: number[] = [];
  const odi4: number[] = [];

  let lastOdi3S = -Infinity;
  let lastOdi4S = -Infinity;

  // Sliding window for median calculation
  let windowHead = 0; // index of oldest sample in window

  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i];
    const elapsedS = (s.timeMs - startMs) / 1000;
    const windowStartMs = s.timeMs - ODI_BASELINE_WINDOW_S * 1000;

    // Advance windowHead past expired samples
    while (windowHead < i && cleaned[windowHead].timeMs < windowStartMs) {
      windowHead++;
    }

    // Build baseline from samples in window (excluding current)
    if (windowHead >= i) continue; // not enough baseline data

    const baselineValues: number[] = [];
    for (let j = windowHead; j < i; j++) {
      baselineValues.push(cleaned[j].spo2);
    }

    if (baselineValues.length < 10) continue; // need reasonable baseline

    const baseline = median(baselineValues);
    const drop = baseline - s.spo2;

    if (drop >= 4 && elapsedS - lastOdi4S >= ODI_COOLDOWN_S) {
      odi4.push(Math.round(elapsedS));
      lastOdi4S = elapsedS;
    }

    if (drop >= 3 && elapsedS - lastOdi3S >= ODI_COOLDOWN_S) {
      odi3.push(Math.round(elapsedS));
      lastOdi3S = elapsedS;
    }
  }

  return { odi3, odi4 };
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// ------------------------------------------------------------------
// Main export
// ------------------------------------------------------------------

/**
 * Build an OximetryTraceData object from raw oximetry samples.
 * Returns null if fewer than 60 samples remain after cleaning.
 */
export function buildOximetryTrace(
  samples: OximetrySample[]
): OximetryTraceData | null {
  const cleaned = cleanSamples(samples);

  if (cleaned.length < MIN_SAMPLES) return null;

  const startMs = cleaned[0].timeMs;
  const endMs = cleaned[cleaned.length - 1].timeMs;
  const durationSeconds = Math.round((endMs - startMs) / 1000);

  const trace = downsample(cleaned, startMs);
  const { odi3, odi4 } = detectODIEvents(cleaned, startMs);

  return {
    trace,
    durationSeconds,
    odi3Events: odi3,
    odi4Events: odi4,
  };
}
