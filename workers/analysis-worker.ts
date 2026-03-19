// ============================================================
// AirwayLab — Analysis Web Worker
// Receives file buffers, runs all engines per night, posts progress
// ============================================================

import { parseEDF } from '../lib/parsers/edf-parser';
import { groupByNight, filterBRPFiles, filterSA2Files, filterEVEFiles, findSTRFile, findIdentificationFile, extractFolderDate } from '../lib/parsers/night-grouper';
import { parseSA2 } from '../lib/parsers/sa2-parser';
import { extractSettings, parseIdentification, getSettingsForDate, getSTRSignalLabels } from '../lib/parsers/settings-extractor';
import { parseOximetryCSV } from '../lib/parsers/oximetry-csv-parser';
import { parseEVE } from '../lib/parsers/eve-parser';
import { computeNightGlasgow } from '../lib/analyzers/glasgow-index';
import { computeWAT } from '../lib/analyzers/wat-engine';
import { computeNED } from '../lib/analyzers/ned-engine';
import { computeOximetry } from '../lib/analyzers/oximetry-engine';
import { computeSettingsMetrics } from '../lib/analyzers/settings-engine';
import { buildOximetryTrace } from '../lib/oximetry-trace';
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
  MachineSettings,
  MachineHypopneaSummary,
  OximetryResults,
  OximetryTraceData,
} from '../lib/types';

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
      const { files, oximetryCSVs } = e.data;
      const results = await processFiles(files, oximetryCSVs);
      const response: WorkerResult = { type: 'RESULTS', nights: results };
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
  oximetryCSVs?: string[]
): Promise<NightResult[]> {
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
  if (strFileInfo) {
    const strFile = files.find((f) => f.path.toLowerCase().endsWith('str.edf'));
    if (strFile) {
      try {
        dailySettings = extractSettings(strFile.buffer, deviceModel);
      } catch {
        // STR parsing failed — continue without settings
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
      throw new Error('No flow data files (BRP.edf) found in the uploaded data. Make sure you selected the root folder or DATALOG folder from your SD card.');
    }
    throw new Error(`Found ${brpFiles.length} flow data file(s) but none could be parsed. The files may be corrupted or in an unsupported format.`);
  }

  // Step 3.5: Parse EVE.edf files and group events by night date
  const eveFileInfos = filterEVEFiles(fileList);
  const eveEventsByDate = new Map<string, MachineHypopneaSummary[]>();
  for (const eveInfo of eveFileInfos) {
    const fileData = files.find((f) => f.path === eveInfo.path);
    if (!fileData) continue;
    try {
      const events = parseEVE(fileData.buffer);
      const nightDate = extractFolderDate(eveInfo.path);
      if (!nightDate) continue;
      const hypopneas = events
        .filter((e) => e.type === 'hypopnea')
        .map((e) => ({ onsetSec: e.onsetSec, durationSec: e.durationSec }));
      if (hypopneas.length > 0) {
        const existing = eveEventsByDate.get(nightDate) ?? [];
        existing.push(...hypopneas);
        eveEventsByDate.set(nightDate, existing);
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

  // Step 4: Group by night
  const nightGroups = groupByNight(parsedEdfs);

  // Checkpoint: EDFs parsed but no nights formed
  if (nightGroups.length === 0 && parsedEdfs.length > 0) {
    const warning: WorkerWarning = {
      type: 'WARNING',
      checkpoint: 'analysis_zero_nights',
      detail: `Parsed ${parsedEdfs.length} EDF files but formed 0 valid nights`,
      tags: { file_count: brpFiles.length, parsed_count: parsedEdfs.length },
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

    const wat = computeWAT(combinedFlow, avgSamplingRate);

    // Machine hypopnea events for this night (from EVE.edf)
    const machineHypopneas = eveEventsByDate.get(group.nightDate);
    const ned = computeNED(combinedFlow, avgSamplingRate, machineHypopneas);

    // Recording date from first session
    const recordingDate = group.sessions[0]!.recordingDate;

    // Settings validation (BiPAP only — requires pressure data)
    const settingsMetricsResult = combinedPressure
      ? computeSettingsMetrics(combinedFlow, combinedPressure, avgSamplingRate)
      : null;

    // Oximetry: match by night date
    const oxData = oximetryByDate.get(group.nightDate);
    const oximetry = oxData ? computeOximetry(oxData.samples) : null;
    const oximetryTrace = oxData ? buildOximetryTrace(oxData.samples) : null;

    nights.push({
      date: recordingDate,
      dateStr: group.nightDate,
      durationHours: totalDuration / 3600,
      sessionCount: group.sessions.length,
      settings,
      glasgow,
      wat,
      ned,
      oximetry,
      oximetryTrace,
      settingsMetrics: settingsMetricsResult,
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
      metrics[parsed.dateStr] = computeOximetry(parsed.samples);
      const trace = buildOximetryTrace(parsed.samples);
      if (trace) {
        traces[parsed.dateStr] = trace;
      }
    } catch (err) {
      console.error('[oximetry] Failed to parse CSV:', err instanceof Error ? err.message : String(err));
    }
  }

  return { metrics, traces };
}
