// ============================================================
// AirwayLab — Demo Sample Data
// 5 nights of realistic NightResult data for demo mode
// ============================================================

import type { NightResult, MachineSettings, GlasgowComponents, WATResults, NEDResults, OximetryResults } from './types';

function dateFromStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

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
};

// Night 1: Most recent — moderate FL, with oximetry
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

// Night 2: Good night — low FL
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

// Night 3: Moderate-bad night — elevated FL, settings changed
const night3Glasgow: GlasgowComponents = {
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

const night3WAT: WATResults = {
  flScore: 48,
  regularityScore: 52,
  periodicityIndex: 32,
};

const night3NED: NEDResults = {
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

// Night 4: Good-moderate, no oximetry
const night4Glasgow: GlasgowComponents = {
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

const night4WAT: WATResults = {
  flScore: 28,
  regularityScore: 72,
  periodicityIndex: 16,
};

const night4NED: NEDResults = {
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

// Night 5: Oldest — moderate FL
const night5Glasgow: GlasgowComponents = {
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

const night5WAT: WATResults = {
  flScore: 38,
  regularityScore: 62,
  periodicityIndex: 24,
};

const night5NED: NEDResults = {
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

const night5Ox: OximetryResults = {
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

// Old settings (before therapy change on night 3)
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
};

export const SAMPLE_NIGHTS: NightResult[] = [
  {
    date: dateFromStr('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7.7,
    sessionCount: 1,
    settings: { ...baseSettings },
    glasgow: night1Glasgow,
    wat: night1WAT,
    ned: night1NED,
    oximetry: night1Ox,
    oximetryTrace: null,
    settingsMetrics: null,
  },
  {
    date: dateFromStr('2025-01-14'),
    dateStr: '2025-01-14',
    durationHours: 7.2,
    sessionCount: 1,
    settings: { ...baseSettings },
    glasgow: night2Glasgow,
    wat: night2WAT,
    ned: night2NED,
    oximetry: night2Ox,
    oximetryTrace: null,
    settingsMetrics: null,
  },
  {
    date: dateFromStr('2025-01-13'),
    dateStr: '2025-01-13',
    durationHours: 8.1,
    sessionCount: 2,
    settings: { ...oldSettings },
    glasgow: night3Glasgow,
    wat: night3WAT,
    ned: night3NED,
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
  },
  {
    date: dateFromStr('2025-01-12'),
    dateStr: '2025-01-12',
    durationHours: 6.9,
    sessionCount: 1,
    settings: { ...oldSettings },
    glasgow: night4Glasgow,
    wat: night4WAT,
    ned: night4NED,
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
  },
  {
    date: dateFromStr('2025-01-11'),
    dateStr: '2025-01-11',
    durationHours: 7.5,
    sessionCount: 1,
    settings: { ...oldSettings },
    glasgow: night5Glasgow,
    wat: night5WAT,
    ned: night5NED,
    oximetry: night5Ox,
    oximetryTrace: null,
    settingsMetrics: null,
  },
];

/**
 * Therapy change date for sample data.
 * Settings changed between night 3 (2025-01-13) and night 2 (2025-01-14):
 * EPAP 8→10, IPAP 14→16.
 */
export const SAMPLE_THERAPY_CHANGE_DATE = '2025-01-14';
