const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');

// Setup TS require hook
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.resolve(rootDir, request.slice(2));
  }
  return origResolve.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function(module, filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const res = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  });
  module._compile(res.outputText, filename);
};

// Import parsers and analyzers
const { parseEDF } = require('../lib/parsers/edf-parser.ts');
const {
  groupByNight,
  filterBRPFiles,
  filterSA2Files,
  filterEVEFiles,
  filterCSLFiles,
  filterPLDFiles,
  findSTRFile,
  findIdentificationFile,
  extractFolderDate,
  extractPLDFilenameDate
} = require('../lib/parsers/night-grouper.ts');
const { parsePLD, computePLDSummary } = require('../lib/parsers/pld-parser.ts');
const { parseSA2 } = require('../lib/parsers/sa2-parser.ts');
const { extractSettings, parseIdentification, getSettingsForDate, getSTRSignalLabels } = require('../lib/parsers/settings-extractor.ts');
const { extractMachineSummary } = require('../lib/parsers/machine-summary-extractor.ts');
const { computeFingerprint } = require('../lib/settings-fingerprint.ts');
const { parseEVE } = require('../lib/parsers/eve-parser.ts');
const { parseCSL } = require('../lib/parsers/csl-parser.ts');
const { computeNightGlasgow } = require('../lib/analyzers/glasgow-index.ts');
const { computeWAT } = require('../lib/analyzers/wat-engine.ts');
const { computeNED } = require('../lib/analyzers/ned-engine.ts');
const { computeSettingsMetrics } = require('../lib/analyzers/settings-engine.ts');
const { computeSpontaneousPct } = require('../lib/bilevel-metrics.ts');
const { ENGINE_VERSION, OXIMETRY_ENGINE_VERSION } = require('../lib/engine-version.ts');

function stripNightBulkData(night) {
  return {
    ...night,
    ned: {
      ...night.ned,
      breaths: [],
      reras: undefined,
      reraTimestamps: night.ned.reraTimestamps || []
    },
    oximetryTrace: null,
    csl: night.csl ? { ...night.csl, episodes: [] } : null
  };
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runImport(dataDirName) {
  const targetDir = path.resolve(rootDir, dataDirName || 'data09082026');
  console.log(`\n==================================================`);
  console.log(`AirwayLab Sleep Data Importer`);
  console.log(`Source directory: ${targetDir}`);
  console.log(`==================================================\n`);

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory ${targetDir} does not exist.`);
    process.exit(1);
  }

  const allFilePaths = getAllFiles(targetDir);
  console.log(`Found ${allFilePaths.length} files in ${targetDir}`);

  // Build files list
  const files = [];
  for (const fpath of allFilePaths) {
    const relPath = path.relative(targetDir, fpath).replace(/\\/g, '/');
    const buf = fs.readFileSync(fpath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    files.push({
      path: relPath,
      buffer: ab
    });
  }

  const fileList = files.map((f) => ({
    name: f.path.split('/').pop() || '',
    path: f.path,
    size: f.buffer.byteLength
  }));

  const brpFiles = filterBRPFiles(fileList);
  const strFileInfo = findSTRFile(fileList);
  const idFileInfo = findIdentificationFile(fileList);

  console.log(`Identified files:`);
  console.log(`  BRP files (flow data): ${brpFiles.length}`);
  console.log(`  STR file (settings):   ${strFileInfo ? strFileInfo.path : 'None'}`);
  console.log(`  Identification file:   ${idFileInfo ? idFileInfo.path : 'None'}`);

  // Step 2: Settings & Device Identification
  let dailySettings = {};
  let deviceModel = 'Unknown';
  const decoder = new TextDecoder('utf-8');

  let identificationText = null;
  if (idFileInfo) {
    const idFile = files.find((f) => f.path.endsWith(idFileInfo.name));
    if (idFile) identificationText = decoder.decode(idFile.buffer);
  }

  let currentSettingsText;
  const currentSettingsFile = files.find((f) => f.path.toLowerCase().endsWith('settings/currentsettings.json'));
  if (currentSettingsFile) currentSettingsText = decoder.decode(currentSettingsFile.buffer);

  deviceModel = parseIdentification(identificationText || '', currentSettingsText);
  console.log(`  Device Model:          ${deviceModel}`);

  // airbreak-plus custom settings (CSG.tgt / CSG.set) & VGL.tgt
  let customSettingsText = null;
  const customSettingsFile = files.find((f) => {
    const p = f.path.toLowerCase();
    return p.endsWith('csg.tgt') || p.endsWith('csg.set');
  });
  if (customSettingsFile) {
    customSettingsText = decoder.decode(customSettingsFile.buffer);
    console.log(`  airbreak-plus settings: Found (${customSettingsFile.path})`);
  }

  let vautoGlobalSettingsText = null;
  const vautoGlobalFile = files.find((f) => {
    const p = f.path.toLowerCase();
    return p.endsWith('vgl.tgt') || p.endsWith('vgl.set');
  });
  if (vautoGlobalFile) {
    vautoGlobalSettingsText = decoder.decode(vautoGlobalFile.buffer);
    console.log(`  VAuto global settings: Found (${vautoGlobalFile.path})`);
  }

  let dailySummary = {};
  if (strFileInfo) {
    const strFile = files.find((f) => f.path.toLowerCase().endsWith('str.edf'));
    if (strFile) {
      try {
        dailySettings = extractSettings(
          strFile.buffer,
          deviceModel,
          customSettingsText || undefined,
          vautoGlobalSettingsText || undefined
        );
        console.log(`  Extracted settings for ${Object.keys(dailySettings).length} days`);
        const latestDaySettings = Object.values(dailySettings).pop();
        if (latestDaySettings && latestDaySettings.customVAuto) {
          const cv = latestDaySettings.customVAuto;
          console.log(
            `  Custom VAuto detected: Enabled=${cv.enabled}, ASV Max=${cv.asvMax}, Sens=${cv.asvSens}, ` +
            `EPS=${cv.eps ?? "default(1.0)"}, Exh. Shape=${cv.exhaleShape ?? 0}`
          );
        }
      } catch (err) {
        console.warn(`  Warning: STR settings extraction failed:`, err.message);
      }
      try {
        dailySummary = extractMachineSummary(strFile.buffer, deviceModel);
      } catch (err) {
        console.warn(`  Warning: Machine summary extraction failed:`, err.message);
      }
    }
  }

  // Step 3: Parse BRP files
  console.log(`\nParsing ${brpFiles.length} BRP files...`);
  const parsedEdfs = [];
  for (let i = 0; i < brpFiles.length; i++) {
    const brp = brpFiles[i];
    const fileData = files.find((f) => f.path === brp.path);
    if (!fileData) continue;
    try {
      const edf = parseEDF(fileData.buffer, fileData.path);
      parsedEdfs.push(edf);
    } catch (err) {
      console.warn(`  Warning: Failed to parse ${brp.path}: ${err.message}`);
    }
  }
  console.log(`Successfully parsed ${parsedEdfs.length} BRP files.`);

  // Step 3.5: Parse EVE.edf
  const eveFileInfos = filterEVEFiles(fileList);
  console.log(`Parsing ${eveFileInfos.length} EVE event files...`);
  const eveEventsByDate = new Map();
  const eveReraCountByDate = new Map();
  for (const eveInfo of eveFileInfos) {
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
            const existing = eveEventsByDate.get(nightDate) || [];
            existing.push(...hypopneas);
            eveEventsByDate.set(nightDate, existing);
          }
          const reraCount = events.filter((e) => e.type === 'rera').length;
          if (reraCount > 0) {
            eveReraCountByDate.set(nightDate, (eveReraCountByDate.get(nightDate) || 0) + reraCount);
          }
        }
      } catch (err) {
        // continue
      }
    }
  }

  // Step 3.6: Parse CSL.edf
  const cslFileInfos = filterCSLFiles(fileList);
  console.log(`Parsing ${cslFileInfos.length} CSL (Cheyne-Stokes) files...`);
  const cslDataByDate = new Map();
  for (const cslInfo of cslFileInfos) {
    const fileData = files.find((f) => f.path === cslInfo.path);
    if (fileData) {
      try {
        const cslData = parseCSL(fileData.buffer);
        const nightDate = extractFolderDate(cslInfo.path);
        if (nightDate && cslData) {
          const existing = cslDataByDate.get(nightDate);
          if (existing) {
            existing.episodes.push(...cslData.episodes);
            existing.totalCSRSeconds += cslData.totalCSRSeconds;
            existing.episodeCount += cslData.episodeCount;
          } else {
            cslDataByDate.set(nightDate, cslData);
          }
        }
      } catch (err) {
        // continue
      }
    }
  }

  // Step 3.7: Parse PLD files
  const pldFiles = filterPLDFiles(fileList);
  console.log(`Parsing ${pldFiles.length} PLD files...`);
  const pldSummaryByDate = new Map();
  for (const pldInfo of pldFiles) {
    const fileData = files.find((f) => f.path === pldInfo.path);
    if (!fileData) continue;
    try {
      const pld = parsePLD(fileData.buffer, fileData.path);
      if (!pld) continue;
      const nightDate = extractFolderDate(pldInfo.path) || extractPLDFilenameDate(pldInfo.path);
      if (!nightDate) continue;
      const summary = computePLDSummary(pld);
      const existing = pldSummaryByDate.get(nightDate);
      if (!existing || summary.durationSeconds > existing.durationSeconds) {
        pldSummaryByDate.set(nightDate, summary);
      }
    } catch (err) {
      // continue
    }
  }

  // Step 4: Group by night
  const nightGroups = groupByNight(parsedEdfs);
  console.log(`Formed ${nightGroups.length} clinical nights.`);

  // Step 4.5: SA2 files
  const oximetryByDate = new Map();
  const sa2Files = filterSA2Files(fileList);
  if (sa2Files.length > 0) {
    console.log(`Parsing ${sa2Files.length} SA2 oximetry files...`);
    for (const sa2Info of sa2Files) {
      const fileData = files.find((f) => f.path === sa2Info.path);
      if (!fileData) continue;
      try {
        const parsed = parseSA2(fileData.buffer, fileData.path);
        const existing = oximetryByDate.get(parsed.dateStr);
        if (existing) {
          existing.samples.push(...parsed.samples);
          existing.samples.sort((a, b) => a.time.getTime() - b.time.getTime());
          existing.endTime = existing.samples[existing.samples.length - 1].time;
          existing.durationSeconds = (existing.endTime.getTime() - existing.startTime.getTime()) / 1000;
        } else {
          oximetryByDate.set(parsed.dateStr, parsed);
        }
      } catch (err) {
        // continue
      }
    }
  }

  // Step 6: Run analysis engines per night
  console.log(`\nRunning analysis engines (Glasgow, WAT, NED)...`);
  const nights = [];

  for (let i = 0; i < nightGroups.length; i++) {
    const group = nightGroups[i];
    process.stdout.write(`  Analyzing night ${group.nightDate} (${i + 1}/${nightGroups.length})...\r`);

    const settings = getSettingsForDate(dailySettings, group.nightDate) || {
      deviceModel,
      epap: 0,
      ipap: 0,
      pressureSupport: 0,
      papMode: 'Unknown',
      riseTime: null,
      trigger: 'N/A',
      cycle: 'N/A',
      easyBreathe: false,
      settingsSource: 'unavailable'
    };

    let totalDuration = 0;
    for (const session of group.sessions) {
      totalDuration += session.durationSeconds;
    }

    const glasgow = computeNightGlasgow(group.sessions);

    const totalRespEventSamples = group.sessions.reduce(
      (sum, s) => sum + (s.respEventData ? s.respEventData.length : 0),
      0
    );
    let bilevelMetrics = null;
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

    const totalFlowSamples = group.sessions.reduce((sum, s) => sum + s.flowData.length, 0);
    const totalPressSamples = group.sessions.reduce((sum, s) => sum + (s.pressureData ? s.pressureData.length : 0), 0);
    const combinedFlow = new Float32Array(totalFlowSamples);
    const combinedPressure = totalPressSamples > 0 ? new Float32Array(totalPressSamples) : null;

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
    const machineHypopneas = eveEventsByDate.get(group.nightDate);
    const ned = computeNED(combinedFlow, avgSamplingRate, machineHypopneas);

    const machineReraCount = eveReraCountByDate.get(group.nightDate) || 0;
    if (machineReraCount > 0) {
      ned.machineReraCount = machineReraCount;
      ned.machineReraIndex = totalDuration > 0
        ? Math.round((machineReraCount / (totalDuration / 3600)) * 100) / 100
        : 0;
    }

    ned.reraTimestamps = ned.reras ? ned.reras.map(r => ({ startSec: r.startSec, durationSec: r.durationSec })) : [];

    const recordingDate = group.sessions[0].recordingDate;
    const settingsMetricsResult = combinedPressure
      ? computeSettingsMetrics(combinedFlow, combinedPressure, avgSamplingRate, settings)
      : null;

    const cslRaw = cslDataByDate.get(group.nightDate) || null;
    const csl = cslRaw ? {
      ...cslRaw,
      csrPercentage: totalDuration > 0
        ? Math.round((cslRaw.totalCSRSeconds / totalDuration) * 100 * 100) / 100
        : 0
    } : null;

    const pldSummary = pldSummaryByDate.get(group.nightDate) || null;

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
      oximetry: null,
      oximetryTrace: null,
      settingsMetrics: settingsMetricsResult,
      crossDevice: null,
      machineSummary: dailySummary[group.nightDate] || null,
      settingsFingerprint: computeFingerprint(settings),
      csl,
      pldSummary,
      spontaneousPct: bilevelMetrics ? bilevelMetrics.spontaneousPct : null,
      timedPct: bilevelMetrics ? bilevelMetrics.timedPct : null
    });
  }

  // Sort descending by date
  nights.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  console.log(`\nAnalysis complete! Processed ${nights.length} nights.`);

  // Strip bulk data (per-breath arrays) for persistence payload
  const strippedNights = nights.map(stripNightBulkData);

  const payload = {
    nights: strippedNights,
    therapyChangeDate: null,
    savedAt: Date.now(),
    engineVersion: ENGINE_VERSION,
    oximetryEngineVersion: OXIMETRY_ENGINE_VERSION
  };

  // Write output files
  const outPaths = [
    path.resolve(rootDir, 'imported-data.json'),
    path.resolve(rootDir, 'public/imported-data.json')
  ];

  for (const outPath of outPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Saved results to: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }

  // Print Summary Table
  console.log(`\n==================================================`);
  console.log(`IMPORT SUMMARY`);
  console.log(`==================================================`);
  console.log(`Device:         ${deviceModel}`);
  console.log(`Total Nights:   ${nights.length}`);
  console.log(`Date Range:     ${nights[nights.length - 1].dateStr} to ${nights[0].dateStr}`);

  const avgGlasgow = (nights.reduce((s, n) => s + n.glasgow.overall, 0) / nights.length).toFixed(2);
  const avgWAT = (nights.reduce((s, n) => s + n.wat.flScore, 0) / nights.length).toFixed(1);
  const avgNED = (nights.reduce((s, n) => s + n.ned.nedMean, 0) / nights.length).toFixed(1);
  const avgHours = (nights.reduce((s, n) => s + n.durationHours, 0) / nights.length).toFixed(1);

  console.log(`Average Sleep:  ${avgHours} hours / night`);
  console.log(`Avg Glasgow:    ${avgGlasgow} / 9.0`);
  console.log(`Avg WAT FL:     ${avgWAT} / 100`);
  console.log(`Avg NED:        ${avgNED}%`);
  console.log(`==================================================\n`);
}

const targetDir = process.argv[2] || 'data09082026';
runImport(targetDir).catch((err) => {
  console.error('\nImport failed:', err);
  process.exit(1);
});
