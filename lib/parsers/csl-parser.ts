// ============================================================
// AirwayLab — CSL.edf Parser (Cheyne-Stokes Respiration Events)
// Parses EDF+ Annotations (TAL format) from ResMed CSL.edf files.
// Extracts CSR Start/End episode pairs and computes summary stats.
// ============================================================

export interface CSREpisode {
  /** Onset in seconds from recording start */
  startSec: number;
  /** End time in seconds from recording start */
  endSec: number;
  /** Episode duration in seconds */
  durationSec: number;
}

export interface CSLData {
  episodes: CSREpisode[];
  /** Sum of all episode durations in seconds */
  totalCSRSeconds: number;
  /** totalCSRSeconds / recording duration x 100 */
  csrPercentage: number;
  episodeCount: number;
}

/** Labels to silently skip (not events) */
const SKIP_LABELS = new Set(['recording starts', '']);

/**
 * Parse a CSL.edf file and extract Cheyne-Stokes respiration episodes.
 * Returns null if the file can't be parsed (non-fatal).
 */
export function parseCSL(buffer: ArrayBuffer): CSLData | null {
  try {
    return parseCSLUnsafe(buffer);
  } catch {
    return null;
  }
}

function parseCSLUnsafe(buffer: ArrayBuffer): CSLData | null {
  if (buffer.byteLength < 256) return null;

  const decoder = new TextDecoder('ascii');

  // --- Fixed header (256 bytes) ---
  const headerBytes = parseInt(readField(buffer, decoder, 184, 8)) || 0;
  const numDataRecords = parseInt(readField(buffer, decoder, 236, 8)) || 0;
  const recordDuration = parseFloat(readField(buffer, decoder, 244, 8)) || 1;
  const numSignals = parseInt(readField(buffer, decoder, 252, 4)) || 0;

  if (numSignals === 0 || numDataRecords === 0 || headerBytes === 0) return null;
  if (buffer.byteLength < headerBytes) return null;

  // Total recording duration in seconds
  const totalRecordingSeconds = numDataRecords * recordDuration;

  // --- Find "EDF Annotations" signal ---
  let annotIdx = -1;
  for (let i = 0; i < numSignals; i++) {
    const label = readField(buffer, decoder, 256 + i * 16, 16);
    if (label.toLowerCase().includes('edf annotation')) {
      annotIdx = i;
      break;
    }
  }

  if (annotIdx === -1) return null;

  // --- Read numSamples per signal (needed to compute record layout) ---
  const samplesPerSignal: number[] = [];
  const samplesOffset = 256 + numSignals * (16 + 80 + 8 + 8 + 8 + 8 + 8 + 80);
  for (let i = 0; i < numSignals; i++) {
    samplesPerSignal.push(
      parseInt(readField(buffer, decoder, samplesOffset + i * 8, 8)) || 0
    );
  }

  // Annotation signal bytes per record = numSamples * 2 (EDF stores as int16 but TAL uses raw bytes)
  const annotBytesPerRecord = samplesPerSignal[annotIdx]! * 2;
  if (annotBytesPerRecord === 0) return null;

  // Compute byte offset of annotation signal within each data record
  let annotOffsetInRecord = 0;
  for (let i = 0; i < annotIdx; i++) {
    annotOffsetInRecord += samplesPerSignal[i]! * 2;
  }

  const recordSize = samplesPerSignal.reduce((sum, n) => sum + n * 2, 0);

  // --- Parse each data record's annotation bytes ---
  interface RawAnnotation {
    onsetSec: number;
    durationSec: number;
    label: string;
  }
  const annotations: RawAnnotation[] = [];
  const utf8Decoder = new TextDecoder('utf-8');

  for (let rec = 0; rec < numDataRecords; rec++) {
    const recordStart = headerBytes + rec * recordSize;
    const annotStart = recordStart + annotOffsetInRecord;
    const annotEnd = annotStart + annotBytesPerRecord;

    if (annotEnd > buffer.byteLength) break;

    const annotBytes = new Uint8Array(buffer, annotStart, annotBytesPerRecord);
    const annotStr = utf8Decoder.decode(annotBytes);

    // Split on \x00 to get individual TALs
    const tals = annotStr.split('\x00');

    for (const tal of tals) {
      if (tal.length === 0) continue;
      const parsed = parseTAL(tal);
      if (parsed) annotations.push(parsed);
    }
  }

  // Sort annotations by onset time
  annotations.sort((a, b) => a.onsetSec - b.onsetSec);

  // --- Pair CSR Start / CSR End annotations ---
  const episodes: CSREpisode[] = [];
  let openStart: number | null = null;

  for (const ann of annotations) {
    const labelLower = ann.label.toLowerCase().trim();

    if (labelLower === 'csr start') {
      // If there's already an open start, close it at this new start
      // (shouldn't happen normally but handle gracefully)
      if (openStart !== null) {
        const duration = ann.onsetSec - openStart;
        if (duration > 0) {
          episodes.push({
            startSec: openStart,
            endSec: ann.onsetSec,
            durationSec: duration,
          });
        }
      }
      openStart = ann.onsetSec;
    } else if (labelLower === 'csr end') {
      if (openStart !== null) {
        const endSec = ann.onsetSec;
        const duration = endSec - openStart;
        if (duration > 0) {
          episodes.push({
            startSec: openStart,
            endSec,
            durationSec: duration,
          });
        }
        openStart = null;
      }
      // Ignore orphan CSR End (no matching start)
    }
  }

  // Handle unpaired CSR Start at end of recording
  if (openStart !== null) {
    const duration = totalRecordingSeconds - openStart;
    if (duration > 0) {
      episodes.push({
        startSec: openStart,
        endSec: totalRecordingSeconds,
        durationSec: duration,
      });
    }
  }

  const totalCSRSeconds = episodes.reduce((sum, ep) => sum + ep.durationSec, 0);
  const csrPercentage = totalRecordingSeconds > 0
    ? (totalCSRSeconds / totalRecordingSeconds) * 100
    : 0;

  return {
    episodes,
    totalCSRSeconds: Math.round(totalCSRSeconds * 100) / 100,
    csrPercentage: Math.round(csrPercentage * 100) / 100,
    episodeCount: episodes.length,
  };
}

/**
 * Parse a single TAL (Time-stamped Annotation List) string.
 * CSL TALs may have duration (CSR Start: +onset\x15duration\x14CSR Start\x14)
 * or just onset (timekeeping: +onset\x14\x14).
 * Returns null for timekeeping TALs or unrecognised annotations.
 */
function parseTAL(tal: string): { onsetSec: number; durationSec: number; label: string } | null {
  // Find separator positions
  const durationSepIdx = tal.indexOf('\x15');
  const annotSepIdx = tal.indexOf('\x14');

  if (annotSepIdx === -1) return null;

  let onsetStr: string;
  let durationStr = '0';

  if (durationSepIdx !== -1 && durationSepIdx < annotSepIdx) {
    // Has explicit duration: +onset\x15duration\x14annotation\x14
    onsetStr = tal.slice(0, durationSepIdx);
    durationStr = tal.slice(durationSepIdx + 1, annotSepIdx);
  } else {
    // No duration separator before annotation — onset only
    onsetStr = tal.slice(0, annotSepIdx);
  }

  // Extract annotation text between first \x14 and second \x14 (or end)
  const restAfterFirstSep = tal.slice(annotSepIdx + 1);
  const secondSepIdx = restAfterFirstSep.indexOf('\x14');
  const annotationText = secondSepIdx >= 0
    ? restAfterFirstSep.slice(0, secondSepIdx)
    : restAfterFirstSep;

  const onset = parseFloat(onsetStr.replace('+', ''));
  const duration = parseFloat(durationStr);

  if (isNaN(onset)) return null;

  const labelLower = annotationText.toLowerCase().trim();

  // Skip non-event annotations
  if (SKIP_LABELS.has(labelLower)) return null;

  // Only accept CSR-related annotations
  if (labelLower !== 'csr start' && labelLower !== 'csr end') return null;

  return {
    onsetSec: onset,
    durationSec: isNaN(duration) ? 0 : duration,
    label: annotationText.trim(),
  };
}

function readField(buffer: ArrayBuffer, decoder: TextDecoder, offset: number, length: number): string {
  if (offset + length > buffer.byteLength) return '';
  return decoder.decode(new Uint8Array(buffer, offset, length)).trim();
}
