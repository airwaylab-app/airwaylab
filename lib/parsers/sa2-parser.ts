// ============================================================
// AirwayLab — SA2 EDF Parser
// Parses ResMed _SA2.edf files containing pulse oximetry data
// (SpO2 + Pulse Rate) from integrated/paired pulse oximeters.
// Output: ParsedOximetry (same type as oximetry-csv-parser.ts)
// ============================================================

import type { OximetrySample, ParsedOximetry } from './oximetry-csv-parser';

interface SA2Signal {
  label: string;
  physicalDimension: string;
  physicalMin: number;
  physicalMax: number;
  digitalMin: number;
  digitalMax: number;
  numSamples: number;
}

/**
 * Parse a ResMed SA2 EDF file and extract SpO2/Pulse data as OximetrySample[].
 *
 * Throws if:
 * - No SpO2 signal found (caller should catch and skip)
 * - File has 0 data records
 * - Buffer is truncated
 */
export function parseSA2(buffer: ArrayBuffer, filePath: string): ParsedOximetry {
  const view = new DataView(buffer);
  const decoder = new TextDecoder('ascii');

  // --- Fixed header (256 bytes) ---
  const numDataRecords = parseInt(readField(buffer, decoder, 236, 8)) || 0;
  const recordDuration = parseFloat(readField(buffer, decoder, 244, 8)) || 1;
  const numSignals = parseInt(readField(buffer, decoder, 252, 4)) || 0;
  const headerBytes = parseInt(readField(buffer, decoder, 184, 8)) || 0;

  // Parse recording date
  const startDateStr = readField(buffer, decoder, 168, 8);
  const startTimeStr = readField(buffer, decoder, 176, 8);
  const dateParts = startDateStr.split('.');
  let year = parseInt(dateParts[2] || '0');
  if (year < 100) {
    year += year < 85 ? 2000 : 1900;
  }
  const timeParts = startTimeStr.split('.');
  const recordingDate = new Date(
    year,
    parseInt(dateParts[1] || '1') - 1,
    parseInt(dateParts[0] || '1'),
    parseInt(timeParts[0] || '0'),
    parseInt(timeParts[1] || '0'),
    parseInt(timeParts[2] || '0')
  );

  if (numDataRecords === 0) {
    throw new Error('SA2 file has no data records');
  }

  // --- Per-signal headers ---
  const signals: SA2Signal[] = [];
  let offset = 256;

  // Labels (16 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals.push({
      label: readField(buffer, decoder, offset + i * 16, 16),
      physicalDimension: '',
      physicalMin: 0,
      physicalMax: 0,
      digitalMin: 0,
      digitalMax: 0,
      numSamples: 0,
    });
  }
  offset += numSignals * 16;

  // Transducer (80 bytes each) — skip
  offset += numSignals * 80;

  // Physical dimensions (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.physicalDimension = readField(buffer, decoder, offset + i * 8, 8);
  }
  offset += numSignals * 8;

  // Physical min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.physicalMin = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += numSignals * 8;

  // Physical max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.physicalMax = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += numSignals * 8;

  // Digital min (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.digitalMin = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += numSignals * 8;

  // Digital max (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.digitalMax = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += numSignals * 8;

  // Prefiltering (80 bytes each) — skip
  offset += numSignals * 80;

  // Num samples per record (8 bytes each)
  for (let i = 0; i < numSignals; i++) {
    signals[i]!.numSamples = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += numSignals * 8;

  // Reserved (32 bytes each) — skip

  // --- Find SpO2 and Pulse signal indices ---
  const spo2Idx = signals.findIndex((s) => {
    const label = s.label.toLowerCase().replace(/\s+/g, '');
    return label.includes('spo2') || label.includes('oxygen');
  });

  if (spo2Idx === -1) {
    throw new Error(`No SpO2 signal found in SA2 file (signals: ${signals.map((s) => s.label).join(', ')})`);
  }

  const pulseIdx = signals.findIndex((s) => {
    const label = s.label.toLowerCase();
    return label.includes('pulse') || label.includes('heart') || /\bpr\b/.test(label);
  });

  const hasPulse = pulseIdx >= 0;

  // --- Validate buffer size ---
  const samplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  const expectedBytes = headerBytes + numDataRecords * samplesPerRecord * 2;
  if (buffer.byteLength < expectedBytes) {
    throw new Error(
      `Truncated SA2 file: expected ${expectedBytes} bytes but got ${buffer.byteLength}`
    );
  }

  // --- Precompute scaling ---
  const spo2Sig = signals[spo2Idx]!;
  const spo2DigRange = spo2Sig.digitalMax - spo2Sig.digitalMin;
  const spo2Scale = spo2DigRange === 0 ? 0 : (spo2Sig.physicalMax - spo2Sig.physicalMin) / spo2DigRange;
  const spo2Offset = spo2Sig.physicalMin;
  const spo2DigMin = spo2Sig.digitalMin;

  let pulseScale = 0;
  let pulseOffset = 0;
  let pulseDigMin = 0;
  if (hasPulse) {
    const pSig = signals[pulseIdx]!;
    const pDigRange = pSig.digitalMax - pSig.digitalMin;
    pulseScale = pDigRange === 0 ? 0 : (pSig.physicalMax - pSig.physicalMin) / pDigRange;
    pulseOffset = pSig.physicalMin;
    pulseDigMin = pSig.digitalMin;
  }

  // --- Read data records ---
  const spo2SamplingRate = spo2Sig.numSamples / recordDuration;
  const samples: OximetrySample[] = [];

  let dataOffset = headerBytes;
  let sampleIdx = 0;

  for (let rec = 0; rec < numDataRecords; rec++) {
    let recordPtr = dataOffset;

    // Collect values for this record
    const spo2Values: number[] = [];
    const pulseValues: number[] = [];

    for (let sig = 0; sig < numSignals; sig++) {
      const samplesInRecord = signals[sig]!.numSamples;

      if (sig === spo2Idx) {
        for (let s = 0; s < samplesInRecord; s++) {
          const dv = view.getInt16(recordPtr + s * 2, true);
          spo2Values.push((dv - spo2DigMin) * spo2Scale + spo2Offset);
        }
      } else if (sig === pulseIdx) {
        for (let s = 0; s < samplesInRecord; s++) {
          const dv = view.getInt16(recordPtr + s * 2, true);
          pulseValues.push((dv - pulseDigMin) * pulseScale + pulseOffset);
        }
      }

      recordPtr += samplesInRecord * 2;
    }

    // Convert SpO2 samples (primary signal — one sample per record for 1Hz)
    for (let s = 0; s < spo2Values.length; s++) {
      const rawSpo2 = Math.round(spo2Values[s]!);
      const rawHr = hasPulse && s < pulseValues.length ? Math.round(pulseValues[s]!) : -1;

      const spo2InRange = rawSpo2 >= 50 && rawSpo2 <= 100;
      const spo2 = spo2InRange ? rawSpo2 : -1;
      const hr = rawHr > 0 ? rawHr : -1;

      const timeMs = recordingDate.getTime() + (sampleIdx / spo2SamplingRate) * 1000;

      samples.push({
        time: new Date(timeMs),
        spo2,
        hr,
        motion: 0,
        valid: spo2InRange && (hasPulse ? hr > 0 : true),
      });

      sampleIdx++;
    }

    dataOffset = recordPtr;
  }

  if (samples.length === 0) {
    throw new Error('No samples extracted from SA2 file');
  }

  // --- Determine night date ---
  const dateStr = determineSA2NightDate(filePath, recordingDate);

  const startTime = samples[0]!.time;
  const endTime = samples[samples.length - 1]!.time;
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  const intervalSeconds = spo2SamplingRate > 0 ? 1 / spo2SamplingRate : 2;

  return {
    samples,
    startTime,
    endTime,
    durationSeconds,
    dateStr,
    intervalSeconds,
  };
}

/**
 * Determine the sleep night date for an SA2 file.
 * Uses the same logic as the EDF night grouper:
 * 1. DATALOG folder date (most reliable)
 * 2. Time heuristic: 6PM–midnight → current, midnight–noon → previous
 */
function determineSA2NightDate(filePath: string, recordingDate: Date): string {
  // Try DATALOG folder date
  const folderMatch = filePath.match(/DATALOG\/(\d{8})\//);
  if (folderMatch) {
    const d = folderMatch[1]!;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }

  // Fallback: time heuristic
  const hour = recordingDate.getHours();
  let nightDate: Date;

  if (hour >= 18) {
    nightDate = recordingDate;
  } else if (hour < 12) {
    nightDate = new Date(recordingDate);
    nightDate.setDate(nightDate.getDate() - 1);
  } else {
    nightDate = recordingDate;
  }

  return `${nightDate.getFullYear()}-${String(nightDate.getMonth() + 1).padStart(2, '0')}-${String(nightDate.getDate()).padStart(2, '0')}`;
}

function readField(buffer: ArrayBuffer, decoder: TextDecoder, offset: number, length: number): string {
  return decoder.decode(new Uint8Array(buffer, offset, length)).trim();
}
