// ============================================================
// AirwayLab — Waveform Type Definitions
// Types for the flow data browser / waveform viewer
// ============================================================

/** A single decimated flow sample — actual measured value, not a computed aggregate */
export interface FlowSample {
  /** Elapsed seconds from session start */
  t: number;
  /** Actual measured flow rate (L/min) */
  value: number;
}

/**
 * @deprecated Use FlowSample instead. Kept for backward compatibility during transition.
 */
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

/** A single tidal volume data point */
export interface TidalVolumePoint {
  /** Elapsed seconds from session start */
  t: number;
  /** Estimated tidal volume (mL) */
  avg: number;
}

/** A single respiratory rate data point */
export interface RespiratoryRatePoint {
  /** Elapsed seconds from session start */
  t: number;
  /** Breaths per minute */
  avg: number;
}

/** A detected event rendered on the waveform */
export interface WaveformEvent {
  /** Start time in elapsed seconds */
  startSec: number;
  /** End time in elapsed seconds */
  endSec: number;
  /** Event type identifier */
  type: 'rera' | 'flow-limitation' | 'm-shape'
    | 'obstructive-apnea' | 'central-apnea' | 'hypopnea' | 'unclassified-apnea';
  /** Human-readable label */
  label: string;
}

/** Summary statistics computed from waveform data */
export interface WaveformStats {
  breathCount: number;
  flowMin: number;
  flowMax: number;
  flowMean: number;
  pressureMin: number | null;
  pressureMax: number | null;
  /** 10th percentile of pressure — approximates delivered EPAP */
  pressureP10: number | null;
  /** 90th percentile of pressure — approximates delivered IPAP */
  pressureP90: number | null;
  /** Mean pressure across the session */
  pressureMean: number | null;
  leakMean: number | null;
  leakMax: number | null;
  leakP95: number | null;
}

/**
 * Raw waveform data stored in IndexedDB.
 * Contains full-resolution Float32Arrays for on-demand decimation.
 */
export interface StoredWaveform {
  /** Night date string (YYYY-MM-DD) */
  dateStr: string;
  /** Full 25 Hz raw flow data */
  flow: Float32Array;
  /** Full raw pressure data (if available) */
  pressure: Float32Array | null;
  /** Sampling rate (Hz) */
  sampleRate: number;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Pre-detected events */
  events: WaveformEvent[];
  /** Summary stats */
  stats: WaveformStats;
  /** Estimated tidal volume per bucket */
  tidalVolume: TidalVolumePoint[];
  /** Estimated respiratory rate per bucket */
  respiratoryRate: RespiratoryRatePoint[];
  /** Leak data (placeholder — currently empty) */
  leak: LeakPoint[];
  /** Timestamp when stored (for TTL) */
  storedAt: number;
  /** Engine version for cache invalidation */
  engineVersion: string;
}

/** Message sent to the waveform worker */
export interface WaveformWorkerMessage {
  type: 'EXTRACT_WAVEFORM';
  files: { buffer: ArrayBuffer; path: string }[];
  targetDate: string;
}

/** Response from the waveform worker — returns raw Float32Arrays */
export interface RawWaveformResult {
  type: 'RAW_WAVEFORM_RESULT';
  /** Raw flow data at original sample rate */
  flow: Float32Array | null;
  /** Raw pressure data at original sample rate */
  pressure: Float32Array | null;
  /** Original sampling rate (Hz) */
  sampleRate: number;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Detected events */
  events: WaveformEvent[];
  /** Summary stats */
  stats: WaveformStats;
  /** Tidal volume per bucket */
  tidalVolume: TidalVolumePoint[];
  /** Respiratory rate per bucket */
  respiratoryRate: RespiratoryRatePoint[];
  /** Leak data */
  leak: LeakPoint[];
  /** Night date string */
  dateStr: string;
  /** Error message if extraction failed */
  error?: string;
}

export type WaveformWorkerResponse = RawWaveformResult;
