// ============================================================
// AirwayLab — EVE.edf Parser (Machine-Recorded Events)
// Parses EDF+ Annotations (TAL format) from ResMed EVE.edf files.
// Extracts apnea, hypopnea, and other machine-scored events.
// ============================================================

interface MachineEvent {
  /** Seconds from session start */
  onsetSec: number;
  /** Duration in seconds */
  durationSec: number;
  /** Raw annotation label from EVE.edf */
  rawLabel: string;
  /** Normalised event type */
  type: 'obstructive-apnea' | 'central-apnea' | 'hypopnea' | 'unclassified-apnea';
}

/** Map lowercase annotation labels to normalised event types */
const LABEL_MAP: Record<string, MachineEvent['type']> = {
  'obstructive apnea': 'obstructive-apnea',
  'central apnea': 'central-apnea',
  'hypopnea': 'hypopnea',
  'apnea': 'unclassified-apnea',
};

/** Labels to silently skip (not events) */
const SKIP_LABELS = new Set(['recording starts', '']);

/**
 * Parse an EVE.edf file and extract machine-recorded events.
 * Returns an empty array if the file can't be parsed (non-fatal).
 */
export function parseEVE(buffer: ArrayBuffer): MachineEvent[] {
  try {
    return parseEVEUnsafe(buffer);
  } catch {
    return [];
  }
}

function parseEVEUnsafe(buffer: ArrayBuffer): MachineEvent[] {
  if (buffer.byteLength < 256) return [];

  const decoder = new TextDecoder('ascii');

  // --- Fixed header (256 bytes) ---
  const headerBytes = parseInt(readField(buffer, decoder, 184, 8)) || 0;
  const numDataRecords = parseInt(readField(buffer, decoder, 236, 8)) || 0;
  const numSignals = parseInt(readField(buffer, decoder, 252, 4)) || 0;

  if (numSignals === 0 || numDataRecords === 0 || headerBytes === 0) return [];
  if (buffer.byteLength < headerBytes) return [];

  // --- Find "EDF Annotations" signal ---
  let annotIdx = -1;
  for (let i = 0; i < numSignals; i++) {
    const label = readField(buffer, decoder, 256 + i * 16, 16);
    if (label.toLowerCase().includes('edf annotation')) {
      annotIdx = i;
      break;
    }
  }

  if (annotIdx === -1) return [];

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
  if (annotBytesPerRecord === 0) return [];

  // Compute byte offset of annotation signal within each data record
  let annotOffsetInRecord = 0;
  for (let i = 0; i < annotIdx; i++) {
    annotOffsetInRecord += samplesPerSignal[i]! * 2;
  }

  const recordSize = samplesPerSignal.reduce((sum, n) => sum + n * 2, 0);

  // --- Parse each data record's annotation bytes ---
  const events: MachineEvent[] = [];
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

      // Parse TAL: +onset\x14\x14 (timekeeping) or +onset\x15duration\x14annotation\x14
      const event = parseTAL(tal);
      if (event) events.push(event);
    }
  }

  // Sort by onset time
  events.sort((a, b) => a.onsetSec - b.onsetSec);

  return events;
}

/**
 * Parse a single TAL (Time-stamped Annotation List) string.
 * Format: +onset\x15duration\x14annotation\x14
 * Returns null if it's a timekeeping TAL or unrecognised annotation.
 */
function parseTAL(tal: string): MachineEvent | null {
  // Find the onset (before \x15 or \x14)
  const durationSepIdx = tal.indexOf('\x15');
  const annotSepIdx = tal.indexOf('\x14');

  if (annotSepIdx === -1) return null;

  // If no \x15, this is a timekeeping TAL (+onset\x14\x14) — skip
  if (durationSepIdx === -1 || durationSepIdx > annotSepIdx) return null;

  const onsetStr = tal.slice(0, durationSepIdx);
  const durationStr = tal.slice(durationSepIdx + 1, annotSepIdx);

  // Extract annotation text between first \x14 and second \x14 (or end)
  const restAfterFirstSep = tal.slice(annotSepIdx + 1);
  const secondSepIdx = restAfterFirstSep.indexOf('\x14');
  const annotationText = secondSepIdx >= 0
    ? restAfterFirstSep.slice(0, secondSepIdx)
    : restAfterFirstSep;

  const onset = parseFloat(onsetStr.replace('+', ''));
  const duration = parseFloat(durationStr);

  if (isNaN(onset) || isNaN(duration)) return null;

  const labelLower = annotationText.toLowerCase().trim();

  // Skip non-event annotations
  if (SKIP_LABELS.has(labelLower)) return null;

  // Map to event type
  const type = LABEL_MAP[labelLower];
  if (!type) return null;

  return {
    onsetSec: onset,
    durationSec: duration,
    rawLabel: annotationText.trim(),
    type,
  };
}

function readField(buffer: ArrayBuffer, decoder: TextDecoder, offset: number, length: number): string {
  if (offset + length > buffer.byteLength) return '';
  return decoder.decode(new Uint8Array(buffer, offset, length)).trim();
}
