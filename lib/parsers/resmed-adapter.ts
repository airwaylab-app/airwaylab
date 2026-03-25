// ============================================================
// AirwayLab — ResMed EDF → ParsedSession Adapter
// Converts EDFFile objects to the unified ParsedSession format
// ============================================================

import type { EDFFile, ParsedSession } from '../types';

/**
 * Convert an EDFFile to a ParsedSession.
 * This is a zero-copy passthrough — flow/pressure data references are shared,
 * not cloned. The adapter exists so downstream code can work with a single type.
 */
export function edfToSession(edf: EDFFile): ParsedSession {
  return {
    deviceType: 'resmed',
    deviceModel: 'ResMed',
    filePath: edf.filePath,
    flowData: edf.flowData,
    pressureData: edf.pressureData,
    samplingRate: edf.samplingRate,
    durationSeconds: edf.durationSeconds,
    recordingDate: edf.recordingDate,
  };
}
