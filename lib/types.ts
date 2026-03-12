// ============================================================
// AirwayLab — Core Type Definitions
// ============================================================

export interface EDFHeader {
  version: string;
  patientId: string;
  recordingId: string;
  startDate: string;
  startTime: string;
  headerBytes: number;
  reserved: string;
  numDataRecords: number;
  recordDuration: number;
  numSignals: number;
}

export interface EDFSignal {
  label: string;
  transducer: string;
  physicalDimension: string;
  physicalMin: number;
  physicalMax: number;
  digitalMin: number;
  digitalMax: number;
  prefiltering: string;
  numSamples: number;
  reserved: string;
}

export interface EDFFile {
  header: EDFHeader;
  signals: EDFSignal[];
  recordingDate: Date;
  flowData: Float32Array;
  pressureData: Float32Array | null;
  samplingRate: number;
  durationSeconds: number;
  filePath: string;
}

export interface MachineSettings {
  deviceModel: string;
  epap: number;
  ipap: number;
  pressureSupport: number;
  papMode: string;
  riseTime: number | null;
  trigger: string;
  cycle: string;
  easyBreathe: boolean;
}

export interface GlasgowComponents {
  overall: number;
  skew: number;
  spike: number;
  flatTop: number;
  topHeavy: number;
  multiPeak: number;
  noPause: number;
  inspirRate: number;
  multiBreath: number;
  variableAmp: number;
}

export interface WATResults {
  flScore: number;
  regularityScore: number;
  periodicityIndex: number;
}

export interface Breath {
  inspStart: number;
  inspEnd: number;
  expStart: number;
  expEnd: number;
  inspFlow: Float32Array;
  qPeak: number;
  qMid: number;
  ti: number;
  tPeakTi: number;
  ned: number;
  fi: number;
  isMShape: boolean;
  isEarlyPeakFL: boolean;
}

export interface RERACandidate {
  startBreathIdx: number;
  endBreathIdx: number;
  breathCount: number;
  nedSlope: number;
  hasRecovery: boolean;
  hasSigh: boolean;
  maxNED: number;
}

export interface NEDResults {
  breathCount: number;
  nedMean: number;
  nedMedian: number;
  nedP95: number;
  nedClearFLPct: number;
  nedBorderlinePct: number;
  fiMean: number;
  fiFL85Pct: number;
  tpeakMean: number;
  mShapePct: number;
  reraIndex: number;
  reraCount: number;
  h1NedMean: number;
  h2NedMean: number;
  combinedFLPct: number;
  estimatedArousalIndex: number;
}

export interface OximetryResults {
  // SpO2 (4)
  odi3: number;
  odi4: number;
  tBelow90: number;
  tBelow94: number;

  // HR Clinical — 30-second rolling mean baseline (4)
  hrClin8: number;
  hrClin10: number;
  hrClin12: number;
  hrClin15: number;

  // HR Rolling Mean — 5-minute baseline, 5s sustain (2)
  hrMean10: number;
  hrMean15: number;

  // Coupled — ODI3 event + HR surge within ±30s (2)
  coupled3_6: number;
  coupled3_10: number;
  coupledHRRatio: number;

  // Summary (4)
  spo2Mean: number;
  spo2Min: number;
  hrMean: number;
  hrSD: number;

  // H1/H2 splits
  h1: { hrClin10: number; odi3: number; tBelow94: number };
  h2: { hrClin10: number; odi3: number; tBelow94: number };

  // Cleaning stats
  totalSamples: number;
  retainedSamples: number;
  doubleTrackingCorrected: number;
}

export interface OximetryTracePoint {
  t: number;
  spo2: number;
  hr: number;
}

export interface OximetryTraceData {
  trace: OximetryTracePoint[];
  durationSeconds: number;
  odi3Events: number[];
  odi4Events: number[];
}

export interface NightResult {
  date: Date;
  dateStr: string;
  durationHours: number;
  sessionCount: number;
  settings: MachineSettings;
  glasgow: GlasgowComponents;
  wat: WATResults;
  ned: NEDResults;
  oximetry: OximetryResults | null;
  oximetryTrace: OximetryTraceData | null;
}

export interface AnalysisState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: { current: number; total: number; stage: string };
  nights: NightResult[];
  error: string | null;
  therapyChangeDate: string | null;
  /** Non-fatal warning (e.g. oximetry CSV uploaded but no nights matched) */
  warning: string | null;
  /** Warning from persistence layer (e.g. oldest nights dropped due to storage cap) */
  persistenceWarning: string | null;
}

export interface WorkerAnalyzeMessage {
  type: 'ANALYZE';
  files: { buffer: ArrayBuffer; path: string }[];
  oximetryCSVs?: string[];
}

export interface WorkerOximetryOnlyMessage {
  type: 'ANALYZE_OXIMETRY';
  oximetryCSVs: string[];
}

export type WorkerMessage = WorkerAnalyzeMessage | WorkerOximetryOnlyMessage;

export interface WorkerProgress {
  type: 'PROGRESS';
  current: number;
  total: number;
  stage: string;
}

export interface WorkerResult {
  type: 'RESULTS';
  nights: NightResult[];
}

export interface WorkerOximetryResult {
  type: 'OXIMETRY_RESULTS';
  oximetryByDate: Record<string, OximetryResults>;
  oximetryTraceByDate: Record<string, OximetryTraceData>;
}

export interface WorkerError {
  type: 'ERROR';
  error: string;
}

export type WorkerResponse = WorkerProgress | WorkerResult | WorkerOximetryResult | WorkerError;
