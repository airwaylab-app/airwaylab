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
  /** Ramp enabled (from S.RampEnable). Optional — not all devices expose this. */
  rampEnabled?: boolean | null;
  /** Ramp time in minutes (from S.RampTime) */
  rampTime?: number | null;
  /** Ramp start pressure (from S.RampPress) */
  rampPressure?: number | null;
  /** Humidifier level (from S.Humid.Level) */
  humidifierLevel?: number | null;
  /** Climate control auto mode (from S.ClimateControl) */
  climateControlAuto?: boolean | null;
  /** Heated tube temperature (from S.TubeTemp) */
  tubeTempSetting?: number | null;
  /** Mask type (from S.Mask) */
  maskType?: string | null;
  /** Smart start enabled (from S.SmartStart) */
  smartStart?: boolean | null;
  /** All additional S.* signals not captured in typed fields above. */
  extendedSettings?: Record<string, number>;
  /** Whether settings were actually extracted from STR.edf or are fallback defaults. */
  settingsSource: 'extracted' | 'unavailable';
}

export type CaffeineLevel = 'none' | 'before-noon' | 'afternoon' | 'evening';
export type AlcoholLevel = 'none' | '1-2' | '3+';
export type CongestionLevel = 'none' | 'mild' | 'severe';
export type SleepPosition = 'back' | 'side' | 'stomach' | 'mixed';
export type StressLevel = 'low' | 'moderate' | 'high';
export type ExerciseLevel = 'none' | 'light' | 'intense';

export interface NightNotes {
  caffeine: CaffeineLevel | null;
  alcohol: AlcoholLevel | null;
  congestion: CongestionLevel | null;
  position: SleepPosition | null;
  stress: StressLevel | null;
  exercise: ExerciseLevel | null;
  note: string;
  symptomRating: number | null;
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

  // Hypopnea aggregate metrics (v0.7.0+)
  hypopneaCount?: number;
  hypopneaIndex?: number;
  hypopneaSource?: 'machine' | 'algorithm';
  hypopneaNedInvisibleCount?: number;
  hypopneaNedInvisiblePct?: number;
  hypopneaMeanDropPct?: number;
  hypopneaMeanDurationS?: number;
  hypopneaH1Index?: number;
  hypopneaH2Index?: number;

  // Brief obstruction metrics (v0.7.0+)
  briefObstructionCount?: number;
  briefObstructionIndex?: number;
  briefObstructionH1Index?: number;
  briefObstructionH2Index?: number;

  // Amplitude stability metrics (v0.7.0+)
  amplitudeCvOverall?: number;
  amplitudeCvMedianEpoch?: number;
  unstableEpochPct?: number;
}

/** Subset of MachineEvent relevant for passing to NED engine */
export interface MachineHypopneaSummary {
  onsetSec: number;
  durationSec: number;
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

export interface SettingsMetrics {
  /** Number of breaths used for settings analysis */
  breathCount: number;

  // Detected pressures (from BRP P10/P90)
  epapDetected: number;
  ipapDetected: number;
  psDetected: number;

  // Trigger
  triggerDelayMedianMs: number;
  triggerDelayP10Ms: number;
  triggerDelayP90Ms: number;
  autoTriggerPct: number;

  // Cycle
  tiMedianMs: number;
  tiP25Ms: number;
  tiP75Ms: number;
  teMedianMs: number;
  ieRatio: number;
  timeAtIpapMedianMs: number;
  timeAtIpapP25Ms: number;
  ipapDwellMedianPct: number;
  ipapDwellP10Pct: number;
  prematureCyclePct: number;
  lateCyclePct: number;

  // EPAP
  endExpPressureMean: number;
  endExpPressureSd: number;

  // Ventilation
  tidalVolumeMedianMl: number;
  tidalVolumeP25Ml: number;
  tidalVolumeP75Ml: number;
  tidalVolumeCv: number;
  minuteVentProxy: number;
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
  settingsMetrics: SettingsMetrics | null;
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

export interface WorkerNightResult {
  type: 'NIGHT_RESULT';
  night: NightResult;
  nightIndex: number;
  totalNights: number;
}

export interface WorkerError {
  type: 'ERROR';
  error: string;
}

export interface WorkerWarning {
  type: 'WARNING';
  checkpoint: string;
  detail: string;
  tags: Record<string, string | number>;
}

export interface WorkerSettingsDiagnostic {
  type: 'SETTINGS_DIAGNOSTIC';
  deviceModel: string;
  signalLabels: string[];
  identificationText: string | null;
  hasStrFile: boolean;
}

export type WorkerResponse = WorkerProgress | WorkerResult | WorkerNightResult | WorkerOximetryResult | WorkerError | WorkerWarning | WorkerSettingsDiagnostic;
