// ============================================================
// AirwayLab — Waveform Type Definitions
// Types for the flow data browser / waveform viewer
// ============================================================

/** A single data point in the downsampled waveform (min/max envelope) */
export interface WaveformPoint {
  /** Elapsed seconds from session start */
  t: number;
  /** Minimum flow value in this time bucket (L/min) */
  min: number;
  /** Maximum flow value in this time bucket (L/min) */
  max: number;
  /** Mean flow value in this time bucket (L/min) */
  avg: number;
}

/** A single data point in the downsampled pressure waveform */
export interface PressurePoint {
  /** Elapsed seconds from session start */
  t: number;
  /** Mean pressure in this time bucket (cmH₂O) */
  avg: number;
}

/** A single data point in the downsampled leak trace */
export interface LeakPoint {
  /** Elapsed seconds from session start */
  t: number;
  /** Mean leak rate in this time bucket (L/min) */
  avg: number;
  /** Maximum leak rate in this time bucket (L/min) */
  max: number;
}

/** A detected event rendered on the waveform */
export interface WaveformEvent {
  /** Start time in elapsed seconds */
  startSec: number;
  /** End time in elapsed seconds */
  endSec: number;
  /** Event type identifier */
  type: 'rera' | 'flow-limitation' | 'm-shape';
  /** Human-readable label */
  label: string;
}

/** Complete waveform data for a single night */
export interface WaveformData {
  /** Night date string (YYYY-MM-DD) */
  dateStr: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Original sampling rate (Hz) */
  originalSampleRate: number;
  /** Downsampled flow envelope */
  flow: WaveformPoint[];
  /** Downsampled pressure trace (if available) */
  pressure: PressurePoint[];
  /** Downsampled leak rate trace (if available) */
  leak: LeakPoint[];
  /** Detected events mapped to timeline */
  events: WaveformEvent[];
  /** Summary stats */
  stats: {
    breathCount: number;
    flowMin: number;
    flowMax: number;
    flowMean: number;
    pressureMin: number | null;
    pressureMax: number | null;
    leakMean: number | null;
    leakMax: number | null;
    leakP95: number | null;
  };
}

/** Message sent to the waveform worker */
export interface WaveformWorkerMessage {
  type: 'EXTRACT_WAVEFORM';
  files: { buffer: ArrayBuffer; path: string }[];
  targetDate: string;
  bucketSeconds: number;
}

/** Response from the waveform worker */
export interface WaveformWorkerResult {
  type: 'WAVEFORM_RESULT';
  waveform: WaveformData | null;
  error?: string;
}

export type WaveformWorkerResponse = WaveformWorkerResult;
