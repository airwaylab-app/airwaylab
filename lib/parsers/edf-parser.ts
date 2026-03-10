// ============================================================
// AirwayLab — EDF (European Data Format) Parser
// Ported from DaveSkvn/GlasgowIndex EDFFile.js + WAT reference
// ============================================================

import type { EDFHeader, EDFSignal, EDFFile } from '../types';

/**
 * Parse an EDF file from an ArrayBuffer.
 * Returns header, signal metadata, flow data (Float32Array), optional pressure data,
 * sampling rate, duration, and recording date.
 */
export function parseEDF(buffer: ArrayBuffer, filePath: string): EDFFile {
  const view = new DataView(buffer);
  const decoder = new TextDecoder('ascii');

  // --- Fixed header (256 bytes) ---
  const header: EDFHeader = {
    version: readField(buffer, decoder, 0, 8),
    patientId: readField(buffer, decoder, 8, 80),
    recordingId: readField(buffer, decoder, 88, 80),
    startDate: readField(buffer, decoder, 168, 8),
    startTime: readField(buffer, decoder, 176, 8),
    headerBytes: parseInt(readField(buffer, decoder, 184, 8)) || 0,
    reserved: readField(buffer, decoder, 192, 44),
    numDataRecords: parseInt(readField(buffer, decoder, 236, 8)) || 0,
    recordDuration: parseFloat(readField(buffer, decoder, 244, 8)) || 1,
    numSignals: parseInt(readField(buffer, decoder, 252, 4)) || 0,
  };

  // --- Parse recording date ---
  const dateParts = header.startDate.split('.');
  let year = parseInt(dateParts[2] || '0');
  if (year < 100) {
    year += year < 85 ? 2000 : 1900;
  }
  const recordingDate = new Date(
    year,
    parseInt(dateParts[1] || '1') - 1,
    parseInt(dateParts[0] || '1'),
    ...parseTime(header.startTime)
  );

  // --- Per-signal headers ---
  let offset = 256;
  const n = header.numSignals;
  const signals: EDFSignal[] = [];

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
    signals[i].transducer = readField(buffer, decoder, offset + i * 80, 80);
  }
  offset += n * 80;

  for (let i = 0; i < n; i++) {
    signals[i].physicalDimension = readField(buffer, decoder, offset + i * 8, 8);
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].physicalMin = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].physicalMax = parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].digitalMin = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].digitalMax = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].prefiltering = readField(buffer, decoder, offset + i * 80, 80);
  }
  offset += n * 80;

  for (let i = 0; i < n; i++) {
    signals[i].numSamples = parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0;
  }
  offset += n * 8;

  for (let i = 0; i < n; i++) {
    signals[i].reserved = readField(buffer, decoder, offset + i * 32, 32);
  }

  // --- Find flow and pressure signal indices ---
  const flowIdx = signals.findIndex(
    (s) => s.label.toLowerCase().includes('flow') || s.label.toLowerCase().includes('flw')
  );
  if (flowIdx === -1) {
    throw new Error('No flow signal found in EDF file');
  }

  const pressIdx = signals.findIndex((s) => s.label.toLowerCase().includes('press'));

  const flowSignal = signals[flowIdx];
  const samplingRate = flowSignal.numSamples / header.recordDuration;
  const totalFlowSamples = header.numDataRecords * flowSignal.numSamples;
  const totalPressureSamples =
    pressIdx >= 0 ? header.numDataRecords * signals[pressIdx].numSamples : 0;

  // --- Validate buffer size ---
  const samplesPerRecord = signals.reduce((sum, s) => sum + s.numSamples, 0);
  const expectedBytes = header.headerBytes + header.numDataRecords * samplesPerRecord * 2;
  if (buffer.byteLength < expectedBytes) {
    throw new Error(
      `Truncated EDF file: expected ${expectedBytes} bytes but got ${buffer.byteLength}`
    );
  }

  // --- Read data records ---
  const flowData = new Float32Array(totalFlowSamples);
  const pressureData: Float32Array | null = pressIdx >= 0 ? new Float32Array(totalPressureSamples) : null;

  let dataOffset = header.headerBytes;
  let flowWriteIdx = 0;
  let pressWriteIdx = 0;

  // Precompute scaling factors
  const digitalRange = flowSignal.digitalMax - flowSignal.digitalMin;
  const flowScale = digitalRange === 0 ? 0 :
    (flowSignal.physicalMax - flowSignal.physicalMin) / digitalRange;
  const flowOffset_ = flowSignal.physicalMin;
  const flowDigMin = flowSignal.digitalMin;

  let pressScale = 0;
  let pressOffset_ = 0;
  let pressDigMin = 0;
  if (pressIdx >= 0) {
    const ps = signals[pressIdx];
    const pressDigRange = ps.digitalMax - ps.digitalMin;
    pressScale = pressDigRange === 0 ? 0 : (ps.physicalMax - ps.physicalMin) / pressDigRange;
    pressOffset_ = ps.physicalMin;
    pressDigMin = ps.digitalMin;
  }

  for (let rec = 0; rec < header.numDataRecords; rec++) {
    let recordPtr = dataOffset;

    for (let sig = 0; sig < n; sig++) {
      const samplesInRecord = signals[sig].numSamples;

      if (sig === flowIdx) {
        for (let s = 0; s < samplesInRecord; s++) {
          const digitalValue = view.getInt16(recordPtr + s * 2, true);
          flowData[flowWriteIdx++] =
            (digitalValue - flowDigMin) * flowScale + flowOffset_;
        }
      } else if (sig === pressIdx && pressureData) {
        for (let s = 0; s < samplesInRecord; s++) {
          const digitalValue = view.getInt16(recordPtr + s * 2, true);
          pressureData[pressWriteIdx++] =
            (digitalValue - pressDigMin) * pressScale + pressOffset_;
        }
      }

      recordPtr += samplesInRecord * 2;
    }

    dataOffset = recordPtr;
  }

  // Convert flow from L/s to L/min if needed.
  // ResMed BRP.edf files typically store flow in L/s, but the Glasgow/WAT/NED
  // engines use absolute thresholds calibrated for L/min (e.g. GREY_ZONE_UPPER = 5).
  // Without this ×60 conversion, all flow values fall inside the grey zone and
  // zero inspirations are detected, producing all-zero Glasgow scores.
  const flowUnit = flowSignal.physicalDimension.toLowerCase().trim();
  const isPerSecond = flowUnit.includes('/s');
  const isPerMinute = flowUnit.includes('/min') || flowUnit.includes('/m');

  if (isPerSecond || (!isPerMinute && Math.abs(flowSignal.physicalMax) < 10)) {
    for (let i = 0; i < totalFlowSamples; i++) {
      flowData[i] *= 60;
    }
  }

  const durationSeconds = header.numDataRecords * header.recordDuration;

  return {
    header,
    signals,
    recordingDate,
    flowData,
    pressureData,
    samplingRate,
    durationSeconds,
    filePath,
  };
}

/**
 * Parse an STR.edf file and return all signals with digital and physical values.
 * Used by settings-extractor to get machine settings.
 */
export function parseSTR(buffer: ArrayBuffer): {
  header: EDFHeader;
  signals: Array<EDFSignal & { digitalValues: number[]; physicalValues: number[] }>;
  startDateTime: Date;
} {
  const decoder = new TextDecoder('ascii');
  const view = new DataView(buffer);

  const header: EDFHeader = {
    version: readField(buffer, decoder, 0, 8),
    patientId: readField(buffer, decoder, 8, 80),
    recordingId: readField(buffer, decoder, 88, 80),
    startDate: readField(buffer, decoder, 168, 8),
    startTime: readField(buffer, decoder, 176, 8),
    headerBytes: parseInt(readField(buffer, decoder, 184, 8)) || 0,
    reserved: readField(buffer, decoder, 192, 44),
    numDataRecords: parseInt(readField(buffer, decoder, 236, 8)) || 0,
    recordDuration: parseFloat(readField(buffer, decoder, 244, 8)) || 1,
    numSignals: parseInt(readField(buffer, decoder, 252, 4)) || 0,
  };

  const dateParts = header.startDate.split('.');
  let year = parseInt(dateParts[2] || '0');
  if (year < 100) year += year < 85 ? 2000 : 1900;
  const startDateTime = new Date(
    year,
    parseInt(dateParts[1] || '1') - 1,
    parseInt(dateParts[0] || '1'),
    ...parseTime(header.startTime)
  );

  const n = header.numSignals;
  const rawSignals: Array<EDFSignal & { digitalValues: number[]; physicalValues: number[] }> = [];

  let offset = 256;
  const labels: string[] = [];
  for (let i = 0; i < n; i++) labels.push(readField(buffer, decoder, offset + i * 16, 16));
  offset += n * 16;

  const transducers: string[] = [];
  for (let i = 0; i < n; i++) transducers.push(readField(buffer, decoder, offset + i * 80, 80));
  offset += n * 80;

  const physDims: string[] = [];
  for (let i = 0; i < n; i++) physDims.push(readField(buffer, decoder, offset + i * 8, 8));
  offset += n * 8;

  const physMins: number[] = [];
  for (let i = 0; i < n; i++) physMins.push(parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  offset += n * 8;

  const physMaxs: number[] = [];
  for (let i = 0; i < n; i++) physMaxs.push(parseFloat(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  offset += n * 8;

  const digMins: number[] = [];
  for (let i = 0; i < n; i++) digMins.push(parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  offset += n * 8;

  const digMaxs: number[] = [];
  for (let i = 0; i < n; i++) digMaxs.push(parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  offset += n * 8;

  const prefilters: string[] = [];
  for (let i = 0; i < n; i++) prefilters.push(readField(buffer, decoder, offset + i * 80, 80));
  offset += n * 80;

  const samplesPerRec: number[] = [];
  for (let i = 0; i < n; i++) samplesPerRec.push(parseInt(readField(buffer, decoder, offset + i * 8, 8)) || 0);
  offset += n * 8;

  // skip reserved
  offset += n * 32;

  for (let i = 0; i < n; i++) {
    rawSignals.push({
      label: labels[i],
      transducer: transducers[i],
      physicalDimension: physDims[i],
      physicalMin: physMins[i],
      physicalMax: physMaxs[i],
      digitalMin: digMins[i],
      digitalMax: digMaxs[i],
      prefiltering: prefilters[i],
      numSamples: samplesPerRec[i],
      reserved: '',
      digitalValues: [],
      physicalValues: [],
    });
  }

  // Read data records
  let dataPtr = header.headerBytes;
  for (let rec = 0; rec < header.numDataRecords; rec++) {
    for (let sig = 0; sig < n; sig++) {
      const spr = rawSignals[sig].numSamples;
      const scale =
        rawSignals[sig].digitalMax !== rawSignals[sig].digitalMin
          ? (rawSignals[sig].physicalMax - rawSignals[sig].physicalMin) /
            (rawSignals[sig].digitalMax - rawSignals[sig].digitalMin)
          : 0;
      for (let s = 0; s < spr; s++) {
        const dv = view.getInt16(dataPtr, true);
        dataPtr += 2;
        rawSignals[sig].digitalValues.push(dv);
        rawSignals[sig].physicalValues.push(
          (dv - rawSignals[sig].digitalMin) * scale + rawSignals[sig].physicalMin
        );
      }
    }
  }

  return { header, signals: rawSignals, startDateTime };
}

// --- Helpers ---

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
