// ============================================================
// AirwayLab — Waveform Data Contribution
// Extracts flow data from raw EDF files, compresses with gzip,
// and uploads to the research dataset. Runs silently in the
// background — no UI feedback, failures logged to Sentry only.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import { parseEDF } from './parsers/edf-parser';
import { filterBRPFiles, groupByNight } from './parsers/night-grouper';
import { ENGINE_VERSION } from './engine-version';
import {
  getContributedWaveformDates,
  trackContributedWaveformDate,
  clearContributedWaveformDates,
  getContributedWaveformEngine,
  setContributedWaveformEngine,
  getFailedWaveformDates,
  trackFailedWaveformDate,
} from '@/components/upload/contribution-consent-utils';
import { buildWaveformBlob } from './waveform-blob';
import type { NightResult, EDFFile } from './types';

const MAX_COMPRESSED_BYTES = 5 * 1024 * 1024; // 5 MB per night

/**
 * Anonymise a NightResult for inclusion alongside waveform data.
 * Same shape as the existing contribute-data anonymisation.
 */
function anonymiseResults(n: NightResult) {
  return {
    glasgow: {
      overall: n.glasgow.overall,
      skew: n.glasgow.skew,
      spike: n.glasgow.spike,
      flatTop: n.glasgow.flatTop,
      topHeavy: n.glasgow.topHeavy,
      multiPeak: n.glasgow.multiPeak,
      noPause: n.glasgow.noPause,
      inspirRate: n.glasgow.inspirRate,
      multiBreath: n.glasgow.multiBreath,
      variableAmp: n.glasgow.variableAmp,
    },
    wat: {
      flScore: n.wat.flScore,
      regularityScore: n.wat.regularityScore,
      periodicityIndex: n.wat.periodicityIndex,
    },
    ned: {
      breathCount: n.ned.breathCount,
      nedMean: n.ned.nedMean,
      nedMedian: n.ned.nedMedian,
      nedP95: n.ned.nedP95,
      nedClearFLPct: n.ned.nedClearFLPct,
      nedBorderlinePct: n.ned.nedBorderlinePct,
      fiMean: n.ned.fiMean,
      fiFL85Pct: n.ned.fiFL85Pct,
      tpeakMean: n.ned.tpeakMean,
      mShapePct: n.ned.mShapePct,
      reraIndex: n.ned.reraIndex,
      reraCount: n.ned.reraCount,
      h1NedMean: n.ned.h1NedMean,
      h2NedMean: n.ned.h2NedMean,
      combinedFLPct: n.ned.combinedFLPct,
      estimatedArousalIndex: n.ned.estimatedArousalIndex,
      // Hypopnea (v0.7.0+)
      ...(n.ned.hypopneaCount !== undefined && { hypopneaCount: n.ned.hypopneaCount }),
      ...(n.ned.hypopneaIndex !== undefined && { hypopneaIndex: n.ned.hypopneaIndex }),
      ...(n.ned.hypopneaSource !== undefined && { hypopneaSource: n.ned.hypopneaSource }),
      ...(n.ned.hypopneaNedInvisibleCount !== undefined && { hypopneaNedInvisibleCount: n.ned.hypopneaNedInvisibleCount }),
      ...(n.ned.hypopneaNedInvisiblePct !== undefined && { hypopneaNedInvisiblePct: n.ned.hypopneaNedInvisiblePct }),
      ...(n.ned.hypopneaMeanDropPct !== undefined && { hypopneaMeanDropPct: n.ned.hypopneaMeanDropPct }),
      ...(n.ned.hypopneaMeanDurationS !== undefined && { hypopneaMeanDurationS: n.ned.hypopneaMeanDurationS }),
      ...(n.ned.hypopneaH1Index !== undefined && { hypopneaH1Index: n.ned.hypopneaH1Index }),
      ...(n.ned.hypopneaH2Index !== undefined && { hypopneaH2Index: n.ned.hypopneaH2Index }),
      // Brief obstruction (v0.7.0+)
      ...(n.ned.briefObstructionCount !== undefined && { briefObstructionCount: n.ned.briefObstructionCount }),
      ...(n.ned.briefObstructionIndex !== undefined && { briefObstructionIndex: n.ned.briefObstructionIndex }),
      ...(n.ned.briefObstructionH1Index !== undefined && { briefObstructionH1Index: n.ned.briefObstructionH1Index }),
      ...(n.ned.briefObstructionH2Index !== undefined && { briefObstructionH2Index: n.ned.briefObstructionH2Index }),
      // Amplitude stability (v0.7.0+)
      ...(n.ned.amplitudeCvOverall !== undefined && { amplitudeCvOverall: n.ned.amplitudeCvOverall }),
      ...(n.ned.amplitudeCvMedianEpoch !== undefined && { amplitudeCvMedianEpoch: n.ned.amplitudeCvMedianEpoch }),
      ...(n.ned.unstableEpochPct !== undefined && { unstableEpochPct: n.ned.unstableEpochPct }),
    },
    oximetry: n.oximetry
      ? {
          odi3: n.oximetry.odi3,
          odi4: n.oximetry.odi4,
          tBelow90: n.oximetry.tBelow90,
          tBelow94: n.oximetry.tBelow94,
          spo2Mean: n.oximetry.spo2Mean,
          spo2Min: n.oximetry.spo2Min,
          hrMean: n.oximetry.hrMean,
          hrSD: n.oximetry.hrSD,
          hrClin8: n.oximetry.hrClin8,
          hrClin10: n.oximetry.hrClin10,
          hrClin12: n.oximetry.hrClin12,
          hrClin15: n.oximetry.hrClin15,
          hrMean10: n.oximetry.hrMean10,
          hrMean15: n.oximetry.hrMean15,
          coupled3_6: n.oximetry.coupled3_6,
          coupled3_10: n.oximetry.coupled3_10,
          coupledHRRatio: n.oximetry.coupledHRRatio,
          h1: n.oximetry.h1,
          h2: n.oximetry.h2,
          totalSamples: n.oximetry.totalSamples,
          retainedSamples: n.oximetry.retainedSamples,
          doubleTrackingCorrected: n.oximetry.doubleTrackingCorrected,
        }
      : null,
    settingsMetrics: n.settingsMetrics ?? null,
  };
}

/**
 * Compress an ArrayBuffer using the browser-native CompressionStream API.
 * Falls back to raw binary if CompressionStream is unavailable.
 */
async function compressBuffer(
  buffer: ArrayBuffer
): Promise<{ data: ArrayBuffer; isCompressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { data: buffer, isCompressed: false };
  }

  try {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();

    // Write input
    writer.write(new Uint8Array(buffer));
    writer.close();

    // Read compressed output
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.byteLength;
    }

    // Concatenate chunks
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { data: result.buffer, isCompressed: true };
  } catch (err) {
    console.error('[contribute-waveforms] Compression failed, falling back to raw:', err);
    return { data: buffer, isCompressed: false };
  }
}

/**
 * Extract flow data for a specific night from raw SD card files.
 * Re-parses the relevant BRP.edf files — lightweight since no engine
 * computation is performed. Returns null if no data found.
 */
async function extractFlowForNight(
  files: File[],
  nightDate: string
): Promise<{
  flowBuffer: ArrayBuffer;
  pressureBuffer: ArrayBuffer | null;
  samplingRate: number;
  sampleCount: number;
  durationSeconds: number;
} | null> {
  // Build file list for BRP filtering
  const fileList = files.map((f) => ({
    name:
      (f as unknown as { webkitRelativePath?: string }).webkitRelativePath?.split('/').pop() ||
      f.name,
    path: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
    size: f.size,
  }));

  const brpFiles = filterBRPFiles(fileList);

  // Parse BRP files
  const parsedEdfs: EDFFile[] = [];
  for (const brp of brpFiles) {
    const fileData = files.find((f) => {
      const path =
        (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
      return path === brp.path;
    });
    if (!fileData) continue;
    try {
      const buffer = await fileData.arrayBuffer();
      const edf = parseEDF(buffer, brp.path);
      parsedEdfs.push(edf);
    } catch {
      // Skip unparseable files
    }
  }

  if (parsedEdfs.length === 0) return null;

  // Group by night and find matching night
  const nightGroups = groupByNight(parsedEdfs);
  const group = nightGroups.find((g) => g.nightDate === nightDate);
  if (!group || group.sessions.length === 0) return null;

  // Concatenate flow data from all sessions
  const totalSamples = group.sessions.reduce((sum, s) => sum + s.flowData.length, 0);
  const combinedFlow = new Float32Array(totalSamples);
  let offset = 0;
  let totalSamplingRate = 0;
  let totalDuration = 0;

  // Check if all sessions have pressure data with matching length
  const allHavePressure = group.sessions.every(
    (s) => s.pressureData !== null && s.pressureData.length === s.flowData.length
  );
  const combinedPressure = allHavePressure ? new Float32Array(totalSamples) : null;

  for (const session of group.sessions) {
    combinedFlow.set(session.flowData, offset);
    if (combinedPressure && session.pressureData) {
      combinedPressure.set(session.pressureData, offset);
    }
    offset += session.flowData.length;
    totalSamplingRate += session.samplingRate;
    totalDuration += session.durationSeconds;
  }

  const avgSamplingRate = totalSamplingRate / group.sessions.length;

  return {
    flowBuffer: combinedFlow.buffer,
    pressureBuffer: combinedPressure ? combinedPressure.buffer : null,
    samplingRate: avgSamplingRate,
    sampleCount: totalSamples,
    durationSeconds: totalDuration,
  };
}

/**
 * Upload a single night's waveform data to the research dataset.
 */
async function uploadWaveform(
  night: NightResult,
  compressedData: ArrayBuffer,
  isCompressed: boolean,
  samplingRate: number,
  sampleCount: number,
  durationSeconds: number,
  contributionId: string,
  channelCount: number,
  hasPressure: boolean
): Promise<{ ok: boolean; status?: number; detail?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Night-Date': night.dateStr,
      'X-Contribution-Id': contributionId,
      'X-Engine-Version': ENGINE_VERSION,
      'X-Sampling-Rate': String(samplingRate),
      'X-Duration-Seconds': String(Math.round(durationSeconds * 100) / 100),
      'X-Sample-Count': String(sampleCount),
      'X-Device-Model': night.settings.deviceModel || 'Unknown',
      'X-Pap-Mode': night.settings.papMode || 'Unknown',
      'X-Analysis-Results': JSON.stringify(anonymiseResults(night)),
      'X-Channel-Count': String(channelCount),
      'X-Format-Version': '2',
      'X-Has-Pressure': String(hasPressure),
    };

    if (isCompressed) {
      headers['Content-Encoding'] = 'gzip';
    }

    const res = await fetch('/api/contribute-waveforms', {
      method: 'POST',
      headers,
      body: compressedData,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, status: res.status, detail: body.slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }
}

/**
 * Contribute waveform data for all new nights in the background.
 * Fire-and-forget — no UI feedback. Failures logged to Sentry.
 *
 * @param nights - Analysis results for the current session
 * @param sdFiles - Raw SD card File objects (for re-parsing EDF flow data)
 * @param contributionId - Shared ID linking to metrics contribution
 */
export async function contributeWaveformsBackground(
  nights: NightResult[],
  sdFiles: File[],
  contributionId: string
): Promise<void> {
  if (sdFiles.length === 0 || nights.length === 0) return;

  // Check if engine version changed since last contribution
  const lastEngine = getContributedWaveformEngine();
  if (lastEngine !== null && lastEngine !== ENGINE_VERSION) {
    clearContributedWaveformDates();
  }

  // Filter to only new nights (skip already contributed and recently failed)
  const contributedDates = getContributedWaveformDates();
  const failedDates = getFailedWaveformDates();
  const newNights = nights.filter(
    (n) => !contributedDates.has(n.dateStr) && !failedDates.has(n.dateStr)
  );
  if (newNights.length === 0) return;

  // Process and upload one night at a time to keep memory low
  for (const night of newNights) {
    try {
      // Extract flow + pressure data by re-parsing EDF files for this night
      const extractedData = await extractFlowForNight(sdFiles, night.dateStr);
      if (!extractedData) continue;

      // Build AWL2 blob (with pressure if available)
      const flowArray = new Float32Array(extractedData.flowBuffer);
      const pressureArray = extractedData.pressureBuffer
        ? new Float32Array(extractedData.pressureBuffer)
        : null;

      let waveformBlob = buildWaveformBlob(flowArray, pressureArray);
      let channelCount = pressureArray && pressureArray.length === flowArray.length ? 2 : 1;
      let hasPressure = channelCount === 2;

      // Compress
      let { data: compressed, isCompressed } = await compressBuffer(waveformBlob);

      // Size fallback: if flow+pressure exceeds limit, retry flow-only
      if (compressed.byteLength > MAX_COMPRESSED_BYTES && hasPressure) {
        Sentry.addBreadcrumb({
          message: `Waveform ${night.dateStr}: flow+pressure ${(compressed.byteLength / 1024 / 1024).toFixed(1)} MB exceeds limit, falling back to flow-only`,
          category: 'waveform-contribution',
          level: 'info',
        });
        waveformBlob = buildWaveformBlob(flowArray, null);
        channelCount = 1;
        hasPressure = false;
        const fallback = await compressBuffer(waveformBlob);
        compressed = fallback.data;
        isCompressed = fallback.isCompressed;
      }

      // Check size limit (final)
      if (compressed.byteLength > MAX_COMPRESSED_BYTES) {
        console.error(
          `[contribute-waveforms] Night ${night.dateStr} exceeds 5 MB limit (${(compressed.byteLength / 1024 / 1024).toFixed(1)} MB), skipping`
        );
        Sentry.captureMessage(
          `Waveform contribution skipped: ${night.dateStr} exceeds 5 MB`,
          { level: 'warning', tags: { feature: 'waveform-contribution' } }
        );
        continue;
      }

      Sentry.addBreadcrumb({
        message: `Waveform ${night.dateStr}: ${channelCount} channel(s), pressure=${hasPressure}`,
        category: 'waveform-contribution',
        level: 'info',
      });

      // Upload
      const result = await uploadWaveform(
        night,
        compressed,
        isCompressed,
        extractedData.samplingRate,
        extractedData.sampleCount,
        extractedData.durationSeconds,
        contributionId,
        channelCount,
        hasPressure
      );

      if (result.ok) {
        trackContributedWaveformDate(night.dateStr);
      } else {
        trackFailedWaveformDate(night.dateStr);
        Sentry.captureMessage(
          `Waveform upload failed for ${night.dateStr}`,
          {
            level: 'warning',
            tags: { feature: 'waveform-contribution', status: String(result.status ?? 'unknown') },
            extra: { detail: result.detail },
          }
        );
      }
    } catch (err) {
      trackFailedWaveformDate(night.dateStr);
      Sentry.captureException(err, {
        tags: { feature: 'waveform-contribution', nightDate: night.dateStr },
      });
    }
  }

  // Record engine version after successful contribution pass
  setContributedWaveformEngine(ENGINE_VERSION);
}
