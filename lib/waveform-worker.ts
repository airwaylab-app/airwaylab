// ============================================================
// AirwayLab — Waveform Extraction Worker
// Separate from the main analysis worker (protected module).
// Parses EDF files on demand to extract flow + pressure waveforms.
// ============================================================

import { parseEDF } from './parsers/edf-parser';
import { groupByNight, filterBRPFiles } from './parsers/night-grouper';
import { parseEVE } from './parsers/eve-parser';
import {
  computeFlowStatsFromRaw,
  computeTidalVolume,
  computeRespiratoryRate,
  detectMShapeInWorker,
} from './waveform-utils';
import type {
  WaveformWorkerMessage,
  RawWaveformResult,
  WaveformEvent,
} from './waveform-types';
import type { EDFFile } from './types';

self.onmessage = (e: MessageEvent<WaveformWorkerMessage>) => {
  try {
    const { files, targetDate } = e.data;
    const result = extractWaveform(files, targetDate);
    if (result) {
      // Transfer Float32Array buffers for zero-copy
      const transferable: ArrayBuffer[] = [result.flow!.buffer as ArrayBuffer];
      if (result.pressure) transferable.push(result.pressure.buffer as ArrayBuffer);
      (self as unknown as Worker).postMessage(result, transferable);
    } else {
      const response: RawWaveformResult = {
        type: 'RAW_WAVEFORM_RESULT',
        flow: null,
        pressure: null,
        sampleRate: 0,
        durationSeconds: 0,
        events: [],
        stats: { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null, pressureP10: null, pressureP90: null, pressureMean: null, leakMean: null, leakMax: null, leakP95: null },
        tidalVolume: [],
        respiratoryRate: [],
        leak: [],
        dateStr: targetDate,
      };
      self.postMessage(response);
    }
  } catch (err) {
    const response: RawWaveformResult = {
      type: 'RAW_WAVEFORM_RESULT',
      flow: null,
      pressure: null,
      sampleRate: 0,
      durationSeconds: 0,
      events: [],
      stats: { breathCount: 0, flowMin: 0, flowMax: 0, flowMean: 0, pressureMin: null, pressureMax: null, pressureP10: null, pressureP90: null, pressureMean: null, leakMean: null, leakMax: null, leakP95: null },
      tidalVolume: [],
      respiratoryRate: [],
      leak: [],
      dateStr: e.data.targetDate,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

function extractWaveform(
  files: { buffer: ArrayBuffer; path: string }[],
  targetDate: string
): RawWaveformResult | null {
  // Filter to BRP files only
  const fileList = files.map((f) => ({
    name: f.path.split('/').pop() || '',
    path: f.path,
    size: f.buffer.byteLength,
  }));

  const brpFiles = filterBRPFiles(fileList);

  // Parse all BRP files
  const parsedEdfs: EDFFile[] = [];
  for (const brp of brpFiles) {
    const fileData = files.find((f) => f.path === brp.path);
    if (!fileData) continue;
    try {
      const edf = parseEDF(fileData.buffer, fileData.path);
      parsedEdfs.push(edf);
    } catch {
      // Skip unparseable files
    }
  }

  if (parsedEdfs.length === 0) return null;

  // Group by night and find the target date
  const nightGroups = groupByNight(parsedEdfs);
  const targetGroup = nightGroups.find((g) => g.nightDate === targetDate);

  if (!targetGroup) return null;

  // Concatenate flow data from all sessions
  const sessions = targetGroup.sessions;
  const totalFlowSamples = sessions.reduce((sum, s) => sum + s.flowData.length, 0);
  const combinedFlow = new Float32Array(totalFlowSamples);
  let offset = 0;
  let avgSamplingRate = 0;
  let hasPressure = true;
  let totalPressureSamples = 0;

  for (const session of sessions) {
    combinedFlow.set(session.flowData, offset);
    offset += session.flowData.length;
    avgSamplingRate += session.samplingRate;
    if (!session.pressureData) hasPressure = false;
    else totalPressureSamples += session.pressureData.length;
  }
  avgSamplingRate /= sessions.length;

  // Concatenate pressure data if all sessions have it
  let combinedPressure: Float32Array | null = null;
  if (hasPressure && totalPressureSamples > 0) {
    combinedPressure = new Float32Array(totalPressureSamples);
    let pOffset = 0;
    for (const session of sessions) {
      if (session.pressureData) {
        combinedPressure.set(session.pressureData, pOffset);
        pOffset += session.pressureData.length;
      }
    }
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);

  // Compute derived metrics from raw data
  const tidalVolume = computeTidalVolume(combinedFlow, avgSamplingRate);
  const respiratoryRate = computeRespiratoryRate(combinedFlow, avgSamplingRate);

  // Detect events from flow patterns (flatness-based detection)
  const algorithmEvents = detectEventsFromFlow(combinedFlow, avgSamplingRate);

  // Parse machine-recorded events from EVE.edf files (non-fatal — missing EVE is fine)
  const machineEvents: WaveformEvent[] = [];
  const eveFiles = files.filter((f) => /eve\.edf$/i.test(f.path));
  for (const eveFile of eveFiles) {
    try {
      const parsed = parseEVE(eveFile.buffer);
      for (const me of parsed) {
        machineEvents.push({
          startSec: me.onsetSec,
          endSec: me.onsetSec + me.durationSec,
          type: me.type,
          label: `${me.rawLabel} (${me.durationSec}s)`,
        });
      }
    } catch {
      // EVE parse failure is non-fatal
    }
  }

  // Merge machine + algorithm events, sorted by start time
  const events = [...machineEvents, ...algorithmEvents].sort(
    (a, b) => a.startSec - b.startSec
  );

  // Leak data placeholder — real leak extraction requires parsing separate EDF channels
  const leak: import('./waveform-types').LeakPoint[] = [];

  const stats = computeFlowStatsFromRaw(combinedFlow, avgSamplingRate, combinedPressure, leak);

  return {
    type: 'RAW_WAVEFORM_RESULT',
    flow: combinedFlow,
    pressure: combinedPressure,
    sampleRate: avgSamplingRate,
    durationSeconds: totalDuration,
    events,
    stats,
    tidalVolume,
    respiratoryRate,
    leak,
    dateStr: targetDate,
  };
}

/**
 * Improved event detection from raw flow data.
 * Uses flatness-based flow limitation detection instead of simple amplitude reduction.
 * Detects FL runs, M-shape patterns, and arousal candidates.
 * This is a lightweight detector — the main analysis engines provide the authoritative results.
 */
function detectEventsFromFlow(
  flow: Float32Array,
  sampleRate: number
): WaveformEvent[] {
  const events: WaveformEvent[] = [];
  if (flow.length < sampleRate * 10) return events;

  // Extract per-breath features using zero-crossing detection
  const breaths = extractBreaths(flow, sampleRate);
  if (breaths.length < 5) return events;

  // Compute baseline amplitude from first pass
  let baselineAmp = 0;
  for (const breath of breaths) {
    baselineAmp += breath.amplitude;
  }
  baselineAmp /= breaths.length;

  // Detect FL runs: consecutive breaths with high flatness
  let flRunStart = -1;
  let flRunCount = 0;

  for (let i = 0; i < breaths.length; i++) {
    const b = breaths[i];
    const isFlat = b.flatness > 0.7 && b.amplitude > baselineAmp * 0.3;

    if (isFlat) {
      if (flRunStart === -1) flRunStart = i;
      flRunCount++;
    } else {
      if (flRunCount >= 3) {
        const startSec = breaths[flRunStart].startSample / sampleRate;
        const endSec = breaths[i - 1].endSample / sampleRate;
        const duration = endSec - startSec;
        if (duration >= 10 && duration <= 180) {
          events.push({
            startSec: +startSec.toFixed(0),
            endSec: +endSec.toFixed(0),
            type: 'flow-limitation',
            label: `Flow Limitation (${Math.round(duration)}s)`,
          });
        }
      }
      flRunStart = -1;
      flRunCount = 0;
    }
  }
  // Close any open FL run
  if (flRunCount >= 3) {
    const startSec = breaths[flRunStart].startSample / sampleRate;
    const endSec = breaths[breaths.length - 1].endSample / sampleRate;
    const duration = endSec - startSec;
    if (duration >= 10 && duration <= 180) {
      events.push({
        startSec: +startSec.toFixed(0),
        endSec: +endSec.toFixed(0),
        type: 'flow-limitation',
        label: `Flow Limitation (${Math.round(duration)}s)`,
      });
    }
  }

  // Detect M-shape patterns
  for (const b of breaths) {
    if (b.hasMShape) {
      const startSec = b.startSample / sampleRate;
      const endSec = b.endSample / sampleRate;
      events.push({
        startSec: +startSec.toFixed(0),
        endSec: +endSec.toFixed(0),
        type: 'm-shape',
        label: 'M-Shape',
      });
    }
  }

  // Detect arousal candidates: sudden amplitude increase after reduced breathing
  const windowSize = 15; // ~15 breaths = ~60s baseline
  for (let i = windowSize; i < breaths.length; i++) {
    const baselineWindow = breaths.slice(i - windowSize, i);
    const baselineWindowAmp = baselineWindow.reduce(
      (sum: number, bw: BreathFeatures) => sum + bw.amplitude, 0
    ) / windowSize;

    if (breaths[i].amplitude > baselineWindowAmp * 1.5 && baselineWindowAmp < baselineAmp * 0.7) {
      const startSec = breaths[i].startSample / sampleRate;
      const endSec = breaths[i].endSample / sampleRate;
      events.push({
        startSec: +startSec.toFixed(0),
        endSec: +endSec.toFixed(0),
        type: 'rera',
        label: 'RERA',
      });
    }
  }

  // Sort by start time
  events.sort((a, b) => a.startSec - b.startSec);

  return events;
}

interface BreathFeatures {
  startSample: number;
  endSample: number;
  amplitude: number;
  flatness: number;
  hasMShape: boolean;
}

/**
 * Extract individual breaths by detecting zero-crossings in flow data.
 */
function extractBreaths(flow: Float32Array, sampleRate: number): BreathFeatures[] {
  const breaths: BreathFeatures[] = [];
  const minBreathSamples = Math.round(sampleRate * 1.5); // Min ~1.5s breath
  const maxBreathSamples = Math.round(sampleRate * 15);  // Max ~15s breath

  // Find positive→negative zero-crossings (start of expiration)
  let breathStart = 0;
  let prevPositive = flow[0] >= 0;

  for (let i = 1; i < flow.length; i++) {
    const positive = flow[i] >= 0;

    // Detect negative→positive crossing (start of inspiration = start of new breath)
    if (!prevPositive && positive) {
      const breathLen = i - breathStart;
      if (breathLen >= minBreathSamples && breathLen <= maxBreathSamples) {
        const features = computeBreathFeatures(flow, breathStart, i);
        if (features) breaths.push(features);
      }
      breathStart = i;
    }
    prevPositive = positive;
  }

  return breaths;
}

/**
 * Compute features for a single breath.
 */
function computeBreathFeatures(
  flow: Float32Array,
  start: number,
  end: number,
): BreathFeatures | null {
  // Find the inspiratory portion (positive flow from start)
  let inspEnd = start;
  for (let i = start; i < end; i++) {
    if (flow[i] < 0) {
      inspEnd = i;
      break;
    }
    if (i === end - 1) inspEnd = end;
  }

  if (inspEnd <= start + 3) return null;

  // Compute peak and mean of inspiratory flow
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (let i = start; i < inspEnd; i++) {
    if (flow[i] > peak) peak = flow[i];
    sum += flow[i];
    count++;
  }

  if (peak <= 0 || count === 0) return null;
  const mean = sum / count;
  const flatness = mean / peak; // 1.0 = perfectly flat, closer to 0 = peaky

  // Amplitude (peak-to-trough)
  let trough = 0;
  for (let i = inspEnd; i < end; i++) {
    if (flow[i] < trough) trough = flow[i];
  }
  const amplitude = peak - trough;

  // M-shape detection: matches NED engine logic (80% threshold + bi-modal verification)
  const inspFlow = flow.subarray(start, inspEnd);
  const hasMShape = detectMShapeInWorker(inspFlow, peak);

  return {
    startSample: start,
    endSample: end,
    amplitude,
    flatness,
    hasMShape,
  };
}
