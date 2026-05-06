// ============================================================
// AirwayLab — PLD (Periodic Low-resolution Data) EDF Parser
// Parses ResMed PLD.edf files containing therapy data at 0.5 Hz
// (2-second intervals). Channels include leak, pressure, snore,
// FFL index, respiratory rate, tidal volume, minute ventilation,
// I:E ratio, Ti, Te, and target MV (ASV/iVAPS).
// ============================================================

import type { EDFHeader, EDFSignal, PLDData, PLDSummary } from '../types';

// ── Channel label matchers ──────────────────────────────────
// Each channel has multiple label variants across ResMed models.
// Matching is case-insensitive.

interface ChannelMatcher {
  key: keyof Omit<PLDData, 'samplingRate' | 'durationSeconds' | 'startTime'>;
  patterns: string[];
  /** Unit conversion factor: multiply raw physical value by this */
  conversionFactor?: number;
}

const CHANNEL_MATCHERS: ChannelMatcher[] = [
  {
    key: 'maskPressure',
    patterns: ['maskpress', 'maskpress.2s'],
  },
  {
    key: 'therapyPressure',
    patterns: ['therapy pres', 'press.2s'],
  },
  {
    key: 'expiratoryPressure',
    patterns: ['exp press', 'eprpress.2s', 'eprpress', 'epress.2s'],
  },
  {
    key: 'inspiratoryPressure',
    patterns: ['insp pres', 'ipap'],
  },
  {
    key: 'leak',
    patterns: ['leak', 'leak.2s'],
    // Leak is in L/s in EDF, convert to L/min
    // Conversion applied conditionally based on unit detection
  },
  {
    key: 'respiratoryRate',
    patterns: ['rr', 'resprate.2s', 'af', 'fr'],
  },
  {
    key: 'tidalVolume',
    patterns: ['vt', 'tidvol.2s', 'vc'],
    // Tidal volume may be in L, convert to mL
    // Conversion applied conditionally based on unit detection
  },
  {
    key: 'minuteVentilation',
    patterns: ['mv', 'minvent.2s', 'vm'],
  },
  {
    key: 'snore',
    patterns: ['snore', 'snore.2s'],
  },
  {
    key: 'fflIndex',
    patterns: ['ffl index', 'flowlim.2s', 'ffl'],
  },
  {
    key: 'ieRatio',
    patterns: ['i:e', 'ieratio.2s'],
    // I:E stored as integer x100, convert to ratio
    conversionFactor: 0.01,
  },
  {
    key: 'ti',
    patterns: ['ti', 'b5itime.2s', 'r5ti.2s'],
  },
  {
    key: 'te',
    patterns: ['te', 'b5etime.2s'],
  },
  {
    key: 'targetMV',
    patterns: ['tgmv', 'tgtvent.2s'],
  },
];

/**
 * Match a signal label to a PLD channel key.
 * Returns the matcher if found, null otherwise.
 * Uses exact-start matching after trimming to avoid false positives
 * (e.g. 'MV' should not match 'MVent' unless pattern includes it).
 */
function matchChannel(label: string): ChannelMatcher | null {
  const trimmed = label.toLowerCase().trim();

  for (const matcher of CHANNEL_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (trimmed === pattern) {
        return matcher;
      }
    }
  }

  // Fallback: check if label starts with any pattern (handles trailing spaces/numbers)
  for (const matcher of CHANNEL_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (trimmed.startsWith(pattern) && (trimmed.length === pattern.length || trimmed[pattern.length] === ' ' || trimmed[pattern.length] === '.')) {
        return matcher;
      }
    }
  }

  return null;
}

// ── EDF header parsing helpers (reused from edf-parser.ts patterns) ──

function readField(buffer: ArrayBuffer, decoder: TextDecoder, offset: number, length: number): string {
  return decoder.decode(new Uint8Array(buffer, offset, length)).trim();
}

function parseTime(timeStr: string): [number, number, number] {
  const parts = timeStr.split('.');
  return [
    parseInt(parts[0] || '0'),
    parseInt(parts[1] || '0'),
    parseInt(parts[2] || '0'),
  ];
}

/**
 * Parse a PLD.edf file and extract all available channels.
 * Returns null if the file cannot be parsed or has no recognizable channels.
 *
 * PLD files are low-resolution (typically 0.5 Hz) and contain machine-computed
 * therapy metrics. They do NOT contain raw flow waveforms (those are in BRP.edf).
 */
export function parsePLD(buffer: ArrayBuffer, _filePath: string): PLDData | null {
  if (buffer.byteLength < 256) {
    return null; // Too small to be a valid EDF
  }

  const view = new DataView(buffer);
  const decoder = new TextDecoder('ascii');

  // --- Fixed header (256 bytes) ---
  const header: EDFHeader = {
    version: readField(buffer, decoder, 0, 8),
    patientId: readField(buffer, decoder, 8, 80),
    recordingId: readField(buffer, decoder, 88, 80),
    startDate: readField(buffer, decoder, 168, 8),
    startTime: readField(buffer, decoder, 176, 8),
    headerBytes: Math.max(0, parseInt(readField(buffer, decoder, 184, 8)) || 0),
    reserved: readField(buffer, decoder, 192, 44),
    numDataRecords: Math.max(0, parseInt(readField(buffer, decoder, 236, 8)) || 0),
    recordDuration: parseFloat(readField(buffer, decoder, 244, 8)) || 1,
    numSignals: Math.max(0, parseInt(readField(buffer, decoder, 252, 4)) || 0),
  };

  // headerBytes must be at least 256 (EDF minimum); a smaller value means a corrupt header
  if (header.headerBytes < 256) {
    return null;
  }

  if (header.numSignals === 0 || header.numDataRecords === 0) {
    return null;
  }

  // --- Parse recording date ---
  const dateParts = header.startDate.split('.');
  let year = parseInt(dateParts[2] || '0');
  if (year < 100) {
    year += year < 85 ? 2000 : 1900;
  }
  const startTime = new Date(
    year,
    parseInt(dateParts[1] || '1') - 1,
    parseInt(dateParts[0] || '1'),
    ...parseTime(header.startTime)
  );

  // --- Per-signal headers ---
  const n = header.numSignals;
  const signals: EDFSignal[] = [];

  let offset = 256;
  for (let i = 0; i < n; i++) {
    signals.push({
      label: readField(buffer, decoder, offset + i * 16, 16),
      transducer: '',
      physicalDimension: '',
      physicalMin: 0,
      physicalMax: 0,
      digitalMin: 0,
      digitalMax: 0,
      prefiltering: '',
      numSamples: 0,
      reserved: '',
    });
  }
  offset += n * 16;

  for (let i = 0; i < n; i++) {
    signals[i]!.transducer = readField(buffer, decoder, offset + i * 80, 80);
  }
  offset += n * 80;

  for (let i = 0; i < n; i++) {
    signals[i]!.physicalDimension = readField(buffer, decoder, offset + i * 8, 8);
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i]!.physicalMin = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i]!.physicalMax = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i]!.digitalMin = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i]!.digitalMax = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i]!.prefiltering = readField(buffer, decoder, offset + i * 80, 80);
  }
  offset += n * 80;

  for (let i = 0; i < n; i++) {
    signals[i]!.numSamples = Math.max(0, parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  }
  offset += n * 8;

  // skip reserved
  // offset += n * 32; (not needed for data reading)

  // If every signal reports zero samples the header is corrupt — nothing useful to parse
  const totalSamplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  if (totalSamplesPerRecord === 0) {
    return null;
  }

  // --- Map signals to channels ---
  interface ChannelMapping {
    signalIndex: number;
    matcher: ChannelMatcher;
    signal: EDFSignal;
  }

  const mappings: ChannelMapping[] = [];
  const usedKeys = new Set<string>();

  for (let i = 0; i < n; i++) {
    const sig = signals[i]!;
    const matcher = matchChannel(sig.label);
    if (matcher && !usedKeys.has(matcher.key)) {
      mappings.push({ signalIndex: i, matcher, signal: sig });
      usedKeys.add(matcher.key);
    }
  }

  if (mappings.length === 0) {
    return null; // No recognizable channels
  }

  // --- Validate buffer size ---
  const samplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  const bytesPerRecord = samplesPerRecord * 2;
  const expectedBytes = header.headerBytes + header.numDataRecords * bytesPerRecord;

  let actualNumRecords = header.numDataRecords;
  if (buffer.byteLength < expectedBytes) {
    const availableDataBytes = buffer.byteLength - header.headerBytes;
    const completeRecords = bytesPerRecord > 0
      ? Math.floor(availableDataBytes / bytesPerRecord)
      : 0;
    if (completeRecords === 0) {
      return null; // Truncated beyond usability
    }
    actualNumRecords = completeRecords;
  }

  // --- Precompute scaling factors for each mapped channel ---
  interface ChannelReader {
    key: keyof Omit<PLDData, 'samplingRate' | 'durationSeconds' | 'startTime'>;
    signalIndex: number;
    data: Float32Array;
    scale: number;
    physicalMin: number;
    digitalMin: number;
    conversionFactor: number;
    writeIdx: number;
  }

  const readers: ChannelReader[] = mappings.map((m) => {
    const sig = m.signal;
    const digitalRange = sig.digitalMax - sig.digitalMin;
    const scale = digitalRange === 0 ? 0 : (sig.physicalMax - sig.physicalMin) / digitalRange;
    const totalSamples = actualNumRecords * sig.numSamples;

    // Determine conversion factor
    let convFactor = m.matcher.conversionFactor ?? 1;

    // Leak: detect unit and convert L/s -> L/min
    if (m.matcher.key === 'leak') {
      const unit = sig.physicalDimension.toLowerCase().trim();
      const isPerSecond = unit.includes('/s');
      const isPerMinute = unit.includes('/min') || unit.includes('/m');
      if (isPerSecond || (!isPerMinute && Math.abs(sig.physicalMax) < 5)) {
        convFactor = 60; // L/s -> L/min
      }
    }

    // Tidal volume: detect unit and convert L -> mL
    if (m.matcher.key === 'tidalVolume') {
      const unit = sig.physicalDimension.toLowerCase().trim();
      if (unit === 'l' || unit === 'litre' || unit === 'liter') {
        convFactor = 1000; // L -> mL
      } else if (unit === 'ml' || unit === 'milliliter') {
        convFactor = 1; // already mL
      } else if (Math.abs(sig.physicalMax) < 5) {
        // Heuristic: if max < 5, values are likely in litres
        convFactor = 1000;
      }
    }

    return {
      key: m.matcher.key,
      signalIndex: m.signalIndex,
      data: new Float32Array(totalSamples),
      scale,
      physicalMin: sig.physicalMin,
      digitalMin: sig.digitalMin,
      conversionFactor: convFactor,
      writeIdx: 0,
    };
  });

  // --- Read data records ---
  let dataOffset = header.headerBytes;

  for (let rec = 0; rec < actualNumRecords; rec++) {
    let recordPtr = dataOffset;

    for (let sig = 0; sig < n; sig++) {
      const samplesInRecord = signals[sig]!.numSamples;

      // Check if this signal is one we're reading
      const reader = readers.find((r) => r.signalIndex === sig);
      if (reader) {
        for (let s = 0; s < samplesInRecord; s++) {
          const digitalValue = view.getInt16(recordPtr + s * 2, true);
          const physicalValue = (digitalValue - reader.digitalMin) * reader.scale + reader.physicalMin;
          reader.data[reader.writeIdx++] = physicalValue * reader.conversionFactor;
        }
      }

      recordPtr += samplesInRecord * 2;
    }

    dataOffset = recordPtr;
  }

  // --- Build result ---
  // Determine sampling rate from the first mapped signal
  const firstMappedSignal = signals[mappings[0]!.signalIndex]!;
  const samplingRate = firstMappedSignal.numSamples / header.recordDuration;
  const durationSeconds = actualNumRecords * header.recordDuration;

  const result: PLDData = {
    samplingRate,
    durationSeconds,
    startTime,
  };

  for (const reader of readers) {
    result[reader.key] = reader.data;
  }

  return result;
}

// ── PLDSummary computation ──────────────────────────────────

/**
 * Compute a percentile value from a sorted Float32Array.
 */
function percentile(sorted: Float32Array, p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const weight = idx - lo;
  return sorted[lo]! * (1 - weight) + sorted[hi]! * weight;
}

/**
 * Sort a Float32Array in-place (ascending).
 */
function sortFloat32(arr: Float32Array): Float32Array {
  // Float32Array.prototype.sort with comparator
  arr.sort((a, b) => a - b);
  return arr;
}

/**
 * Compute PLDSummary from raw PLDData.
 * This produces the small, serializable summary that gets persisted.
 */
export function computePLDSummary(pld: PLDData): PLDSummary {
  const sampleCount = pld.leak?.length ?? pld.snore?.length ?? pld.fflIndex?.length ??
    pld.therapyPressure?.length ?? pld.respiratoryRate?.length ?? 0;

  const summary: PLDSummary = {
    samplingRate: pld.samplingRate,
    durationSeconds: pld.durationSeconds,
    sampleCount,
    hasLeakData: !!pld.leak && pld.leak.length > 0,
    hasSnoreData: !!pld.snore && pld.snore.length > 0,
    hasFflData: !!pld.fflIndex && pld.fflIndex.length > 0,
    hasPressureData: !!(pld.therapyPressure || pld.expiratoryPressure || pld.inspiratoryPressure),
  };

  // Helper to compute stats for a channel
  const computeStats = (data: Float32Array | undefined) => {
    if (!data || data.length === 0) return null;
    const sorted = sortFloat32(new Float32Array(data)); // copy to avoid mutating original
    return {
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted[sorted.length - 1]!,
    };
  };

  const computeStatsWithMin = (data: Float32Array | undefined) => {
    if (!data || data.length === 0) return null;
    const sorted = sortFloat32(new Float32Array(data));
    return {
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted[sorted.length - 1]!,
      min: sorted[0]!,
    };
  };

  const computeMedianP95 = (data: Float32Array | undefined) => {
    if (!data || data.length === 0) return null;
    const sorted = sortFloat32(new Float32Array(data));
    return {
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
    };
  };

  const computeMedianOnly = (data: Float32Array | undefined) => {
    if (!data || data.length === 0) return null;
    const sorted = sortFloat32(new Float32Array(data));
    return { median: percentile(sorted, 50) };
  };

  // Compute stats for each channel
  const leakStats = computeStats(pld.leak);
  if (leakStats) summary.leak = leakStats;

  if (pld.snore && pld.snore.length > 0) {
    const sorted = sortFloat32(new Float32Array(pld.snore));
    let aboveZero = 0;
    for (let i = 0; i < pld.snore.length; i++) {
      if (pld.snore[i]! > 0) aboveZero++;
    }
    summary.snore = {
      median: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted[sorted.length - 1]!,
      percentAboveZero: (aboveZero / pld.snore.length) * 100,
    };
  }

  const fflStats = computeStats(pld.fflIndex);
  if (fflStats) summary.fflIndex = fflStats;

  const therapyStats = computeStatsWithMin(pld.therapyPressure);
  if (therapyStats) summary.therapyPressure = therapyStats;

  const expStats = computeStatsWithMin(pld.expiratoryPressure);
  if (expStats) summary.expiratoryPressure = expStats;

  const inspStats = computeStatsWithMin(pld.inspiratoryPressure);
  if (inspStats) summary.inspiratoryPressure = inspStats;

  const rrStats = computeMedianP95(pld.respiratoryRate);
  if (rrStats) summary.respiratoryRate = rrStats;

  const vtStats = computeMedianP95(pld.tidalVolume);
  if (vtStats) summary.tidalVolume = vtStats;

  const mvStats = computeMedianP95(pld.minuteVentilation);
  if (mvStats) summary.minuteVentilation = mvStats;

  const ieStats = computeMedianOnly(pld.ieRatio);
  if (ieStats) summary.ieRatio = ieStats;

  const tiStats = computeMedianOnly(pld.ti);
  if (tiStats) summary.ti = tiStats;

  const teStats = computeMedianOnly(pld.te);
  if (teStats) summary.te = teStats;

  const targetMVStats = computeMedianOnly(pld.targetMV);
  if (targetMVStats) summary.targetMV = targetMVStats;

  return summary;
}
