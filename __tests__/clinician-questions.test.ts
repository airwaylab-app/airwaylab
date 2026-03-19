import { describe, it, expect } from 'vitest';
import {
  generateClinicianQuestions,
  formatQuestionsForClipboard,
  type ClinicianQuestion,
} from '@/lib/clinician-questions';
import type { NightResult, GlasgowComponents, WATResults, NEDResults, OximetryResults, SettingsMetrics, MachineSettings } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Helpers — synthetic data                                          */
/* ------------------------------------------------------------------ */

function makeSettings(overrides?: Partial<MachineSettings>): MachineSettings {
  return {
    deviceModel: 'AirCurve 10 VAuto',
    epap: 10,
    ipap: 16,
    pressureSupport: 6,
    papMode: 'BiPAP Auto',
    riseTime: 2,
    trigger: 'Medium',
    cycle: 'Medium',
    easyBreathe: false,
    settingsSource: 'extracted',
    ...overrides,
  };
}

function makeGlasgow(overall: number): GlasgowComponents {
  return {
    overall,
    skew: overall / 9,
    spike: overall / 9,
    flatTop: overall / 9,
    topHeavy: overall / 9,
    multiPeak: overall / 9,
    noPause: overall / 9,
    inspirRate: overall / 9,
    multiBreath: overall / 9,
    variableAmp: overall / 9,
  };
}

function makeWAT(overrides?: Partial<WATResults>): WATResults {
  return {
    flScore: 20,
    regularityScore: 20,
    periodicityIndex: 10,
    ...overrides,
  };
}

function makeNED(overrides?: Partial<NEDResults>): NEDResults {
  return {
    breathCount: 3000,
    nedMean: 10,
    nedMedian: 8,
    nedP95: 20,
    nedClearFLPct: 2,
    nedBorderlinePct: 5,
    fiMean: 0.85,
    fiFL85Pct: 10,
    tpeakMean: 0.35,
    mShapePct: 3,
    reraIndex: 3,
    reraCount: 20,
    h1NedMean: 10,
    h2NedMean: 10,
    combinedFLPct: 15,
    estimatedArousalIndex: 4,
    ...overrides,
  };
}

function makeOximetry(overrides?: Partial<OximetryResults>): OximetryResults {
  return {
    odi3: 3,
    odi4: 1,
    tBelow90: 2,
    tBelow94: 5,
    hrClin8: 5,
    hrClin10: 8,
    hrClin12: 4,
    hrClin15: 2,
    hrMean10: 5,
    hrMean15: 3,
    coupled3_6: 2,
    coupled3_10: 1,
    coupledHRRatio: 0.5,
    spo2Mean: 96,
    spo2Min: 88,
    hrMean: 65,
    hrSD: 6,
    h1: { hrClin10: 8, odi3: 3, tBelow94: 5 },
    h2: { hrClin10: 8, odi3: 3, tBelow94: 5 },
    totalSamples: 28800,
    retainedSamples: 27000,
    doubleTrackingCorrected: 0,
    ...overrides,
  };
}

function makeSettingsMetrics(overrides?: Partial<SettingsMetrics>): SettingsMetrics {
  return {
    breathCount: 3000,
    epapDetected: 10,
    ipapDetected: 16,
    psDetected: 6,
    triggerDelayMedianMs: 200,
    triggerDelayP10Ms: 100,
    triggerDelayP90Ms: 350,
    autoTriggerPct: 1,
    tiMedianMs: 1400,
    tiP25Ms: 1200,
    tiP75Ms: 1600,
    teMedianMs: 2800,
    ieRatio: 2.0,
    timeAtIpapMedianMs: 800,
    timeAtIpapP25Ms: 600,
    ipapDwellMedianPct: 55,
    ipapDwellP10Pct: 40,
    prematureCyclePct: 1,
    lateCyclePct: 1,
    endExpPressureMean: 10.1,
    endExpPressureSd: 0.3,
    tidalVolumeMedianMl: 450,
    tidalVolumeP25Ml: 380,
    tidalVolumeP75Ml: 520,
    tidalVolumeCv: 18,
    minuteVentProxy: 7.5,
    ...overrides,
  };
}

function makeNight(overrides?: {
  glasgow?: number;
  wat?: Partial<WATResults>;
  ned?: Partial<NEDResults>;
  oximetry?: Partial<OximetryResults> | null;
  settingsMetrics?: Partial<SettingsMetrics> | null;
  settings?: Partial<MachineSettings>;
  dateStr?: string;
}): NightResult {
  return {
    date: new Date(overrides?.dateStr ?? '2026-03-10'),
    dateStr: overrides?.dateStr ?? '2026-03-10',
    durationHours: 7.5,
    sessionCount: 1,
    settings: makeSettings(overrides?.settings),
    glasgow: makeGlasgow(overrides?.glasgow ?? 0.8),
    wat: makeWAT(overrides?.wat),
    ned: makeNED(overrides?.ned),
    oximetry: overrides?.oximetry === null ? null : makeOximetry(overrides?.oximetry),
    oximetryTrace: null,
    settingsMetrics: overrides?.settingsMetrics === null ? null : makeSettingsMetrics(overrides?.settingsMetrics),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('generateClinicianQuestions', () => {
  it('generates a flow limitation question when FL Score exceeds amber threshold', () => {
    const night = makeNight({ wat: { flScore: 55 } });
    const questions = generateClinicianQuestions([night], night, null, null);

    expect(questions.length).toBeGreaterThanOrEqual(1);
    const flQ = questions.find((q) => q.category === 'flow-limitation');
    expect(flQ).toBeDefined();
    expect(flQ!.stem).toBeTruthy();
    expect(flQ!.rationale).toContain('55');
  });

  it('returns healthy range message when all metrics are green', () => {
    const night = makeNight({
      glasgow: 0.5,
      wat: { flScore: 15, regularityScore: 15, periodicityIndex: 10 },
      ned: { nedMean: 8, reraIndex: 2, estimatedArousalIndex: 3, h1NedMean: 8, h2NedMean: 9 },
      oximetry: { odi3: 2, coupled3_10: 1 },
      settingsMetrics: { prematureCyclePct: 1, lateCyclePct: 1 },
    });
    const questions = generateClinicianQuestions([night], night, null, null);

    expect(questions).toHaveLength(0);
  });

  it('caps output at maximum 4 questions', () => {
    // Make everything red to trigger many rules
    const night = makeNight({
      glasgow: 4.0,
      wat: { flScore: 70, regularityScore: 60, periodicityIndex: 50 },
      ned: { nedMean: 35, reraIndex: 12, estimatedArousalIndex: 15, h1NedMean: 20, h2NedMean: 40 },
      oximetry: { odi3: 20, coupled3_10: 5 },
      settingsMetrics: { prematureCyclePct: 15, lateCyclePct: 15 },
    });
    const questions = generateClinicianQuestions([night], night, null, null);

    expect(questions.length).toBeLessThanOrEqual(4);
  });

  it('sorts questions by urgency: red first, then amber', () => {
    const night = makeNight({
      glasgow: 0.8, // green
      wat: { flScore: 55, periodicityIndex: 50 }, // FL amber, periodicity red
      ned: { nedMean: 10, reraIndex: 3, estimatedArousalIndex: 4 },
      oximetry: null,
      settingsMetrics: null,
    });
    const questions = generateClinicianQuestions([night], night, null, null);

    if (questions.length >= 2) {
      const urgencyOrder = questions.map((q) => q.urgency);
      for (let i = 1; i < urgencyOrder.length; i++) {
        const prev = urgencyOrder[i - 1] === 'bad' ? 0 : urgencyOrder[i - 1] === 'warn' ? 1 : 2;
        const curr = urgencyOrder[i] === 'bad' ? 0 : urgencyOrder[i] === 'warn' ? 1 : 2;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it('does not generate oximetry questions when oximetry is null', () => {
    const night = makeNight({ oximetry: null });
    const questions = generateClinicianQuestions([night], night, null, null);

    const oxyQ = questions.filter((q) => q.category === 'oximetry');
    expect(oxyQ).toHaveLength(0);
  });

  it('does not generate trend questions with fewer than 5 nights', () => {
    const nights = Array.from({ length: 3 }, (_, i) =>
      makeNight({
        dateStr: `2026-03-${String(8 + i).padStart(2, '0')}`,
        glasgow: 3.0 + i * 0.5, // worsening
      })
    );
    const questions = generateClinicianQuestions(nights, nights[2]!, nights[1]!, null);

    const trendQ = questions.filter((q) => q.category === 'trend');
    expect(trendQ).toHaveLength(0);
  });

  it('deduplicates: FL Score + Glasgow + NED all red produces single FL question', () => {
    const night = makeNight({
      glasgow: 4.0,
      wat: { flScore: 70 },
      ned: { nedMean: 35 },
      oximetry: null,
      settingsMetrics: null,
    });
    const questions = generateClinicianQuestions([night], night, null, null);

    const flQuestions = questions.filter((q) => q.category === 'flow-limitation');
    expect(flQuestions).toHaveLength(1);
    // The consolidated question should reference multiple metrics
    expect(flQuestions[0]!.rationale).toContain('FL Score');
    expect(flQuestions[0]!.rationale).toContain('Glasgow');
    expect(flQuestions[0]!.rationale).toContain('NED');
  });

  it('only generates BiPAP cycling question when settings metrics exist', () => {
    const nightWithSettings = makeNight({
      settingsMetrics: { prematureCyclePct: 15 },
    });
    const nightWithout = makeNight({ settingsMetrics: null });

    const qWith = generateClinicianQuestions([nightWithSettings], nightWithSettings, null, null);
    const qWithout = generateClinicianQuestions([nightWithout], nightWithout, null, null);

    const settingsQWith = qWith.filter((q) => q.category === 'settings');
    const settingsQWithout = qWithout.filter((q) => q.category === 'settings');

    if (settingsQWith.length > 0) {
      expect(settingsQWithout).toHaveLength(0);
    }
  });

  it('generates H1/H2 question only when FL% difference exceeds 15pp', () => {
    const nightSmallDiff = makeNight({
      ned: { h1NedMean: 20, h2NedMean: 30 }, // 10pp diff
      oximetry: null,
      settingsMetrics: null,
    });
    const nightLargeDiff = makeNight({
      ned: { h1NedMean: 15, h2NedMean: 35 }, // 20pp diff
      oximetry: null,
      settingsMetrics: null,
    });

    const qSmall = generateClinicianQuestions([nightSmallDiff], nightSmallDiff, null, null);
    const qLarge = generateClinicianQuestions([nightLargeDiff], nightLargeDiff, null, null);

    const h1h2Small = qSmall.filter((q) => q.category === 'h1h2-shift');
    const h1h2Large = qLarge.filter((q) => q.category === 'h1h2-shift');

    expect(h1h2Small).toHaveLength(0);
    expect(h1h2Large.length).toBeGreaterThanOrEqual(1);
  });

  it('generates trend question for worsening metrics across 5+ nights', () => {
    // App passes nights most-recent-first
    const nights = Array.from({ length: 7 }, (_, i) =>
      makeNight({
        dateStr: `2026-03-${String(10 - i).padStart(2, '0')}`,
        glasgow: 3.4 - i * 0.4, // most-recent-first: 3.4, 3.0, 2.6, ..., 1.0
        oximetry: null,
        settingsMetrics: null,
      })
    );
    const selected = nights[0]; // most recent
    const previous = nights[1];
    const questions = generateClinicianQuestions(nights, selected!, previous!, null);

    const trendQ = questions.filter((q) => q.category === 'trend');
    expect(trendQ.length).toBeGreaterThanOrEqual(1);
  });

  it('includes actual metric values in generated questions', () => {
    const night = makeNight({
      wat: { flScore: 62, periodicityIndex: 45 },
      oximetry: null,
      settingsMetrics: null,
    });
    const questions = generateClinicianQuestions([night], night, null, null);

    // At least one question should contain a specific number from the data
    const hasValues = questions.some(
      (q) => q.rationale.includes('62') || q.rationale.includes('45')
    );
    expect(hasValues).toBe(true);
  });

  it('formatQuestionsForClipboard includes all stems and disclaimer', () => {
    const questions: ClinicianQuestion[] = [
      {
        id: 'test-1',
        stem: 'Could pressure adjustments help?',
        rationale: 'Your FL Score of 60 is elevated.',
        category: 'flow-limitation',
        urgency: 'bad',
      },
      {
        id: 'test-2',
        stem: 'My breathing shows cyclical patterns?',
        rationale: 'Periodicity Index of 45%.',
        category: 'breathing-stability',
        urgency: 'warn',
      },
    ];

    const text = formatQuestionsForClipboard(questions, '2026-03-10');

    expect(text).toContain('Could pressure adjustments help?');
    expect(text).toContain('My breathing shows cyclical patterns?');
    expect(text).toContain('Not medical advice');
    expect(text).toContain('airwaylab.app');
    expect(text).toContain('2026-03-10');
  });
});
