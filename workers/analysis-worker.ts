// ============================================================
// AirwayLab — Analysis Web Worker
// Receives file buffers, runs all engines per night, posts progress
// ============================================================

import { parseEDF } from '../lib/parsers/edf-parser';
import { groupByNight, filterBRPFiles, findSTRFile, findIdentificationFile } from '../lib/parsers/night-grouper';
import { extractSettings, parseIdentification, getSettingsForDate } from '../lib/parsers/settings-extractor';
import { parseOximetryCSV } from '../lib/parsers/oximetry-csv-parser';
import { computeNightGlasgow } from '../lib/analyzers/glasgow-index';
import { computeWAT } from '../lib/analyzers/wat-engine';
import { computeNED } from '../lib/analyzers/ned-engine';
import { computeOximetry } from '../lib/analyzers/oximetry-engine';
import type {
  WorkerMessage,
  WorkerProgress,
  WorkerResult,
  WorkerError,
  NightResult,
  RawNightFlowData,
  RawFlowSession,
  EDFFile,
  MachineSettings,
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
    const { files, oximetryCSVs } = e.data;
    const { nights: results, rawFlowData } = await processFiles(files, oximetryCSVs);
    const response: WorkerResult = { type: 'RESULTS', nights: results, rawFlowData };
    self.postMessage(response);
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

async function processFiles(
  files: { buffer: ArrayBuffer; path: string }[],
  oximetryCSVs?: string[]
): Promise<{ nights: NightResult[]; rawFlowData: RawNightFlowData[] }> {
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

  if (idFileInfo) {
    const idFile = files.find((f) => f.path.endsWith(idFileInfo.name));
    if (idFile) {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(idFile.buffer);
      deviceModel = parseIdentification(text);
    }
  }

  if (strFileInfo) {
    const strFile = files.find((f) => f.path.toLowerCase().endsWith('str.edf'));
    if (strFile) {
      try {
        dailySettings = extractSettings(strFile.buffer, deviceModel);
      } catch {
        // STR parsing failed — continue without settings
      }
    }
  }

  postProgress(1, brpFiles.length + 2, 'Parsing EDF files...');

  // Step 3: Parse all BRP.edf files
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

  if (parsedEdfs.length === 0) {
    throw new Error('No valid BRP.edf files could be parsed');
  }

  // Step 4: Group by night
  const nightGroups = groupByNight(parsedEdfs);

  postProgress(2, nightGroups.length + 2, 'Analyzing nights...');

  // Step 5: Parse oximetry CSVs
  const oximetryByDate = new Map<string, ReturnType<typeof parseOximetryCSV>>();
  if (oximetryCSVs) {
    for (const csv of oximetryCSVs) {
      try {
        const parsed = parseOximetryCSV(csv);
        oximetryByDate.set(parsed.dateStr, parsed);
      } catch {
        // Skip unparseable oximetry files
      }
    }
  }

  // Step 6: Run all engines per night
  const nights: NightResult[] = [];
  const rawFlowData: RawNightFlowData[] = [];
  const now = Date.now();

  for (let i = 0; i < nightGroups.length; i++) {
    const group = nightGroups[i];
    postProgress(i + 3, nightGroups.length + 2, `Analyzing night ${group.nightDate}...`);

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
    };

    // Compute total duration
    let totalDuration = 0;
    for (const session of group.sessions) {
      totalDuration += session.durationSeconds;
    }

    // Glasgow Index (duration-weighted across sessions)
    const glasgow = computeNightGlasgow(group.sessions);

    // WAT + NED: concatenate flow data from all sessions
    const totalFlowSamples = group.sessions.reduce(
      (sum, s) => sum + s.flowData.length,
      0
    );
    const combinedFlow = new Float32Array(totalFlowSamples);
    let offset = 0;
    let avgSamplingRate = 0;
    for (const session of group.sessions) {
      combinedFlow.set(session.flowData, offset);
      offset += session.flowData.length;
      avgSamplingRate += session.samplingRate;
    }
    avgSamplingRate /= group.sessions.length;

    const wat = computeWAT(combinedFlow, avgSamplingRate);
    const ned = computeNED(combinedFlow, avgSamplingRate);

    // Recording date from first session
    const recordingDate = group.sessions[0].recordingDate;

    // Oximetry: match by night date
    const oxData = oximetryByDate.get(group.nightDate);
    const oximetry = oxData ? computeOximetry(oxData.samples) : null;

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
    });

    // Collect raw flow data for persistence
    const rawSessions: RawFlowSession[] = group.sessions.map((s) => ({
      filePath: s.filePath,
      samplingRate: s.samplingRate,
      durationSeconds: s.durationSeconds,
      recordingDate: s.recordingDate.toISOString(),
      flowData: new Float32Array(s.flowData),
      pressureData: s.pressureData ? new Float32Array(s.pressureData) : null,
    }));

    rawFlowData.push({
      dateStr: group.nightDate,
      sessions: rawSessions,
      savedAt: now,
    });
  }

  // Sort by date (most recent first)
  nights.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  rawFlowData.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return { nights, rawFlowData };
}
