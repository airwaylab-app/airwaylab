// ============================================================
// AirwayLab — Oximetry Engine
// 17-metric framework: ODI, desaturation time, HR surges,
// coupled events, H1/H2 splits, double-tracking correction
// ============================================================

import type { OximetryResults } from '../types';
import type { OximetrySample } from '../parsers/oximetry-csv-parser';

const SAMPLE_INTERVAL = 2; // seconds per sample (Checkme O2 Max)

// ── Cleaning ─────────────────────────────────────────────────

interface CleanedData {
  samples: OximetrySample[];
  totalSamples: number;
  retainedSamples: number;
  doubleTrackingCorrected: number;
}

function cleanSamples(raw: OximetrySample[]): CleanedData {
  const totalSamples = raw.length;
  let doubleTrackingCorrected = 0;

  if (raw.length === 0) {
    return { samples: [], totalSamples: 0, retainedSamples: 0, doubleTrackingCorrected: 0 };
  }

  // Step 1: Buffer zones — trim first 15 min + last 5 min
  const startTime = raw[0].time.getTime();
  const endTime = raw[raw.length - 1].time.getTime();
  const trimStart = startTime + 15 * 60 * 1000;
  const trimEnd = endTime - 5 * 60 * 1000;

  let samples = raw.filter(
    (s) => s.time.getTime() >= trimStart && s.time.getTime() <= trimEnd
  );

  // Step 2: Motion filter
  samples = samples.filter((s) => s.motion <= 5);

  // Step 3: Invalid removal
  samples = samples.filter((s) => s.valid);

  // Step 4: SpO2 range 50-100
  samples = samples.filter((s) => s.spo2 >= 50 && s.spo2 <= 100);

  // Step 5: HR double-tracking correction
  // Compute global HR baseline as 25th percentile
  const hrValues = samples.filter((s) => s.hr > 0).map((s) => s.hr);
  hrValues.sort((a, b) => a - b);
  const hrBaseline = hrValues[Math.floor(hrValues.length * 0.25)] ?? 70;

  samples = samples.filter((s) => {
    if (s.hr > 180) return false; // Reject outright

    if (s.hr > hrBaseline * 1.7 && s.hr > 110) {
      const halved = s.hr / 2;
      if (halved >= 40 && halved <= 110) {
        s.hr = Math.round(halved);
        doubleTrackingCorrected++;
      } else {
        return false;
      }
    }
    return true;
  });

  return {
    samples,
    totalSamples,
    retainedSamples: samples.length,
    doubleTrackingCorrected,
  };
}

// ── ODI Calculation ──────────────────────────────────────────

interface ODIEvent {
  index: number;
  time: Date;
  drop: number;
}

function computeODI(
  samples: OximetrySample[],
  threshold: number
): { events: ODIEvent[]; index: number } {
  const events: ODIEvent[] = [];
  const n = samples.length;
  if (n === 0) return { events, index: 0 };

  // Rolling 2-minute baseline (60 samples at 2s interval)
  const baselineWindow = 60;
  const cooldownSamples = Math.round(30 / SAMPLE_INTERVAL); // 30s cooldown
  let lastEventIdx = -cooldownSamples;

  for (let i = baselineWindow; i < n; i++) {
    if (i - lastEventIdx < cooldownSamples) continue;

    // Compute baseline peak in preceding 2 min
    let baselinePeak = 0;
    const start = Math.max(0, i - baselineWindow);
    for (let j = start; j < i; j++) {
      if (samples[j].spo2 > baselinePeak) baselinePeak = samples[j].spo2;
    }

    const drop = baselinePeak - samples[i].spo2;
    if (drop >= threshold) {
      events.push({ index: i, time: samples[i].time, drop });
      lastEventIdx = i;
    }
  }

  const durationHours =
    n > 0
      ? (samples[n - 1].time.getTime() - samples[0].time.getTime()) /
        (1000 * 3600)
      : 1;

  return {
    events,
    index: durationHours > 0 ? events.length / durationHours : 0,
  };
}

// ── HR Clinical Surges (30s rolling mean baseline) ───────────

function computeHRClinical(
  samples: OximetrySample[],
  threshold: number
): number {
  const n = samples.length;
  if (n === 0) return 0;

  const baselineWindow = Math.round(30 / SAMPLE_INTERVAL); // 15 samples
  const cooldownSamples = Math.round(30 / SAMPLE_INTERVAL);
  let eventCount = 0;
  let lastEventIdx = -cooldownSamples;

  for (let i = baselineWindow; i < n; i++) {
    if (i - lastEventIdx < cooldownSamples) continue;

    // 30s rolling mean baseline
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - baselineWindow);
    for (let j = start; j < i; j++) {
      if (samples[j].hr > 0) {
        sum += samples[j].hr;
        count++;
      }
    }
    if (count === 0) continue;
    const baseline = sum / count;

    if (samples[i].hr > baseline + threshold) {
      eventCount++;
      lastEventIdx = i;
    }
  }

  const durationHours =
    n > 0
      ? (samples[n - 1].time.getTime() - samples[0].time.getTime()) /
        (1000 * 3600)
      : 1;

  return durationHours > 0 ? eventCount / durationHours : 0;
}

// ── HR Rolling Mean Surges (5-minute baseline, 5s sustain) ───

function computeHRRollingMean(
  samples: OximetrySample[],
  threshold: number
): number {
  const n = samples.length;
  if (n === 0) return 0;

  const baselineWindow = Math.round(300 / SAMPLE_INTERVAL); // 5 min = 150 samples
  const sustainSamples = Math.round(5 / SAMPLE_INTERVAL); // 5s = ~3 samples
  const cooldownSamples = Math.round(30 / SAMPLE_INTERVAL);
  let eventCount = 0;
  let lastEventIdx = -cooldownSamples;

  for (let i = baselineWindow; i < n - sustainSamples; i++) {
    if (i - lastEventIdx < cooldownSamples) continue;

    // 5-min rolling mean baseline
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - baselineWindow);
    for (let j = start; j < i; j++) {
      if (samples[j].hr > 0) {
        sum += samples[j].hr;
        count++;
      }
    }
    if (count === 0) continue;
    const baseline = sum / count;

    // Check sustained elevation over 5s
    let sustained = true;
    for (let k = 0; k < sustainSamples; k++) {
      if (samples[i + k].hr <= baseline + threshold) {
        sustained = false;
        break;
      }
    }

    if (sustained) {
      eventCount++;
      lastEventIdx = i;
    }
  }

  const durationHours =
    n > 0
      ? (samples[n - 1].time.getTime() - samples[0].time.getTime()) /
        (1000 * 3600)
      : 1;

  return durationHours > 0 ? eventCount / durationHours : 0;
}

// ── Coupled Events ───────────────────────────────────────────

function computeCoupledEvents(
  samples: OximetrySample[],
  odiEvents: ODIEvent[],
  hrThreshold: number
): number {
  if (samples.length === 0 || odiEvents.length === 0) return 0;

  const windowSamples = Math.round(30 / SAMPLE_INTERVAL); // ±30s
  let coupled = 0;

  // Pre-compute 30s rolling HR baseline for all samples
  const baselineWindow = Math.round(30 / SAMPLE_INTERVAL);

  for (const event of odiEvents) {
    const idx = event.index;
    const searchStart = Math.max(0, idx - windowSamples);
    const searchEnd = Math.min(samples.length - 1, idx + windowSamples);

    // Check if any HR surge occurs in the window
    let hasSurge = false;
    for (let j = searchStart; j <= searchEnd; j++) {
      // Compute local HR baseline
      let sum = 0;
      let count = 0;
      const bStart = Math.max(0, j - baselineWindow);
      for (let k = bStart; k < j; k++) {
        if (samples[k].hr > 0) {
          sum += samples[k].hr;
          count++;
        }
      }
      if (count === 0) continue;
      const baseline = sum / count;

      if (samples[j].hr > baseline + hrThreshold) {
        hasSurge = true;
        break;
      }
    }

    if (hasSurge) coupled++;
  }

  const durationHours =
    samples.length > 0
      ? (samples[samples.length - 1].time.getTime() -
          samples[0].time.getTime()) /
        (1000 * 3600)
      : 1;

  return durationHours > 0 ? coupled / durationHours : 0;
}

// ── Desaturation Time ────────────────────────────────────────

function computeDesatTime(samples: OximetrySample[], threshold: number): number {
  if (samples.length === 0) return 0;
  let below = 0;
  for (const s of samples) {
    if (s.spo2 < threshold) below++;
  }
  return (below / samples.length) * 100;
}

// ── Summary Stats ────────────────────────────────────────────

function computeSummary(samples: OximetrySample[]) {
  if (samples.length === 0) {
    return { spo2Mean: 0, spo2Min: 0, hrMean: 0, hrSD: 0 };
  }

  let spo2Sum = 0;
  let spo2Min = 100;
  let hrSum = 0;
  let hrCount = 0;

  for (const s of samples) {
    spo2Sum += s.spo2;
    if (s.spo2 < spo2Min) spo2Min = s.spo2;
    if (s.hr > 0) {
      hrSum += s.hr;
      hrCount++;
    }
  }

  const spo2Mean = spo2Sum / samples.length;
  const hrMean = hrCount > 0 ? hrSum / hrCount : 0;

  // HR standard deviation
  let hrVarSum = 0;
  for (const s of samples) {
    if (s.hr > 0) {
      hrVarSum += (s.hr - hrMean) ** 2;
    }
  }
  const hrSD = hrCount > 1 ? Math.sqrt(hrVarSum / (hrCount - 1)) : 0;

  return { spo2Mean, spo2Min, hrMean, hrSD };
}

// ── H1/H2 Split ─────────────────────────────────────────────

function splitHalves(samples: OximetrySample[]): {
  h1: OximetrySample[];
  h2: OximetrySample[];
} {
  const mid = Math.floor(samples.length / 2);
  return {
    h1: samples.slice(0, mid),
    h2: samples.slice(mid),
  };
}

// ── Main Entry Point ─────────────────────────────────────────

export function computeOximetry(rawSamples: OximetrySample[]): OximetryResults {
  const { samples, totalSamples, retainedSamples, doubleTrackingCorrected } =
    cleanSamples(rawSamples);

  if (samples.length < 60) {
    // Not enough data for meaningful analysis
    return emptyResults(totalSamples, retainedSamples, doubleTrackingCorrected);
  }

  // SpO2 metrics
  const odi3Result = computeODI(samples, 3);
  const odi4Result = computeODI(samples, 4);
  const tBelow90 = computeDesatTime(samples, 90);
  const tBelow94 = computeDesatTime(samples, 94);

  // HR Clinical (30s baseline)
  const hrClin8 = computeHRClinical(samples, 8);
  const hrClin10 = computeHRClinical(samples, 10);
  const hrClin12 = computeHRClinical(samples, 12);
  const hrClin15 = computeHRClinical(samples, 15);

  // HR Rolling Mean (5min baseline, 5s sustain)
  const hrMean10 = computeHRRollingMean(samples, 10);
  const hrMean15 = computeHRRollingMean(samples, 15);

  // Coupled events
  const coupled3_6 = computeCoupledEvents(samples, odi3Result.events, 6);
  const coupled3_10 = computeCoupledEvents(samples, odi3Result.events, 10);

  // Coupled/HR ratio
  const totalHREvents = hrClin10;
  const coupledHRRatio =
    totalHREvents > 0 ? coupled3_10 / totalHREvents : 0;

  // Summary
  const summary = computeSummary(samples);

  // H1/H2 splits
  const { h1, h2 } = splitHalves(samples);
  const h1Odi3 = computeODI(h1, 3).index;
  const h1HrClin10 = computeHRClinical(h1, 10);
  const h1TBelow94 = computeDesatTime(h1, 94);
  const h2Odi3 = computeODI(h2, 3).index;
  const h2HrClin10 = computeHRClinical(h2, 10);
  const h2TBelow94 = computeDesatTime(h2, 94);

  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    odi3: r2(odi3Result.index),
    odi4: r2(odi4Result.index),
    tBelow90: r2(tBelow90),
    tBelow94: r2(tBelow94),
    hrClin8,
    hrClin10,
    hrClin12,
    hrClin15,
    hrMean10,
    hrMean15,
    coupled3_6,
    coupled3_10,
    coupledHRRatio: r2(coupledHRRatio),
    ...summary,
    h1: { hrClin10: h1HrClin10, odi3: r2(h1Odi3), tBelow94: r2(h1TBelow94) },
    h2: { hrClin10: h2HrClin10, odi3: r2(h2Odi3), tBelow94: r2(h2TBelow94) },
    totalSamples,
    retainedSamples,
    doubleTrackingCorrected,
  };
}

function emptyResults(
  totalSamples: number,
  retainedSamples: number,
  doubleTrackingCorrected: number
): OximetryResults {
  return {
    odi3: 0, odi4: 0, tBelow90: 0, tBelow94: 0,
    hrClin8: 0, hrClin10: 0, hrClin12: 0, hrClin15: 0,
    hrMean10: 0, hrMean15: 0,
    coupled3_6: 0, coupled3_10: 0, coupledHRRatio: 0,
    spo2Mean: 0, spo2Min: 0, hrMean: 0, hrSD: 0,
    h1: { hrClin10: 0, odi3: 0, tBelow94: 0 },
    h2: { hrClin10: 0, odi3: 0, tBelow94: 0 },
    totalSamples, retainedSamples, doubleTrackingCorrected,
  };
}
