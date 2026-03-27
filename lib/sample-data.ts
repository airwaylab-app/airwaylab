// ============================================================
// AirwayLab — Demo Sample Data
// 7 nights of realistic NightResult data for demo mode
// ============================================================

import type {
  NightResult,
  MachineSettings,
  MachineSummaryStats,
  GlasgowComponents,
  WATResults,
  NEDResults,
  OximetryResults,
  SettingsMetrics,
  CrossDeviceResults,
} from './types';

function dateFromStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

// ── Shared settings ──────────────────────────────────────────

const baseSettings: MachineSettings = {
  deviceModel: 'AirCurve 10 VAuto',
  epap: 10,
  ipap: 16,
  pressureSupport: 6,
  papMode: 'BiPAP ST',
  riseTime: 3,
  trigger: 'Medium',
  cycle: 'Medium',
  easyBreathe: false,
  settingsSource: 'extracted',
};

const oldSettings: MachineSettings = {
  deviceModel: 'AirCurve 10 VAuto',
  epap: 8,
  ipap: 14,
  pressureSupport: 6,
  papMode: 'BiPAP ST',
  riseTime: 3,
  trigger: 'Medium',
  cycle: 'Medium',
  easyBreathe: false,
  settingsSource: 'extracted',
};

// ── Helper: build MachineSummaryStats with defaults ──────────

function makeMachineSummary(overrides: Partial<MachineSummaryStats>): MachineSummaryStats {
  return {
    ahi: null,
    hi: null,
    oai: null,
    cai: null,
    uai: null,
    reraIndex: null,
    csrPercentage: null,
    leak50: null,
    leak70: null,
    leak95: null,
    leakMax: null,
    minVent50: null,
    minVent95: null,
    respRate50: null,
    respRate95: null,
    tidVol50: null,
    tidVol95: null,
    ti50: null,
    ti95: null,
    ieRatio50: null,
    spontCycPct: null,
    tgtIpap50: null,
    tgtIpap95: null,
    tgtEpap50: null,
    tgtEpap95: null,
    maskPress50: null,
    maskPress95: null,
    maskPressMax: null,
    durationMin: null,
    maskOnMin: null,
    maskOffMin: null,
    maskEvents: null,
    spo2_50: null,
    spo2_95: null,
    faultDevice: false,
    faultAlarm: false,
    faultHumidifier: false,
    faultHeatedTube: false,
    anyFault: false,
    ambHumidity50: null,
    ...overrides,
  };
}

// ============================================================
// Night 1 (2025-01-17): Most recent — moderate FL, with oximetry
// ============================================================

const night1Glasgow: GlasgowComponents = {
  overall: 1.8,
  skew: 0.3,
  spike: 0.15,
  flatTop: 0.35,
  topHeavy: 0.22,
  multiPeak: 0.2,
  noPause: 0.1,
  inspirRate: 0.25,
  multiBreath: 0.15,
  variableAmp: 0.3,
};

const night1WAT: WATResults = {
  flScore: 32,
  regularityScore: 68,
  periodicityIndex: 18,
};

const night1NED: NEDResults = {
  breathCount: 4120,
  nedMean: 19.5,
  nedMedian: 17.2,
  nedP95: 38.5,
  nedClearFLPct: 3.2,
  nedBorderlinePct: 8.5,
  fiMean: 0.72,
  fiFL85Pct: 12.5,
  tpeakMean: 0.38,
  mShapePct: 4.8,
  reraIndex: 6.4,
  reraCount: 48,
  h1NedMean: 17.8,
  h2NedMean: 21.2,
  combinedFLPct: 22,
  estimatedArousalIndex: 12.4,
};

const night1Ox: OximetryResults = {
  odi3: 4.2,
  odi4: 1.8,
  tBelow90: 2.1,
  tBelow94: 8.5,
  hrClin8: 14.2,
  hrClin10: 8.6,
  hrClin12: 5.1,
  hrClin15: 2.3,
  hrMean10: 6.2,
  hrMean15: 3.1,
  coupled3_6: 2.8,
  coupled3_10: 1.4,
  coupledHRRatio: 0.67,
  spo2Mean: 95.2,
  spo2Min: 86,
  hrMean: 62.4,
  hrSD: 5.8,
  h1: { hrClin10: 7.2, odi3: 3.4, tBelow94: 6.2 },
  h2: { hrClin10: 10.0, odi3: 5.0, tBelow94: 10.8 },
  totalSamples: 28800,
  retainedSamples: 27936,
  doubleTrackingCorrected: 142,
};

const night1SettingsMetrics: SettingsMetrics = {
  breathCount: 4120,
  epapDetected: 10.1,
  ipapDetected: 15.8,
  psDetected: 5.7,
  triggerDelayMedianMs: 85,
  triggerDelayP10Ms: 52,
  triggerDelayP90Ms: 145,
  autoTriggerPct: 2.1,
  tiMedianMs: 1120,
  tiP25Ms: 980,
  tiP75Ms: 1260,
  teMedianMs: 2450,
  ieRatio: 0.46,
  timeAtIpapMedianMs: 820,
  timeAtIpapP25Ms: 680,
  ipapDwellMedianPct: 73.2,
  ipapDwellP10Pct: 58.5,
  prematureCyclePct: 4.2,
  lateCyclePct: 6.8,
  endExpPressureMean: 10.05,
  endExpPressureSd: 0.12,
  tidalVolumeMedianMl: 485,
  tidalVolumeP25Ml: 420,
  tidalVolumeP75Ml: 555,
  tidalVolumeCv: 0.18,
  minuteVentProxy: 7.2,
};

const night1CrossDevice: CrossDeviceResults = {
  couplingPct: 62.5,
  h1CouplingPct: 55.8,
  h2CouplingPct: 69.2,
  matchedCount: 30,
  totalCount: 48,
  clockOffsetSec: 12,
  offsetConfidence: 'high',
  reraCoupledRate: 0.625,
  nonReraRate: 0.18,
};

// ============================================================
// Night 2 (2025-01-16): Good night — low FL, with oximetry
// ============================================================

const night2Glasgow: GlasgowComponents = {
  overall: 1.2,
  skew: 0.18,
  spike: 0.1,
  flatTop: 0.22,
  topHeavy: 0.15,
  multiPeak: 0.12,
  noPause: 0.08,
  inspirRate: 0.18,
  multiBreath: 0.1,
  variableAmp: 0.22,
};

const night2WAT: WATResults = {
  flScore: 24,
  regularityScore: 75,
  periodicityIndex: 14,
};

const night2NED: NEDResults = {
  breathCount: 3980,
  nedMean: 14.8,
  nedMedian: 12.6,
  nedP95: 32.0,
  nedClearFLPct: 1.8,
  nedBorderlinePct: 5.2,
  fiMean: 0.68,
  fiFL85Pct: 8.2,
  tpeakMean: 0.35,
  mShapePct: 3.1,
  reraIndex: 4.2,
  reraCount: 31,
  h1NedMean: 13.5,
  h2NedMean: 16.1,
  combinedFLPct: 16,
  estimatedArousalIndex: 8.2,
};

const night2Ox: OximetryResults = {
  odi3: 3.1,
  odi4: 1.2,
  tBelow90: 0.8,
  tBelow94: 5.2,
  hrClin8: 10.4,
  hrClin10: 6.2,
  hrClin12: 3.4,
  hrClin15: 1.6,
  hrMean10: 4.8,
  hrMean15: 2.2,
  coupled3_6: 1.8,
  coupled3_10: 0.8,
  coupledHRRatio: 0.58,
  spo2Mean: 95.8,
  spo2Min: 88,
  hrMean: 60.1,
  hrSD: 4.9,
  h1: { hrClin10: 5.8, odi3: 2.8, tBelow94: 4.0 },
  h2: { hrClin10: 6.6, odi3: 3.4, tBelow94: 6.4 },
  totalSamples: 27600,
  retainedSamples: 26988,
  doubleTrackingCorrected: 98,
};

// ============================================================
// Night 3 (2025-01-15): Moderate FL — first night after settings change
// ============================================================

const night3Glasgow: GlasgowComponents = {
  overall: 1.5,
  skew: 0.25,
  spike: 0.12,
  flatTop: 0.3,
  topHeavy: 0.2,
  multiPeak: 0.16,
  noPause: 0.1,
  inspirRate: 0.22,
  multiBreath: 0.12,
  variableAmp: 0.25,
};

const night3WAT: WATResults = {
  flScore: 30,
  regularityScore: 70,
  periodicityIndex: 16,
};

const night3NED: NEDResults = {
  breathCount: 4080,
  nedMean: 17.2,
  nedMedian: 15.0,
  nedP95: 36.0,
  nedClearFLPct: 2.6,
  nedBorderlinePct: 7.2,
  fiMean: 0.7,
  fiFL85Pct: 10.8,
  tpeakMean: 0.37,
  mShapePct: 4.0,
  reraIndex: 5.5,
  reraCount: 42,
  h1NedMean: 15.8,
  h2NedMean: 18.6,
  combinedFLPct: 20,
  estimatedArousalIndex: 10.5,
};

const night3Ox: OximetryResults = {
  odi3: 3.8,
  odi4: 1.5,
  tBelow90: 1.5,
  tBelow94: 7.0,
  hrClin8: 12.5,
  hrClin10: 7.8,
  hrClin12: 4.5,
  hrClin15: 2.0,
  hrMean10: 5.5,
  hrMean15: 2.8,
  coupled3_6: 2.2,
  coupled3_10: 1.1,
  coupledHRRatio: 0.58,
  spo2Mean: 95.4,
  spo2Min: 87,
  hrMean: 61.5,
  hrSD: 5.2,
  h1: { hrClin10: 6.5, odi3: 3.2, tBelow94: 5.5 },
  h2: { hrClin10: 9.1, odi3: 4.4, tBelow94: 8.5 },
  totalSamples: 28200,
  retainedSamples: 27474,
  doubleTrackingCorrected: 118,
};

// ============================================================
// Night 4 (2025-01-14): Settings change day — EPAP 8→10, IPAP 14→16
// Worst pre-change night: elevated FL
// ============================================================

const night4Glasgow: GlasgowComponents = {
  overall: 2.6,
  skew: 0.42,
  spike: 0.28,
  flatTop: 0.48,
  topHeavy: 0.35,
  multiPeak: 0.32,
  noPause: 0.22,
  inspirRate: 0.35,
  multiBreath: 0.22,
  variableAmp: 0.31,
};

const night4WAT: WATResults = {
  flScore: 48,
  regularityScore: 52,
  periodicityIndex: 32,
};

const night4NED: NEDResults = {
  breathCount: 4350,
  nedMean: 28.5,
  nedMedian: 25.8,
  nedP95: 52.0,
  nedClearFLPct: 8.5,
  nedBorderlinePct: 14.2,
  fiMean: 0.82,
  fiFL85Pct: 22.5,
  tpeakMean: 0.42,
  mShapePct: 8.2,
  reraIndex: 11.8,
  reraCount: 88,
  h1NedMean: 24.2,
  h2NedMean: 32.8,
  combinedFLPct: 38,
  estimatedArousalIndex: 22.5,
};

// ============================================================
// Night 5 (2025-01-13): Good-moderate, no oximetry (old settings)
// ============================================================

const night5Glasgow: GlasgowComponents = {
  overall: 1.5,
  skew: 0.25,
  spike: 0.12,
  flatTop: 0.28,
  topHeavy: 0.18,
  multiPeak: 0.18,
  noPause: 0.12,
  inspirRate: 0.2,
  multiBreath: 0.12,
  variableAmp: 0.23,
};

const night5WAT: WATResults = {
  flScore: 28,
  regularityScore: 72,
  periodicityIndex: 16,
};

const night5NED: NEDResults = {
  breathCount: 4050,
  nedMean: 16.8,
  nedMedian: 14.5,
  nedP95: 34.2,
  nedClearFLPct: 2.4,
  nedBorderlinePct: 6.8,
  fiMean: 0.7,
  fiFL85Pct: 10.2,
  tpeakMean: 0.36,
  mShapePct: 3.8,
  reraIndex: 5.2,
  reraCount: 39,
  h1NedMean: 15.2,
  h2NedMean: 18.4,
  combinedFLPct: 18,
  estimatedArousalIndex: 9.8,
};

const night5Ox: OximetryResults = {
  odi3: 4.5,
  odi4: 1.9,
  tBelow90: 2.5,
  tBelow94: 9.0,
  hrClin8: 13.8,
  hrClin10: 8.2,
  hrClin12: 4.8,
  hrClin15: 2.1,
  hrMean10: 5.8,
  hrMean15: 2.9,
  coupled3_6: 2.5,
  coupled3_10: 1.2,
  coupledHRRatio: 0.58,
  spo2Mean: 95.0,
  spo2Min: 85,
  hrMean: 63.2,
  hrSD: 5.5,
  h1: { hrClin10: 7.0, odi3: 3.8, tBelow94: 7.0 },
  h2: { hrClin10: 9.4, odi3: 5.2, tBelow94: 11.0 },
  totalSamples: 27000,
  retainedSamples: 26325,
  doubleTrackingCorrected: 128,
};

// ============================================================
// Night 6 (2025-01-12): Moderate FL, with oximetry (old settings)
// ============================================================

const night6Glasgow: GlasgowComponents = {
  overall: 2.1,
  skew: 0.35,
  spike: 0.2,
  flatTop: 0.38,
  topHeavy: 0.28,
  multiPeak: 0.25,
  noPause: 0.18,
  inspirRate: 0.3,
  multiBreath: 0.18,
  variableAmp: 0.26,
};

const night6WAT: WATResults = {
  flScore: 38,
  regularityScore: 62,
  periodicityIndex: 24,
};

const night6NED: NEDResults = {
  breathCount: 4200,
  nedMean: 22.0,
  nedMedian: 19.5,
  nedP95: 42.0,
  nedClearFLPct: 5.0,
  nedBorderlinePct: 10.8,
  fiMean: 0.76,
  fiFL85Pct: 16.5,
  tpeakMean: 0.4,
  mShapePct: 6.2,
  reraIndex: 8.5,
  reraCount: 64,
  h1NedMean: 20.0,
  h2NedMean: 24.0,
  combinedFLPct: 28,
  estimatedArousalIndex: 16.1,
};

const night6Ox: OximetryResults = {
  odi3: 6.8,
  odi4: 3.2,
  tBelow90: 5.5,
  tBelow94: 14.2,
  hrClin8: 18.5,
  hrClin10: 12.4,
  hrClin12: 7.8,
  hrClin15: 4.2,
  hrMean10: 8.5,
  hrMean15: 4.8,
  coupled3_6: 4.2,
  coupled3_10: 2.5,
  coupledHRRatio: 0.62,
  spo2Mean: 94.2,
  spo2Min: 82,
  hrMean: 65.8,
  hrSD: 7.2,
  h1: { hrClin10: 10.2, odi3: 5.5, tBelow94: 10.5 },
  h2: { hrClin10: 14.6, odi3: 8.1, tBelow94: 17.9 },
  totalSamples: 29400,
  retainedSamples: 28518,
  doubleTrackingCorrected: 185,
};

// ============================================================
// Night 7 (2025-01-11): Oldest — moderate-high FL, no oximetry
// ============================================================

const night7Glasgow: GlasgowComponents = {
  overall: 2.3,
  skew: 0.38,
  spike: 0.24,
  flatTop: 0.42,
  topHeavy: 0.3,
  multiPeak: 0.28,
  noPause: 0.2,
  inspirRate: 0.32,
  multiBreath: 0.2,
  variableAmp: 0.28,
};

const night7WAT: WATResults = {
  flScore: 42,
  regularityScore: 58,
  periodicityIndex: 28,
};

const night7NED: NEDResults = {
  breathCount: 4280,
  nedMean: 25.2,
  nedMedian: 22.5,
  nedP95: 46.5,
  nedClearFLPct: 6.5,
  nedBorderlinePct: 12.2,
  fiMean: 0.78,
  fiFL85Pct: 18.8,
  tpeakMean: 0.41,
  mShapePct: 7.0,
  reraIndex: 9.8,
  reraCount: 72,
  h1NedMean: 22.5,
  h2NedMean: 27.9,
  combinedFLPct: 32,
  estimatedArousalIndex: 18.5,
};

// ============================================================
// SAMPLE_NIGHTS — 7 nights, newest first
// ============================================================

export const SAMPLE_NIGHTS: NightResult[] = [
  // Night 1: 2025-01-17 — moderate FL, oximetry, settingsMetrics, crossDevice
  {
    date: dateFromStr('2025-01-17'),
    dateStr: '2025-01-17',
    durationHours: 7.7,
    sessionCount: 1,
    settings: { ...baseSettings },
    glasgow: night1Glasgow,
    wat: night1WAT,
    ned: night1NED,
    oximetry: night1Ox,
    oximetryTrace: null,
    settingsMetrics: night1SettingsMetrics,
    crossDevice: night1CrossDevice,
    machineSummary: makeMachineSummary({
      ahi: 3.8,
      hi: 2.1,
      oai: 0.8,
      cai: 0.5,
      uai: 0.4,
      leak50: 2.4,
      leak95: 12.8,
      leakMax: 28.5,
      respRate50: 14.2,
      tidVol50: 485,
      spontCycPct: 92,
      durationMin: 462,
      maskOnMin: 455,
      maskEvents: 1,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 2: 2025-01-16 — good night, low FL, oximetry
  {
    date: dateFromStr('2025-01-16'),
    dateStr: '2025-01-16',
    durationHours: 7.2,
    sessionCount: 1,
    settings: { ...baseSettings },
    glasgow: night2Glasgow,
    wat: night2WAT,
    ned: night2NED,
    oximetry: night2Ox,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 2.5,
      hi: 1.4,
      oai: 0.5,
      cai: 0.3,
      uai: 0.3,
      leak50: 1.8,
      leak95: 8.5,
      leakMax: 18.2,
      respRate50: 13.8,
      tidVol50: 510,
      spontCycPct: 95,
      durationMin: 432,
      maskOnMin: 428,
      maskEvents: 0,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 3: 2025-01-15 — moderate FL, first night after settings change, oximetry
  {
    date: dateFromStr('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7.4,
    sessionCount: 1,
    settings: { ...baseSettings },
    glasgow: night3Glasgow,
    wat: night3WAT,
    ned: night3NED,
    oximetry: night3Ox,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 3.2,
      hi: 1.8,
      oai: 0.6,
      cai: 0.4,
      uai: 0.4,
      leak50: 2.1,
      leak95: 10.5,
      leakMax: 22.0,
      respRate50: 14.0,
      tidVol50: 495,
      spontCycPct: 93,
      durationMin: 444,
      maskOnMin: 440,
      maskEvents: 1,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 4: 2025-01-14 — worst night, elevated FL, old settings (settings change day)
  {
    date: dateFromStr('2025-01-14'),
    dateStr: '2025-01-14',
    durationHours: 8.1,
    sessionCount: 2,
    settings: { ...oldSettings },
    glasgow: night4Glasgow,
    wat: night4WAT,
    ned: night4NED,
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 8.2,
      hi: 4.5,
      oai: 2.0,
      cai: 0.8,
      uai: 0.9,
      leak50: 3.5,
      leak95: 18.2,
      leakMax: 42.0,
      respRate50: 15.2,
      tidVol50: 440,
      spontCycPct: 85,
      durationMin: 486,
      maskOnMin: 475,
      maskEvents: 2,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 5: 2025-01-13 — good-moderate, with oximetry (old settings)
  {
    date: dateFromStr('2025-01-13'),
    dateStr: '2025-01-13',
    durationHours: 6.9,
    sessionCount: 1,
    settings: { ...oldSettings },
    glasgow: night5Glasgow,
    wat: night5WAT,
    ned: night5NED,
    oximetry: night5Ox,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 4.1,
      hi: 2.2,
      oai: 0.9,
      cai: 0.5,
      uai: 0.5,
      leak50: 2.6,
      leak95: 13.5,
      leakMax: 30.0,
      respRate50: 14.5,
      tidVol50: 470,
      spontCycPct: 90,
      durationMin: 414,
      maskOnMin: 408,
      maskEvents: 1,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 6: 2025-01-12 — moderate FL, with oximetry (old settings)
  {
    date: dateFromStr('2025-01-12'),
    dateStr: '2025-01-12',
    durationHours: 7.5,
    sessionCount: 1,
    settings: { ...oldSettings },
    glasgow: night6Glasgow,
    wat: night6WAT,
    ned: night6NED,
    oximetry: night6Ox,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 6.5,
      hi: 3.5,
      oai: 1.5,
      cai: 0.7,
      uai: 0.8,
      leak50: 3.0,
      leak95: 15.8,
      leakMax: 35.0,
      respRate50: 14.8,
      tidVol50: 455,
      spontCycPct: 88,
      durationMin: 450,
      maskOnMin: 444,
      maskEvents: 1,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
  // Night 7: 2025-01-11 — oldest, moderate-high FL, no oximetry (old settings)
  {
    date: dateFromStr('2025-01-11'),
    dateStr: '2025-01-11',
    durationHours: 7.0,
    sessionCount: 1,
    settings: { ...oldSettings },
    glasgow: night7Glasgow,
    wat: night7WAT,
    ned: night7NED,
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: makeMachineSummary({
      ahi: 7.1,
      hi: 3.8,
      oai: 1.8,
      cai: 0.6,
      uai: 0.9,
      leak50: 3.2,
      leak95: 16.5,
      leakMax: 38.0,
      respRate50: 15.0,
      tidVol50: 450,
      spontCycPct: 87,
      durationMin: 420,
      maskOnMin: 414,
      maskEvents: 1,
    }),
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  },
];

/**
 * Therapy change date for sample data.
 * Settings changed between night 4 (2025-01-14) and night 3 (2025-01-15):
 * EPAP 8→10, IPAP 14→16.
 */
export const SAMPLE_THERAPY_CHANGE_DATE = '2025-01-15';
