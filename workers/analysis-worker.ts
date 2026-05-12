// ============================================================
// AirwayLab — Analysis Web Worker
// Receives file buffers, runs all engines per night, posts progress
// ============================================================

import { parseEDF } from '../lib/parsers/edf-parser';
import { groupByNight, filterBRPFiles, filterSA2Files, filterEVEFiles, filterCSLFiles, filterPLDFiles, findSTRFile, findIdentificationFile, extractFolderDate, extractPLDFilenameDate } from '../lib/parsers/night-grouper';
import { parsePLD, computePLDSummary } from '../lib/parsers/pld-parser';
import { parseSA2 } from '../lib/parsers/sa2-parser';
import { extractSettings, parseIdentification, getSettingsForDate, getSTRSignalLabels } from '../lib/parsers/settings-extractor';
import { extractMachineSummary } from '../lib/parsers/machine-summary-extractor';
import { computeFingerprint } from '../lib/settings-fingerprint';
import { parseOximetryCSV } from '../lib/parsers/oximetry-csv-parser';
import { parseEVE } from '../lib/parsers/eve-parser';
import { parseCSL } from '../lib/parsers/csl-parser';
import { parseBMCFiles, bmcSessionNightDate } from '../lib/parsers/bmc-parser';
import { computeNightGlasgow } from '../lib/analyzers/glasgow-index';
import { computeWAT } from '../lib/analyzers/wat-engine';
import { computeNED } from '../lib/analyzers/ned-engine';
import { computeOximetry } from '../lib/analyzers/oximetry-engine';
import { computeSettingsMetrics } from '../lib/analyzers/settings-engine';
import { computeCrossDevice } from '../lib/analyzers/cross-device-engine';
import { buildOximetryTrace } from '../lib/oximetry-trace';
import { computeSpontaneousPct } from '../lib/bilevel-metrics';
import type {
  WorkerMessage,
  WorkerProgress,
  WorkerResult,
  WorkerNightResult,
  WorkerOximetryResult,
  WorkerError,
  WorkerWarning,
  WorkerSettingsDiagnostic,
  NightResult,
  EDFFile,
  ParsedSession,
  MachineSettings,
  MachineHypopneaSummary,
  OximetryResults,
  OximetryTraceData,
  CrossDeviceResults,
  CSLData,
  PLDSummary,
} from '../lib/types';

/** Strip per-breath and trace arrays before postMessage to prevent OOM on large datasets. */
function stripNightBulkData(night: NightResult): NightResult {
  return {
    ...night,
    ned: { ...night.ned, breaths: [] },
    oximetryTrace: null,
  };
}

// Global error handler — catches uncaught errors and sends them as
// WorkerError messages instead of silently triggering onerror on main thread
self.addEventListener('error', (e: ErrorEvent) => {
  e.preventDefault();
  const detail = [e.message, e.filename && `at ${e.filename}:${e.lineno}:${e.colno}`]
    .filter(Boolean)
    .join(' ') || 'Unknown worker error';
  const response: WorkerError = { type: 'ERROR', error: detail };
  self.postMessage(response);
});

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    if (e.data.type === 'ANALYZE_OXIMETRY') {
      const { metrics, traces } = processOximetryOnly(e.data.oximetryCSVs);
      const response: WorkerOximetryResult = { type: 'OXIMETRY_RESULTS', oximetryByDate: metrics, oximetryTraceByDate: traces };
      self.postMessage(response);
    } else {
      const { files, oximetryCSVs, deviceType } = e.data;
      const bmcSerial = (e.data as unknown as { bmcSerial?: string }).bmcSerial;
      const results = await processFiles(files, oximetryCSVs, deviceType, bmcSerial);
      const response: WorkerResult = { type: 'RESULTS', nights: results.map(stripNightBulkData) };
      self.postMessage(response);
    }
  } catch (err) {
    const response: WorkerError = {
      type: 'ERROR',
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

function postProgress(current: number, total: number, stage: string): void {
  const msg: WorkerProgress = { type: 'PROGRESS', current, total, stage };
  self.postMessage(msg);
}

/**
 * Yield control back to the event loop so the worker thread
 * doesn't starve the browser of message processing.
 * Called between batches of CPU-intensive work.
 */
function yieldControl(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** How many EDF files to parse before yielding */
const PARSE_BATCH_SIZE = 25;
/** How many nights to analyze before yielding */
const ANALYZE_BATCH_SIZE = 10;

async function processFiles(
  files: { buffer: ArrayBuffer; path: string }[],
  oximetryCSVs?: string[],
  deviceType?: string,
  bmcSerial?: string
): Promise<NightResult[]> {
  // ── BMC device path ──────────────────────────────────────
  if (deviceType === 'bmc' && bmcSerial) {
    return processBMCFiles(files, bmcSerial, oximetryCSVs);
  }

  // ── ResMed (default) path ────────────────────────────────
  // Step 1: Identify file types
  const fileList = files.map((f) => ({
    name: f.path.split('/').pop() || '',
    path: f.path,
    size: f.buffer.byteLength,
  }));

  const brpFiles = filterBRPFiles(fileList);
  const strFileInfo = findSTRFile(fileList);
  const idFileInfo = findIdentificationFile(fileList);

  postProgress(0, brpFiles.length + 2, 'Parsing settings...');

  // Step 2: Extract machine settings from STR.edf
  let dailySettings: Record<string, MachineSettings> = {};
  let deviceModel = 'Unknown';

  let identificationText: string | null = null;
  if (idFileInfo) {
    const idFile = files.find((f) => f.path.endsWith(idFileInfo.name));
    if (idFile) {
      const decoder = new TextDecoder('utf-8');
      identificationText = decoder.decode(idFile.buffer);
      deviceModel = parseIdentification(identificationText);
    }
  }

  let strSignalLabels: string[] = [];
  let dailySummary: Record<string, import('../lib/types').MachineSummaryStats> = {};
  if (strFileInfo) {
    const strFile = files.find((f) => f.path.toLowerCase().endsWith('str.edf'));
    if (strFile) {
      try {
        dailySettings = extractSettings(strFile.buffer, deviceModel);
      } catch {
        // STR parsing failed — continue without settings
      }
      try {
        dailySummary = extractMachineSummary(strFile.buffer, deviceModel);
      } catch {
        // Machine summary extraction failed — continue without summary
      }
      // Capture signal labels for diagnostics when extraction returns empty
      if (Object.keys(dailySettings).length === 0) {
        strSignalLabels = getSTRSignalLabels(strFile.buffer);
      }
    }
  }

  // Post diagnostic when settings extraction failed
  if (Object.keys(dailySettings).length === 0) {
    const diag: WorkerSettingsDiagnostic = {
      type: 'SETTINGS_DIAGNOSTIC',
      deviceModel,
      signalLabels: strSignalLabels,
      identificationText: identificationText ? identificationText.slice(0, 2000) : null,
      hasStrFile: !!strFileInfo,
    };
    self.postMessage(diag);
  }

  postProgress(1, brpFiles.length + 2, 'Parsing EDF files...');

  // Step 3: Parse BRP.edf files in batches, yielding between batches
  // to prevent the worker from locking up the browser on large SD cards
  const parsedEdfs: EDFFile[] = [];
  for (let i = 0; i < brpFiles.length; i++) {
    const brp = brpFiles[i]!;
    const fileData = files.find((f) => f.path === brp.path);
    if (!fileData) continue;
    try {
      const edf = parseEDF(fileData.buffer, fileData.path);
      parsedEdfs.push(edf);
      // Report truncated files as warnings (file was partially parsed, not an error)
      if (edf.truncated) {
        const filename = brp.path.split('/').pop() || brp.path;
        const truncWarning: WorkerWarning = {
          type: 'WARNING',
          checkpoint: 'truncated_edf',
          detail: `Truncated EDF file ${filename}: parsed ${edf.recordsParsed} of ${edf.recordsExpected} records`,
          tags: { file: filename, records_parsed: String(edf.recordsParsed ?? 0), records_expected: String(edf.recordsExpected ?? 0) },
        };
        self.postMessage(truncWarning);
      }
    } catch (err) {
      const filename = brp.path.split('/').pop() || brp.path;
      const detail = err instanceof Error ? err.message : String(err);
      const warning: WorkerWarning = {
        type: 'WARNING',
        checkpoint: 'parse_file_failed',
        detail: `Failed to parse ${filename}: ${detail}`,
        tags: { file: filename, error: detail },
      };
      self.postMessage(warning);
    }

    // Yield every PARSE_BATCH_SIZE files and report progress
    if ((i + 1) % PARSE_BATCH_SIZE === 0) {
      postProgress(1, brpFiles.length + 2, `Parsing EDF files (${i + 1}/${brpFiles.length})...`);
      await yieldControl();
    }
  }

  if (parsedEdfs.length === 0) {
    if (brpFiles.length === 0) {
      throw new Error('No flow data files (BRP.edf) found in the uploaded data. Make sure you selected the SD card itself, not a subfolder.');
    }
    throw new Error(`Found ${brpFiles.length} flow data file(s) but none could be parsed. The files may be corrupted or in an unsupported format.`);
  }

  // Step 3.5: Parse EVE.edf files and group events by night date
  const eveFileInfos = filterEVEFiles(fileList);
  const eveEventsByDate = new Map<string, MachineHypopneaSummary[]>();
  const eveReraCountByDate = new Map<string, number>();
  for (let idx = 0; idx < eveFileInfos.length; idx++) {
    const eveInfo = eveFileInfos[idx]!;
    const fileData = files.find((f) => f.path === eveInfo.path);
    if (fileData) {
      try {
        const events = parseEVE(fileData.buffer);
        const nightDate = extractFolderDate(eveInfo.path);
        if (nightDate) {
          const hypopneas = events
            .filter((e) => e.type === 'hypopnea')
            .map((e) => ({ onsetSec: e.onsetSec, durationSec: e.durationSec }));
          if (hypopneas.length > 0) {
            const existing = eveEventsByDate.get(nightDate) ?? [];
            existing.push(...hypopneas);
            eveEventsByDate.set(nightDate, existing);
          }
          const reraCount = events.filter((e) => e.type === 'rera').length;
          if (reraCount > 0) {
            eveReraCountByDate.set(nightDate, (eveReraCountByDate.get(nightDate) ?? 0) + reraCount);
          }
        }
      } catch (err) {
        const filename = eveInfo.path.split('/').pop() || eveInfo.path;
        const detail = err instanceof Error ? err.message : String(err);
        const warning: WorkerWarning = {
          type: 'WARNING',
          checkpoint: 'parse_file_failed',
          detail: `Failed to parse ${filename}: ${detail}`,
          tags: { file: filename, error: detail },
        };
        self.postMessage(warning);
      }
    }

    if ((idx + 1) % PARSE_BATCH_SIZE === 0) {
      postProgress(1, brpFiles.length + 2, `Parsing event files (${idx + 1}/${eveFileInfos.length})...`);
      await yieldControl();
    }
  }

  // Step 3.6: Parse CSL.edf files and group CSR data by night date
  const cslFileInfos = filterCSLFiles(fileList);
  const cslDataByDate = new Map<string, CSLData>();
  for (let idx = 0; idx < cslFileInfos.length; idx++) {
    const cslInfo = cslFileInfos[idx]!;
    const fileData = files.find((f) => f.path === cslInfo.path);
    if (fileData) {
      try {
        const cslData = parseCSL(fileData.buffer);
        const nightDate = extractFolderDate(cslInfo.path);
        if (nightDate && cslData) {
          // Multiple CSL files per night: merge episodes
          const existing = cslDataByDate.get(nightDate);
          if (existing) {
            existing.episodes.push(...cslData.episodes);
            existing.totalCSRSeconds += cslData.totalCSRSeconds;
            existing.episodeCount += cslData.episodeCount;
            // csrPercentage will be recalculated below since it depends on total recording duration
          } else {
            cslDataByDate.set(nightDate, cslData);
          }
        }
      } catch (err) {
        const filename = cslInfo.path.split('/').pop() || cslInfo.path;
        const detail = err instanceof Error ? err.message : String(err);
        const warning: WorkerWarning = {
          type: 'WARNING',
          checkpoint: 'parse_file_failed',
          detail: `Failed to parse ${filename}: ${detail}`,
          tags: { file: filename, error: detail },
        };
        self.postMessage(warning);
      }
    }

    if ((idx + 1) % PARSE_BATCH_SIZE === 0) {
      postProgress(1, brpFiles.length + 2, `Parsing CSR files (${idx + 1}/${cslFileInfos.length})...`);
      await yieldControl();
    }
  }

  // Step 3.7: Parse PLD.edf files and compute summaries immediately per file.
  // Raw PLDData (Float32Arrays) is discarded right after computePLDSummary to
  // avoid holding ~0.8MB per file × 499 files in the worker heap simultaneously.
  const pldFiles = filterPLDFiles(fileList);
  const pldSummaryByDate = new Map<string, PLDSummary>();
  for (let i = 0; i < pldFiles.length; i++) {
    const pldInfo = pldFiles[i]!;
    const fileData = files.find((f) => f.path === pldInfo.path);
    if (!fileData) continue;
    try {
      const pld = parsePLD(fileData.buffer, fileData.path);
      if (!pld) continue;
      // Determine night date from folder path or filename
      const nightDate = extractFolderDate(pldInfo.path) ?? extractPLDFilenameDate(pldInfo.path);
      if (!nightDate) continue;
      // Compute summary immediately — raw Float32Arrays are released after this call
      const summary = computePLDSummary(pld);
      // Keep the longest-duration summary per night date
      const existing = pldSummaryByDate.get(nightDate);
      if (!existing || summary.durationSeconds > existing.durationSeconds) {
        pldSummaryByDate.set(nightDate, summary);
      }
    } catch (err) {
      const filename = pldInfo.path.split('/').pop() || pldInfo.path;
      const detail = err instanceof Error ? err.message : String(err);
      const warning: WorkerWarning = {
        type: 'WARNING',
        checkpoint: 'parse_file_failed',
        detail: `Failed to parse PLD ${filename}: ${detail}`,
        tags: { file: filename, error: detail },
      };
      self.postMessage(warning);
    }

    // Yield every PARSE_BATCH_SIZE PLD files to allow GC to reclaim memory
    if ((i + 1) % PARSE_BATCH_SIZE === 0) {
      postProgress(1, brpFiles.length + 2, `Parsing PLD files (${i + 1}/${pldFiles.length})...`);
      await yieldControl();
    }
  }

  // Step 4: Group by night
  const parsedCount = parsedEdfs.length; // capture before releasing the array
  const nightGroups = groupByNight(parsedEdfs);
  // EDFFile objects are now owned by nightGroups; drop the flat array so its
  // slot references don't prevent GC while the analysis loop runs.
  parsedEdfs.length = 0;

  // Checkpoint: EDFs parsed but no nights formed
  if (nightGroups.length === 0 && parsedCount > 0) {
    const warning: WorkerWarning = {
      type: 'WARNING',
      checkpoint: 'analysis_zero_nights',
      detail: `Parsed ${parsedCount} EDF files but formed 0 valid nights`,
      tags: { file_count: brpFiles.length, parsed_count: parsedCount },
    };
    self.postMessage(warning);
  }

  postProgress(2, nightGroups.length + 2, 'Analyzing nights...');

  // Step 4.5: Parse SA2 EDF oximetry files (integrated/paired pulse oximeter)
  const oximetryByDate = new Map<string, ReturnType<typeof parseOximetryCSV>>();
  const sa2Files = filterSA2Files(fileList);
  if (sa2Files.length > 0) {
    for (const sa2Info of sa2Files) {
      const fileData = files.find((f) => f.path === sa2Info.path);
      if (!fileData) continue;
      try {
        const parsed = parseSA2(fileData.buffer, fileData.path);
        const filename = sa2Info.path.split('/').pop() || sa2Info.path;

        // Multiple SA2 files per night: concatenate samples
        const existing = oximetryByDate.get(parsed.dateStr);
        if (existing) {
          existing.samples.push(...parsed.samples);
          existing.samples.sort((a, b) => a.time.getTime() - b.time.getTime());
          existing.endTime = existing.samples[existing.samples.length - 1]!.time;
          existing.durationSeconds = (existing.endTime.getTime() - existing.startTime.getTime()) / 1000;
        } else {
          oximetryByDate.set(parsed.dateStr, parsed);
        }

        console.debug(`[sa2] Parsed ${parsed.samples.length} samples from ${filename} for night ${parsed.dateStr}`);
      } catch (err) {
        const filename = sa2Info.path.split('/').pop() || sa2Info.path;
        console.error(`[sa2] Failed to parse ${filename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Step 5: Parse oximetry CSVs (SA2 takes priority — skip CSV if SA2 already present)
  if (oximetryCSVs) {
    for (const csv of oximetryCSVs) {
      try {
        const parsed = parseOximetryCSV(csv);
        if (oximetryByDate.has(parsed.dateStr)) {
          console.debug(`[oximetry] SA2 data available for night ${parsed.dateStr}, skipping CSV`);
        } else {
          oximetryByDate.set(parsed.dateStr, parsed);
        }
      // eslint-disable-next-line airwaylab/no-silent-catch -- Individual CSV parse failures are non-fatal; worker continues processing remaining files and reports results via postMessage.
      } catch (err) {
        console.error('[oximetry] Failed to parse CSV:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Log oximetry matching diagnostics
  if (oximetryCSVs && oximetryCSVs.length > 0) {
    const oxDates = Array.from(oximetryByDate.keys());
    const nightDates = nightGroups.map((g) => g.nightDate);
    const matched = oxDates.filter((d) => nightDates.includes(d));
    if (matched.length === 0) {
      console.error(`[oximetry] No date matches. Oximetry dates: [${oxDates.join(', ')}], Night dates: [${nightDates.slice(0, 5).join(', ')}${nightDates.length > 5 ? '...' : ''}]`);
    } else {
      console.debug(`[oximetry] Matched ${matched.length}/${oxDates.length} oximetry files to nights`);
    }
  }

  // Step 6: Run all engines per night, yielding periodically
  const nights: NightResult[] = [];

  for (let i = 0; i < nightGroups.length; i++) {
    const group = nightGroups[i]!;
    postProgress(i + 3, nightGroups.length + 2, `Analyzing night ${group.nightDate}...`);

    // Yield every ANALYZE_BATCH_SIZE nights to keep the worker responsive
    if (i > 0 && i % ANALYZE_BATCH_SIZE === 0) {
      await yieldControl();
    }

    // Get settings for this night
    const settings = getSettingsForDate(dailySettings, group.nightDate) ?? {
      deviceModel,
      epap: 0,
      ipap: 0,
      pressureSupport: 0,
      papMode: 'Unknown',
      riseTime: null,
      trigger: 'N/A',
      cycle: 'N/A',
      easyBreathe: false,
      settingsSource: 'unavailable' as const,
    };

    // Compute total duration
    let totalDuration = 0;
    for (const session of group.sessions) {
      totalDuration += session.durationSeconds;
    }

    // Glasgow Index (duration-weighted across sessions)
    const glasgow = computeNightGlasgow(group.sessions);

    // Bilevel breath classification (Spontaneous/Timed%). AirCurve 10/11 BRP files carry
    // respEventData (TrigCycEvt channel). CPAP/APAP files have null — computeSpontaneousPct
    // returns null when no classified breaths are found.
    const totalRespEventSamples = group.sessions.reduce(
      (sum, s) => sum + (s.respEventData?.length ?? 0),
      0
    );
    let bilevelMetrics: { spontaneousPct: number; timedPct: number } | null = null;
    if (totalRespEventSamples > 0) {
      const combinedRespEvent = new Float32Array(totalRespEventSamples);
      let respEventOffset = 0;
      for (const session of group.sessions) {
        if (session.respEventData) {
          combinedRespEvent.set(session.respEventData, respEventOffset);
          respEventOffset += session.respEventData.length;
        }
      }
      bilevelMetrics = computeSpontaneousPct(combinedRespEvent);
    }

    // WAT + NED + Settings: concatenate flow and pressure data from all sessions
    const totalFlowSamples = group.sessions.reduce(
      (sum, s) => sum + s.flowData.length,
      0
    );
    const totalPressSamples = group.sessions.reduce(
      (sum, s) => sum + (s.pressureData?.length ?? 0),
      0
    );
    const combinedFlow = new Float32Array(totalFlowSamples);
    const combinedPressure = totalPressSamples > 0
      ? new Float32Array(totalPressSamples)
      : null;
    let flowOffset = 0;
    let pressOffset = 0;
    let avgSamplingRate = 0;
    for (const session of group.sessions) {
      combinedFlow.set(session.flowData, flowOffset);
      flowOffset += session.flowData.length;
      if (combinedPressure && session.pressureData) {
        combinedPressure.set(session.pressureData, pressOffset);
        pressOffset += session.pressureData.length;
      }
      avgSamplingRate += session.samplingRate;
    }
    avgSamplingRate /= group.sessions.length;

    // Release raw Float32Arrays from each session now that data is in combinedFlow/combinedPressure.
    // This allows the GC to reclaim per-session heap memory while remaining nights are analysed.
    for (const session of group.sessions) {
      session.flowData = new Float32Array(0);
      session.pressureData = null;
    }

    const wat = computeWAT(combinedFlow, avgSamplingRate);

    // Machine hypopnea events for this night (from EVE.edf)
    const machineHypopneas = eveEventsByDate.get(group.nightDate);
    const ned = computeNED(combinedFlow, avgSamplingRate, machineHypopneas);

    // Machine RERA events (from EVE.edf) — count and index
    const machineReraCount = eveReraCountByDate.get(group.nightDate) ?? 0;
    if (machineReraCount > 0) {
      ned.machineReraCount = machineReraCount;
      ned.machineReraIndex = totalDuration > 0
        ? Math.round((machineReraCount / (totalDuration / 3600)) * 100) / 100
        : 0;
    }

    // Recording date from first session
    const recordingDate = group.sessions[0]!.recordingDate;

    // Settings validation (BiPAP only — requires pressure data)
    const settingsMetricsResult = combinedPressure
      ? computeSettingsMetrics(combinedFlow, combinedPressure, avgSamplingRate)
      : null;

    // Oximetry: match by night date
    const oxData = oximetryByDate.get(group.nightDate);
    const oxInterval = oxData?.intervalSeconds ?? 2;
    const oximetry = oxData ? computeOximetry(oxData.samples, oxInterval) : null;
    const oximetryTrace = oxData ? buildOximetryTrace(oxData.samples) : null;

    // Cross-device RERA-arousal matching
    let crossDevice: CrossDeviceResults | null = null;
    if (oximetry && oxData && ned.reras && ned.reras.length >= 10) {
      crossDevice = computeCrossDevice(
        ned.reras,
        oxData.samples,
        oxInterval,
        totalDuration,
        ned.reraIndex,
        oximetry.hrClin10
      );
    }

    // CSL (Cheyne-Stokes) data for this night
    const cslRaw = cslDataByDate.get(group.nightDate) ?? null;
    // Recalculate CSR percentage using total night duration if merged from multiple CSL files
    const csl: CSLData | null = cslRaw ? {
      ...cslRaw,
      csrPercentage: totalDuration > 0
        ? Math.round((cslRaw.totalCSRSeconds / totalDuration) * 100 * 100) / 100
        : 0,
    } : null;

    // PLD summary: already computed and keyed by night date during parsing
    const pldSummary: PLDSummary | null = pldSummaryByDate.get(group.nightDate) ?? null;

    nights.push({
      date: recordingDate,
      dateStr: group.nightDate,
      durationHours: totalDuration / 3600,
      sessionCount: group.sessions.length,
      sessionStartTime: recordingDate,
      settings,
      glasgow,
      wat,
      ned,
      oximetry,
      oximetryTrace,
      settingsMetrics: settingsMetricsResult,
      crossDevice,
      machineSummary: dailySummary[group.nightDate] ?? null,
      settingsFingerprint: computeFingerprint(settings),
      csl,
      pldSummary,
      spontaneousPct: bilevelMetrics?.spontaneousPct ?? null,
      timedPct: bilevelMetrics?.timedPct ?? null,
    });

    // Emit incremental result so the orchestrator can persist progress
    const nightMsg: WorkerNightResult = {
      type: 'NIGHT_RESULT',
      night: nights[nights.length - 1]!,
      nightIndex: i,
      totalNights: nightGroups.length,
    };
    self.postMessage(nightMsg);
  }

  // Checkpoint: nights analysed but all results empty
  if (nights.length === 0 && nightGroups.length > 0) {
    const warning: WorkerWarning = {
      type: 'WARNING',
      checkpoint: 'analysis_zero_results',
      detail: `Analysed ${nightGroups.length} nights but produced 0 results`,
      tags: { night_count: nightGroups.length },
    };
    self.postMessage(warning);
  }

  // Sort by date (most recent first)
  nights.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return nights;
}

// ── BMC processing pipeline ─────────────────────────────────
async function processBMCFiles(
  files: { buffer: ArrayBuffer; path: string }[],
  serial: string,
  oximetryCSVs?: string[]
): Promise<NightResult[]> {
  postProgress(0, 4, 'Detecting BMC device...');

  const { sessions, settings, device } = parseBMCFiles(files, serial);

  if (sessions.length === 0) {
    throw new Error('No therapy sessions found in BMC data files. Make sure you selected the SD card itself, not a subfolder.');
  }

  postProgress(1, 4, `Parsed ${sessions.length} session(s) from ${device.model}...`);

  // Group sessions by night date (noon-to-noon)
  const nightMap = new Map<string, ParsedSession[]>();
  for (const session of sessions) {
    const nightDate = bmcSessionNightDate(session.recordingDate);
    const list = nightMap.get(nightDate) ?? [];
    list.push(session);
    nightMap.set(nightDate, list);
  }

  // Parse oximetry CSVs
  const oximetryByDate = new Map<string, ReturnType<typeof parseOximetryCSV>>();
  if (oximetryCSVs) {
    for (const csv of oximetryCSVs) {
      try {
        const parsed = parseOximetryCSV(csv);
        oximetryByDate.set(parsed.dateStr, parsed);
      // eslint-disable-next-line airwaylab/no-silent-catch -- Individual CSV parse failures are non-fatal; loop continues. Results reported via postMessage.
      } catch (err) {
        console.error('[oximetry] Failed to parse CSV:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  postProgress(2, 4, 'Running analysis engines...');

  // Run engines per night (same flow as ResMed)
  const nights: NightResult[] = [];
  const nightDates = Array.from(nightMap.keys()).sort();

  for (let i = 0; i < nightDates.length; i++) {
    const nightDate = nightDates[i]!;
    const nightSessions = nightMap.get(nightDate)!;

    if (i > 0 && i % ANALYZE_BATCH_SIZE === 0) {
      await yieldControl();
    }

    // Get settings for this night
    const nightSettings = settings[nightDate] ?? {
      deviceModel: `${device.model} (${device.serial})`,
      epap: 0, ipap: 0, pressureSupport: 0,
      papMode: 'Unknown', riseTime: null,
      trigger: 'N/A', cycle: 'N/A', easyBreathe: false,
      settingsSource: 'unavailable' as const,
    };

    // Total duration
    let totalDuration = 0;
    for (const s of nightSessions) totalDuration += s.durationSeconds;

    // Glasgow Index
    const glasgow = computeNightGlasgow(nightSessions);

    // Concatenate flow/pressure for WAT + NED
    const totalFlowSamples = nightSessions.reduce((sum, s) => sum + s.flowData.length, 0);
    const totalPressSamples = nightSessions.reduce((sum, s) => sum + (s.pressureData?.length ?? 0), 0);
    const combinedFlow = new Float32Array(totalFlowSamples);
    const combinedPressure = totalPressSamples > 0 ? new Float32Array(totalPressSamples) : null;
    let flowOffset = 0;
    let pressOffset = 0;
    let avgSamplingRate = 0;
    for (const s of nightSessions) {
      combinedFlow.set(s.flowData, flowOffset);
      flowOffset += s.flowData.length;
      if (combinedPressure && s.pressureData) {
        combinedPressure.set(s.pressureData, pressOffset);
        pressOffset += s.pressureData.length;
      }
      avgSamplingRate += s.samplingRate;
    }
    avgSamplingRate /= nightSessions.length;

    // Release raw Float32Arrays from each session now that data is in combinedFlow/combinedPressure.
    for (const s of nightSessions) {
      s.flowData = new Float32Array(0);
      s.pressureData = null;
    }

    const wat = computeWAT(combinedFlow, avgSamplingRate);

    // Machine events from BMC EVT as hypopnea summaries
    const machineHypopneas: MachineHypopneaSummary[] = [];
    for (const s of nightSessions) {
      if (s.machineEvents) {
        for (const e of s.machineEvents) {
          if (e.type === 'HYP') {
            machineHypopneas.push({ onsetSec: e.onsetSec, durationSec: e.durationSec });
          }
        }
      }
    }

    const ned = computeNED(combinedFlow, avgSamplingRate, machineHypopneas.length > 0 ? machineHypopneas : undefined);

    const recordingDate = nightSessions[0]!.recordingDate;

    const settingsMetricsResult = combinedPressure
      ? computeSettingsMetrics(combinedFlow, combinedPressure, avgSamplingRate)
      : null;

    // Oximetry
    const oxData = oximetryByDate.get(nightDate);
    const oxInterval = oxData?.intervalSeconds ?? 2;
    const oximetry = oxData ? computeOximetry(oxData.samples, oxInterval) : null;
    const oximetryTrace = oxData ? buildOximetryTrace(oxData.samples) : null;

    // Cross-device matching
    let crossDevice: CrossDeviceResults | null = null;
    if (oximetry && oxData && ned.reras && ned.reras.length >= 10) {
      crossDevice = computeCrossDevice(ned.reras, oxData.samples, oxInterval, totalDuration, ned.reraIndex, oximetry.hrClin10);
    }

    const night: NightResult = {
      date: recordingDate,
      dateStr: nightDate,
      durationHours: totalDuration / 3600,
      sessionCount: nightSessions.length,
      sessionStartTime: recordingDate,
      settings: nightSettings,
      glasgow, wat, ned,
      oximetry, oximetryTrace,
      settingsMetrics: settingsMetricsResult,
      crossDevice,
      machineSummary: null,
      settingsFingerprint: computeFingerprint(nightSettings),
      csl: null,
      pldSummary: null, // PLD is ResMed-specific, not available for BMC
      spontaneousPct: null, // BMC devices do not carry TrigCycEvt-equivalent data
      timedPct: null,
    };
    nights.push(night);

    const nightMsg: WorkerNightResult = {
      type: 'NIGHT_RESULT',
      night,
      nightIndex: i,
      totalNights: nightDates.length,
    };
    self.postMessage(nightMsg);
  }

  postProgress(3, 4, 'Finalizing...');

  nights.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return nights;
}

/**
 * Process oximetry CSVs only — no EDF parsing, no engine computation.
 * Returns computed OximetryResults keyed by date string.
 */
function processOximetryOnly(oximetryCSVs: string[]): {
  metrics: Record<string, OximetryResults>;
  traces: Record<string, OximetryTraceData>;
} {
  const metrics: Record<string, OximetryResults> = {};
  const traces: Record<string, OximetryTraceData> = {};

  for (const csv of oximetryCSVs) {
    try {
      const parsed = parseOximetryCSV(csv);
      metrics[parsed.dateStr] = computeOximetry(parsed.samples, parsed.intervalSeconds);
      const trace = buildOximetryTrace(parsed.samples);
      if (trace) {
        traces[parsed.dateStr] = trace;
      }
    // eslint-disable-next-line airwaylab/no-silent-catch -- Individual CSV parse failures are non-fatal; loop continues. Caller aggregates results.
    } catch (err) {
      console.error('[oximetry] Failed to parse CSV:', err instanceof Error ? err.message : String(err));
    }
  }

  return { metrics, traces };
}
