// ============================================================
// AirwayLab — Waveform Extraction Worker
// Separate from the main analysis worker (protected module).
// Parses EDF files on demand to extract flow + pressure waveforms.
// ============================================================

import { parseEDF } from './parsers/edf-parser';
import { groupByNight, filterBRPFiles } from './parsers/night-grouper';
import { downsampleFlow, downsamplePressure, computeFlowStats } from './waveform-utils';
import type {
  WaveformWorkerMessage,
  WaveformWorkerResult,
  WaveformData,
  WaveformEvent,
} from './waveform-types';
import type { EDFFile } from './types';

self.onmessage = (e: MessageEvent<WaveformWorkerMessage>) => {
  try {
    const { files, targetDate, bucketSeconds } = e.data;
    const waveform = extractWaveform(files, targetDate, bucketSeconds);
    const response: WaveformWorkerResult = { type: 'WAVEFORM_RESULT', waveform };
    self.postMessage(response);
  } catch (err) {
    const response: WaveformWorkerResult = {
      type: 'WAVEFORM_RESULT',
      waveform: null,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

function extractWaveform(
  files: { buffer: ArrayBuffer; path: string }[],
  targetDate: string,
  bucketSeconds: number
): WaveformData | null {
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

  // Downsample
  const flow = downsampleFlow(combinedFlow, avgSamplingRate, bucketSeconds);
  const pressure = combinedPressure
    ? downsamplePressure(combinedPressure, avgSamplingRate, bucketSeconds)
    : [];

  // Detect events from flow patterns (simplified event detection)
  const events = detectEventsFromFlow(combinedFlow, avgSamplingRate);

  // Leak data placeholder — real leak extraction requires parsing separate EDF channels
  const leak: import('./waveform-types').LeakPoint[] = [];

  const stats = computeFlowStats(flow, pressure, leak);

  return {
    dateStr: targetDate,
    durationSeconds: totalDuration,
    originalSampleRate: avgSamplingRate,
    flow,
    pressure,
    leak,
    events,
    stats,
  };
}

/**
 * Simple event detection from raw flow data.
 * Detects periods of reduced flow amplitude that may indicate flow limitation.
 * This is a lightweight detector — the main analysis engines provide the authoritative results.
 */
function detectEventsFromFlow(
  flow: Float32Array,
  sampleRate: number
): WaveformEvent[] {
  const events: WaveformEvent[] = [];
  const windowSamples = Math.round(sampleRate * 30); // 30-second windows
  const stepSamples = Math.round(sampleRate * 10); // 10-second step

  if (flow.length < windowSamples * 2) return events;

  // Compute baseline amplitude from first pass
  let baselineSum = 0;
  let baselineCount = 0;
  for (let i = 0; i < flow.length; i += stepSamples) {
    const end = Math.min(i + windowSamples, flow.length);
    let wMax = -Infinity;
    let wMin = Infinity;
    for (let j = i; j < end; j++) {
      if (flow[j] > wMax) wMax = flow[j];
      if (flow[j] < wMin) wMin = flow[j];
    }
    const amplitude = wMax - wMin;
    baselineSum += amplitude;
    baselineCount++;
  }
  const baselineAmplitude = baselineSum / baselineCount;

  // Second pass: find windows with significantly reduced amplitude
  let inEvent = false;
  let eventStart = 0;

  for (let i = 0; i < flow.length - windowSamples; i += stepSamples) {
    const end = i + windowSamples;
    let wMax = -Infinity;
    let wMin = Infinity;
    for (let j = i; j < end; j++) {
      if (flow[j] > wMax) wMax = flow[j];
      if (flow[j] < wMin) wMin = flow[j];
    }
    const amplitude = wMax - wMin;
    const isReduced = amplitude < baselineAmplitude * 0.5;

    if (isReduced && !inEvent) {
      inEvent = true;
      eventStart = i / sampleRate;
    } else if (!isReduced && inEvent) {
      inEvent = false;
      const eventEnd = i / sampleRate;
      const duration = eventEnd - eventStart;
      if (duration >= 10 && duration <= 120) {
        events.push({
          startSec: +eventStart.toFixed(0),
          endSec: +eventEnd.toFixed(0),
          type: 'flow-limitation',
          label: `Flow Limitation (${Math.round(duration)}s)`,
        });
      }
    }
  }

  return events;
}
