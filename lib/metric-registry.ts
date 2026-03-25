// ============================================================
// AirwayLab — Metric Reliability Registry
// Defines tier assignments and cross-validity for every metric.
// ============================================================

export type MetricTier = 1 | '1-asym' | 2 | 3 | 4;

export type CrossValidity =
  | 'valid'
  | 'invalid'
  | 'uncertain'
  | 'probably-valid'
  | 'not-cross-device';

export interface MetricDefinition {
  id: string;
  name: string;
  engine: 'oximetry' | 'ned' | 'glasgow' | 'wat' | 'device' | 'external';
  tier: MetricTier;
  description: string;
  crossRT: CrossValidity;
  crossPS: CrossValidity;
  crossDevice: CrossValidity;
  confounders: string[];
  unit: string;
  direction: 'lower-better' | 'higher-better' | 'target-range' | 'alarm-only';
}

// ---------- Tier 1 — Decision-grade ----------

const TIER1_OXIMETRY: MetricDefinition[] = [
  {
    id: 'hrc10',
    name: 'HRc10',
    engine: 'oximetry',
    tier: 1,
    description: 'Arousal events (HR spike >= 10 bpm)',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Algorithm baseline window'],
    unit: '/hr',
    direction: 'lower-better',
  },
  {
    id: 'hrc15',
    name: 'HRc15',
    engine: 'oximetry',
    tier: 1,
    description: 'Severe arousals (HR spike >= 15 bpm)',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Algorithm baseline window'],
    unit: '/hr',
    direction: 'lower-better',
  },
  {
    id: 'odi3',
    name: 'ODI-3',
    engine: 'oximetry',
    tier: 1,
    description: 'Desaturation events (>= 3% drops/hr)',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Oximeter model baseline'],
    unit: '/hr',
    direction: 'lower-better',
  },
  {
    id: 'odi4',
    name: 'ODI-4',
    engine: 'oximetry',
    tier: 1,
    description: 'Severe desaturations (>= 4% drops/hr)',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Oximeter model baseline'],
    unit: '/hr',
    direction: 'lower-better',
  },
  {
    id: 'tBelow94',
    name: 'T<94%',
    engine: 'oximetry',
    tier: 1,
    description: 'Hypoxic burden (% time below 94%)',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Oximeter model baseline'],
    unit: '%',
    direction: 'lower-better',
  },
  {
    id: 'spo2Mean',
    name: 'SpO2 mean',
    engine: 'oximetry',
    tier: 1,
    description: 'Average oxygen saturation',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'probably-valid',
    confounders: [],
    unit: '%',
    direction: 'higher-better',
  },
  {
    id: 'coupled3_10',
    name: 'Coupled events',
    engine: 'oximetry',
    tier: 1,
    description: 'Desaturation + arousal co-occurrence',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: [],
    unit: '/hr',
    direction: 'lower-better',
  },
];

// ---------- Tier 1 asymmetric — Machine AHI ----------

const TIER1_ASYM: MetricDefinition[] = [
  {
    id: 'machineAhi',
    name: 'Machine AHI',
    engine: 'device',
    tier: '1-asym',
    description: 'Machine-reported AHI. Reliable when elevated; normal values miss RERAs.',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'valid',
    confounders: ['Low sensitivity for UARS', 'Misses flow limitation'],
    unit: '/hr',
    direction: 'alarm-only',
  },
];

// ---------- Tier 2 — Reliable Proxy ----------

const TIER2_NED: MetricDefinition[] = [
  {
    id: 'nedClearFLPct',
    name: 'NED clear FL%',
    engine: 'ned',
    tier: 2,
    description: 'Definitive airway obstruction (NED >= 34%)',
    crossRT: 'invalid',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Rise Time changes Qpeak'],
    unit: '%',
    direction: 'lower-better',
  },
  {
    id: 'nedBorderlinePct',
    name: 'NED borderline%',
    engine: 'ned',
    tier: 2,
    description: 'Mild airway narrowing (NED 10-34%)',
    crossRT: 'invalid',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Rise Time changes Qpeak', 'Most affected by RT confound'],
    unit: '%',
    direction: 'lower-better',
  },
  {
    id: 'nedMean',
    name: 'NED mean',
    engine: 'ned',
    tier: 2,
    description: 'Overall effort-flow relationship',
    crossRT: 'invalid',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Rise Time changes Qpeak'],
    unit: '%',
    direction: 'lower-better',
  },
  {
    id: 'fiMean',
    name: 'FI (Flatness Index)',
    engine: 'ned',
    tier: 2,
    description: 'Starling-type flow limitation (mean/peak ratio)',
    crossRT: 'probably-valid',
    crossPS: 'probably-valid',
    crossDevice: 'valid',
    confounders: ['Mean/peak scale together, less RT-sensitive'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'reraIndex',
    name: 'RERA index',
    engine: 'ned',
    tier: 2,
    description: 'Respiratory arousal candidates',
    crossRT: 'invalid',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Uses NED thresholds, inflated at faster RT'],
    unit: '/hr',
    direction: 'lower-better',
  },
  {
    id: 'amplitudeCv',
    name: 'Amplitude CV',
    engine: 'ned',
    tier: 2,
    description: 'Breathing stability (coefficient of variation)',
    crossRT: 'probably-valid',
    crossPS: 'probably-valid',
    crossDevice: 'valid',
    confounders: ['SD/mean ratio normalizes RT effect'],
    unit: '%',
    direction: 'lower-better',
  },
  {
    id: 'eai',
    name: 'EAI',
    engine: 'ned',
    tier: 2,
    description: 'Estimated arousal index (RR + Vt spikes)',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Rolling baseline shifts with settings changes'],
    unit: '/hr',
    direction: 'lower-better',
  },
];

// ---------- Tier 3 — Context Only ----------

const TIER3: MetricDefinition[] = [
  {
    id: 'tpeakTi',
    name: 'Tpeak/Ti',
    engine: 'ned',
    tier: 3,
    description: 'BiPAP artifact (94% > 0.45 across 385K breaths)',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Dominated by machine-driven flow in BiPAP'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'glasgowOverall',
    name: 'Glasgow Index',
    engine: 'glasgow',
    tier: 3,
    description: 'Pre-NED flow shape scoring. Superseded by direct 25Hz NED analysis.',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Lower resolution methodology'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'watFLScore',
    name: 'WAT FL Score',
    engine: 'wat',
    tier: 3,
    description: 'Flow shape flatness. Related to FI, less validated for therapy decisions.',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['Less validated than NED'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'watRegularity',
    name: 'WAT Regularity',
    engine: 'wat',
    tier: 3,
    description: 'Sample entropy on minute ventilation. Contextual stability indicator.',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: [],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'watPeriodicity',
    name: 'WAT Periodicity',
    engine: 'wat',
    tier: 3,
    description: 'FFT-based periodic breathing detection. Useful for central apnea screening.',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: ['More relevant for central apnea than UARS'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'mShapePct',
    name: 'M-shape %',
    engine: 'ned',
    tier: 3,
    description: 'Descriptive morphology. No established clinical threshold.',
    crossRT: 'uncertain',
    crossPS: 'uncertain',
    crossDevice: 'valid',
    confounders: [],
    unit: '%',
    direction: 'lower-better',
  },
];

// ---------- Tier 4 — Excluded ----------

const TIER4: MetricDefinition[] = [
  {
    id: 'ouraStaging',
    name: 'Oura sleep staging',
    engine: 'external',
    tier: 4,
    description: 'Unreliable for sleep-disordered breathing.',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Assumes normal sleep architecture'],
    unit: '',
    direction: 'lower-better',
  },
  {
    id: 'ouraBdi',
    name: 'Oura BDI',
    engine: 'external',
    tier: 4,
    description: 'Inferred from movement/HR, not direct respiratory measurement.',
    crossRT: 'valid',
    crossPS: 'valid',
    crossDevice: 'not-cross-device',
    confounders: ['Not respiratory-derived'],
    unit: '',
    direction: 'lower-better',
  },
];

// ---------- Registry ----------

const ALL_METRICS = [
  ...TIER1_OXIMETRY,
  ...TIER1_ASYM,
  ...TIER2_NED,
  ...TIER3,
  ...TIER4,
];

export const METRIC_REGISTRY: Record<string, MetricDefinition> = Object.fromEntries(
  ALL_METRICS.map((m) => [m.id, m])
);

/** Get metrics by tier */
export function getMetricsByTier(tier: MetricTier): MetricDefinition[] {
  return ALL_METRICS.filter((m) => m.tier === tier);
}

/** Check if a metric is valid for cross-RT comparison */
export function isValidCrossRT(metricId: string): boolean {
  const m = METRIC_REGISTRY[metricId];
  if (!m) return false;
  return m.crossRT === 'valid' || m.crossRT === 'probably-valid';
}

/** Get the NED-derived metric IDs that are invalid across Rise Time changes */
export const RT_SENSITIVE_METRICS = new Set(
  ALL_METRICS
    .filter((m) => m.crossRT === 'invalid')
    .map((m) => m.id)
);
