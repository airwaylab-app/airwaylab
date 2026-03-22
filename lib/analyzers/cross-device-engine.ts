import type { RERACandidate, CrossDeviceResults } from '../types';
import type { OximetrySample } from '../parsers/oximetry-csv-parser';

const MIN_RERAS = 10;
const HR_SPIKE_THRESHOLD = 8;
const BASELINE_WINDOW_SEC = 30;
const SEARCH_WINDOW_SEC = 45;
const OFFSET_RANGE_MIN = -120;
const OFFSET_RANGE_MAX = 120;
const PHYSIO_DELAY_MIN = 5;
const PHYSIO_DELAY_MAX = 45;

function detectHRSpikeSet(samples: OximetrySample[], intervalSeconds: number): Set<number> {
  const spikeSet = new Set<number>();
  const n = samples.length;
  if (n === 0) return spikeSet;
  const baselineSamples = Math.round(BASELINE_WINDOW_SEC / intervalSeconds);
  const startTime = samples[0]!.time.getTime();
  for (let i = baselineSamples; i < n; i++) {
    let sum = 0;
    let count = 0;
    const bStart = Math.max(0, i - baselineSamples);
    for (let j = bStart; j < i; j++) {
      if (samples[j]!.hr > 0) { sum += samples[j]!.hr; count++; }
    }
    if (count === 0) continue;
    const baseline = sum / count;
    if (samples[i]!.hr - baseline >= HR_SPIKE_THRESHOLD) {
      spikeSet.add(Math.round((samples[i]!.time.getTime() - startTime) / 1000));
    }
  }
  return spikeSet;
}

export function estimateClockOffset(reraTimestamps: number[], spikeSet: Set<number>): { bestOffset: number; bestMatches: number; totalEvents: number; matchPct: number; confidence: 'high' | 'low' } {
  if (reraTimestamps.length < MIN_RERAS) {
    return { bestOffset: 0, bestMatches: 0, totalEvents: reraTimestamps.length, matchPct: 0, confidence: 'low' };
  }
  let bestOffset = 0;
  let bestMatches = 0;
  for (let testOffset = OFFSET_RANGE_MIN; testOffset <= OFFSET_RANGE_MAX; testOffset++) {
    let matches = 0;
    for (const reraEnd of reraTimestamps) {
      const eventTime = reraEnd + testOffset;
      let found = false;
      for (let delay = PHYSIO_DELAY_MIN; delay <= PHYSIO_DELAY_MAX; delay++) {
        const checkT = Math.round(eventTime + delay);
        if (spikeSet.has(checkT) || spikeSet.has(checkT - 1) || spikeSet.has(checkT + 1)) { found = true; break; }
      }
      if (found) matches++;
    }
    if (matches > bestMatches) { bestMatches = matches; bestOffset = testOffset; }
  }
  const total = reraTimestamps.length;
  const matchPct = total > 0 ? Math.round((100 * bestMatches) / total * 10) / 10 : 0;
  return { bestOffset, bestMatches, totalEvents: total, matchPct, confidence: matchPct >= 25 ? 'high' : 'low' };
}

export function matchRERAs(reras: RERACandidate[], samples: OximetrySample[], clockOffset: number, intervalSeconds: number, totalDurationSec: number): { total: number; matched: number; pct: number; h1Matched: number; h1Total: number; h1Pct: number; h2Matched: number; h2Total: number; h2Pct: number } {
  if (reras.length === 0 || samples.length === 0) {
    return { total: 0, matched: 0, pct: 0, h1Matched: 0, h1Total: 0, h1Pct: 0, h2Matched: 0, h2Total: 0, h2Pct: 0 };
  }
  const oxiStartMs = samples[0]!.time.getTime();
  const midpointSec = totalDurationSec / 2;
  let h1Matched = 0, h1Total = 0, h2Matched = 0, h2Total = 0;
  for (const rera of reras) {
    const half = rera.startSec < midpointSec ? 'H1' : 'H2';
    const reraEndSec = rera.startSec + rera.durationSec + clockOffset;
    const searchStartMs = oxiStartMs + reraEndSec * 1000;
    const searchEndMs = searchStartMs + SEARCH_WINDOW_SEC * 1000;
    const baselineStartMs = searchStartMs - BASELINE_WINDOW_SEC * 1000;
    let baselineSum = 0, baselineCount = 0, searchStartIdx = -1;
    for (let i = 0; i < samples.length; i++) {
      const tMs = samples[i]!.time.getTime();
      if (tMs >= baselineStartMs && tMs < searchStartMs && samples[i]!.hr > 0) { baselineSum += samples[i]!.hr; baselineCount++; }
      if (tMs >= searchStartMs && searchStartIdx === -1) { searchStartIdx = i; }
    }
    const minBaseline = Math.max(3, Math.round(BASELINE_WINDOW_SEC / intervalSeconds) / 3);
    if (baselineCount < minBaseline) continue;
    const baseline = baselineSum / baselineCount;
    let found = false;
    if (searchStartIdx >= 0) {
      for (let i = searchStartIdx; i < samples.length; i++) {
        if (samples[i]!.time.getTime() > searchEndMs) break;
        if (samples[i]!.hr - baseline >= HR_SPIKE_THRESHOLD) { found = true; break; }
      }
    }
    if (half === 'H1') { h1Total++; if (found) h1Matched++; }
    else { h2Total++; if (found) h2Matched++; }
  }
  const total = h1Total + h2Total;
  const matched = h1Matched + h2Matched;
  return {
    total, matched,
    pct: total > 0 ? Math.round((100 * matched) / total * 10) / 10 : 0,
    h1Matched, h1Total,
    h1Pct: h1Total > 0 ? Math.round((100 * h1Matched) / h1Total * 10) / 10 : 0,
    h2Matched, h2Total,
    h2Pct: h2Total > 0 ? Math.round((100 * h2Matched) / h2Total * 10) / 10 : 0,
  };
}

export function decomposeHRc10(couplingPct: number, reraIndex: number, hrc10: number): { reraCoupledRate: number; nonReraRate: number } {
  const reraCoupledRate = Math.round(reraIndex * (couplingPct / 100) * 10) / 10;
  const nonReraRate = Math.round(Math.max(0, hrc10 - reraCoupledRate) * 10) / 10;
  return { reraCoupledRate, nonReraRate };
}

export function computeCrossDevice(reras: RERACandidate[], oxSamples: OximetrySample[], intervalSeconds: number, totalDurationSec: number, reraIndex: number, hrc10: number): CrossDeviceResults | null {
  if (reras.length < MIN_RERAS || oxSamples.length < 100) return null;
  const spikeSet = detectHRSpikeSet(oxSamples, intervalSeconds);
  const reraEndTimes = reras.map((r) => r.startSec + r.durationSec);
  const offset = estimateClockOffset(reraEndTimes, spikeSet);
  const matching = matchRERAs(reras, oxSamples, offset.bestOffset, intervalSeconds, totalDurationSec);
  const decomposition = decomposeHRc10(matching.pct, reraIndex, hrc10);
  return {
    couplingPct: matching.pct,
    h1CouplingPct: matching.h1Pct,
    h2CouplingPct: matching.h2Pct,
    matchedCount: matching.matched,
    totalCount: matching.total,
    clockOffsetSec: offset.bestOffset,
    offsetConfidence: offset.confidence,
    reraCoupledRate: decomposition.reraCoupledRate,
    nonReraRate: decomposition.nonReraRate,
  };
}
