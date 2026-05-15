// ============================================================
// AirwayLab — Core Type Definitions
// ============================================================

// ============================================================
// Multi-device support types
// ============================================================

export type DeviceType = 'resmed' | 'bmc' | 'unknown';

/**
 * Unified session representation produced by device-specific parsers.
 * Analysis engines consume this — they never see device-specific formats.
 */
export interface ParsedSession {
  deviceType: DeviceType;
  deviceModel: string;
  filePath: string;
  flowData: Float32Array;
  pressureData: Float32Array | null;
  samplingRate: number;
  durationSeconds: number;
  recordingDate: Date;
  machineEvents?: ParsedMachineEvent[];
  deviceMeta?: Record<string, unknown>;
}

export interface ParsedMachineEvent {
  type: 'OSA' | 'CSA' | 'HYP' | 'RERA' | 'FL';
  onsetSec: number;
  durationSec: number;
}

// BMC-specific types (Luna 2 / RESmart G2/G3)

export type BMCTherapyMode = 'CPAP' | 'AutoCPAP' | 'S' | 'S/T' | 'T' | 'Titration' | 'AutoS';

export interface BMCIdxRecord {
  sequence: number;
  date: string;
  startFileExt: number;
  startPacketOffset: number;
  endFileExt: number;
  endPacketOffset: number;
  mode: BMCTherapyMode;
  initialPressure: number;
  treatPressure: number;
  maxPressure: number;
  rampTime: number | null;
  humidifier: number | null;
  maskType: string;
  reslexLevel: number;
}

export interface BMCEvtRecord {
  session: number;
  eventType: number;
  timestampSecs: number;
  durationSecs: number;
  value: number;
}

export interface BMCDeviceInfo {
  serial: string;
  model: string;
  firmware: string;
}

export interface BMCSessionSummary {
  date: string;
  durationMinutes: number;
  osaCount: number;
  csaCount: number;
  hypCount: number;
}

// ============================================================
// EDF types (ResMed)
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
  respEventData: Float32Array | null;  // BiPAP trigger/cycle event markers (25 Hz)
  samplingRate: number;
  durationSeconds: number;
  filePath: string;
  /** True when the file was shorter than expected and only partial records were parsed. */
  truncated?: boolean;
  /** Number of complete data records successfully parsed (set when truncated). */
  recordsParsed?: number;
  /** Number of data records expected per the EDF header (set when truncated). */
  recordsExpected?: number;
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
  /** Maximum inspiratory time in seconds (from S.TiMax) */
  tiMax?: number | null;
  /** Minimum inspiratory time in seconds (from S.TiMin) */
  tiMin?: number | null;
  /** All additional S.* signals not captured in typed fields above. */
  extendedSettings?: Record<string, number>;
  /** Whether settings were actually extracted from STR.edf or are fallback defaults. */
  settingsSource: 'extracted' | 'unavailable';
  // BMC-specific settings (optional, only populated for BMC devices)
  /** BMC Reslex (EPR equivalent) level: 0=Off, 1-3 */
  reslexLevel?: number;
  /** BMC auto-titration sensitivity (AutoCPAP mode) */
  autoSensitivity?: number;
  /** BMC tube type */
  tubeType?: string;
  /** BMC heated tube level */
  heatedTubeLevel?: number | null;
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
  startSec: number;
  durationSec: number;
}

export interface NEDResults {
  breathCount: number;
  /** Per-breath data — populated by engine, stored in IndexedDB, stripped from localStorage */
  breaths?: Breath[];
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
  reras?: RERACandidate[];

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

  // Machine RERA metrics (from EVE.edf)
  machineReraCount?: number;
  machineReraIndex?: number;

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

export interface CrossDeviceResults {
  couplingPct: number;
  h1CouplingPct: number;
  h2CouplingPct: number;
  matchedCount: number;
  totalCount: number;
  clockOffsetSec: number;
  offsetConfidence: 'high' | 'low';
  reraCoupledRate: number;
  nonReraRate: number;
  reason?: string;
}

export interface MachineSummaryStats {
  // Event indices (Tier 1-asymmetric: high = guaranteed problem, low = not reassuring)
  ahi: number | null;
  hi: number | null;
  oai: number | null;
  cai: number | null;
  uai: number | null;

  // Machine RERA index (events/hr) — from RIN signal
  reraIndex: number | null;

  // Cheyne-Stokes % of sleep time — from CSR signal
  csrPercentage: number | null;

  // Leak statistics (data quality indicator)
  leak50: number | null;
  leak70: number | null;
  leak95: number | null;
  leakMax: number | null;

  // Breathing stats (cross-validate with engine-computed values)
  minVent50: number | null;
  minVent95: number | null;
  respRate50: number | null;
  respRate95: number | null;
  tidVol50: number | null;
  tidVol95: number | null;
  ti50: number | null;
  ti95: number | null;
  ieRatio50: number | null;
  spontCycPct: number | null;

  // Actual delivered pressure (may differ from settings in auto modes)
  tgtIpap50: number | null;
  tgtIpap95: number | null;
  tgtEpap50: number | null;
  tgtEpap95: number | null;
  maskPress50: number | null;
  maskPress95: number | null;
  maskPressMax: number | null;

  // Session metadata
  durationMin: number | null;
  maskOnMin: number | null;
  maskOffMin: number | null;
  maskEvents: number | null;

  // Built-in SpO2 (if device has oximetry, e.g. ResMed with SA2)
  spo2_50: number | null;
  spo2_95: number | null;

  // Faults
  faultDevice: boolean;
  faultAlarm: boolean;
  faultHumidifier: boolean;
  faultHeatedTube: boolean;
  anyFault: boolean;

  // Environmental (measured, not settings)
  ambHumidity50: number | null;
}

// ============================================================
// PLD (Periodic Low-resolution Data) types
// ============================================================

/**
 * Raw PLD channel data parsed from PLD.edf files.
 * All channels are optional — not all devices include all channels.
 * PLD files are low-resolution (0.5 Hz / 2-second intervals, 30-day retention).
 */
export interface PLDData {
  samplingRate: number;           // typically 0.5 Hz
  durationSeconds: number;
  startTime: Date;
  maskPressure?: Float32Array;    // cmH2O
  therapyPressure?: Float32Array; // cmH2O
  expiratoryPressure?: Float32Array; // cmH2O (EPAP)
  inspiratoryPressure?: Float32Array; // cmH2O (IPAP, BiPAP only)
  leak?: Float32Array;            // L/min (converted from L/s)
  respiratoryRate?: Float32Array; // breaths/min
  tidalVolume?: Float32Array;     // mL (converted from L)
  minuteVentilation?: Float32Array; // L/min
  snore?: Float32Array;           // dimensionless
  fflIndex?: Float32Array;        // dimensionless (machine FL score)
  ieRatio?: Float32Array;         // ratio (converted from x100)
  ti?: Float32Array;              // seconds
  te?: Float32Array;              // seconds
  targetMV?: Float32Array;        // L/min (ASV/iVAPS)
}

/** Summary statistics for a single PLD channel */
export interface PLDChannelStats {
  median: number;
  p95: number;
  max: number;
}

/** Extended channel stats including min */
export interface PLDChannelStatsWithMin extends PLDChannelStats {
  min: number;
}

/** Snore-specific stats including percentage above zero */
export interface PLDSnoreStats extends PLDChannelStats {
  percentAboveZero: number;
}

/** Minimal channel stats (median only) */
export interface PLDChannelMedian {
  median: number;
}

/** Two-stat channel stats (median + p95) */
export interface PLDChannelMedianP95 {
  median: number;
  p95: number;
}

/**
 * Aggregated PLD summary — small enough to persist in localStorage.
 * Computed from raw PLDData Float32Arrays, which are NOT persisted.
 */
export interface PLDSummary {
  samplingRate: number;
  durationSeconds: number;
  sampleCount: number;
  // Summary stats for each channel
  leak?: PLDChannelStats;
  snore?: PLDSnoreStats;
  fflIndex?: PLDChannelStats;
  therapyPressure?: PLDChannelStatsWithMin;
  expiratoryPressure?: PLDChannelStatsWithMin;
  inspiratoryPressure?: PLDChannelStatsWithMin;
  respiratoryRate?: PLDChannelMedianP95;
  tidalVolume?: PLDChannelMedianP95;
  minuteVentilation?: PLDChannelMedianP95;
  ieRatio?: PLDChannelMedian;
  ti?: PLDChannelMedian;
  te?: PLDChannelMedian;
  targetMV?: PLDChannelMedian;
  // Capability flags
  hasLeakData: boolean;
  hasSnoreData: boolean;
  hasFflData: boolean;
  hasPressureData: boolean;
}

export interface SettingsFingerprint {
  epap: number;
  ps: number;
  cycle: string;
  riseTime: number;
  triggerSensitivity: string;
  tiMax: number;
  hash: string;
}

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

export interface NightResult {
  date: Date;
  dateStr: string;
  durationHours: number;
  sessionCount: number;
  sessionStartTime?: Date;
  settings: MachineSettings;
  glasgow: GlasgowComponents;
  wat: WATResults;
  ned: NEDResults;
  oximetry: OximetryResults | null;
  oximetryTrace: OximetryTraceData | null;
  settingsMetrics: SettingsMetrics | null;
  crossDevice: CrossDeviceResults | null;
  machineSummary: MachineSummaryStats | null;
  settingsFingerprint: SettingsFingerprint | null;
  csl: CSLData | null;
  pldSummary: PLDSummary | null;
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
  /** Accumulated non-fatal warnings from analysis (e.g. truncated EDF files) */
  warnings: string[];
  /** Nights excluded by the tier history window (community cap). Populated after analysis completes. */
  nightsCappedCount?: number;
}

export interface WorkerAnalyzeMessage {
  type: 'ANALYZE';
  files: { buffer: ArrayBuffer; path: string }[];
  oximetryCSVs?: string[];
  deviceType?: DeviceType;
  bmcSerial?: string;
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
  /** NightResult with ned.breaths and oximetryTrace stripped — bulk arrays are in the sibling fields below */
  night: NightResult;
  nightIndex: number;
  totalNights: number;
  /** Per-breath data for IDB storage — lifted out of night to keep postMessage payload small */
  breaths?: Breath[];
  /** Oximetry trace for IDB storage — lifted out of night to keep postMessage payload small */
  oximetryTrace?: OximetryTraceData | null;
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
