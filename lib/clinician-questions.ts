// ============================================================
// AirwayLab — Clinician Questions Generator
// Translates metric patterns into informed questions users can
// bring to their next sleep clinic appointment.
// Education, not prescription — never recommend therapy changes.
// ============================================================

import type { NightResult } from './types';
import type { TrafficLight, ThresholdDef } from './thresholds';
import { getTrafficLight } from './thresholds';
import { getStoredThresholds } from './threshold-overrides';
import { fmt, mean } from './format-utils';

export interface ClinicianQuestion {
  id: string;
  stem: string;
  rationale: string;
  category:
    | 'flow-limitation'
    | 'arousals'
    | 'breathing-stability'
    | 'oximetry'
    | 'h1h2-shift'
    | 'settings'
    | 'trend';
  urgency: TrafficLight;
}

const MAX_QUESTIONS = 4;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Urgency sort value: bad=0, warn=1, good=2 */
function urgencyRank(u: TrafficLight): number {
  if (u === 'bad') return 0;
  if (u === 'warn') return 1;
  return 2;
}

/* ------------------------------------------------------------------ */
/*  Single-night question rules                                       */
/* ------------------------------------------------------------------ */

interface QuestionRule {
  id: string;
  category: ClinicianQuestion['category'];
  /** Return a question or null if the rule doesn't fire */
  evaluate: (
    night: NightResult,
    thresholds: Record<string, ThresholdDef>
  ) => ClinicianQuestion | null;
}

const SINGLE_NIGHT_RULES: QuestionRule[] = [
  // --- Flow Limitation (deduplicated below) ---
  {
    id: 'fl-score',
    category: 'flow-limitation',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.wat.flScore, th.watFL!);
      if (light === 'good') return null;
      return {
        id: 'fl-score',
        stem: 'My AirwayLab report shows elevated FL metrics. Can you help me understand what this means?',
        rationale: `Your FL Score of ${Math.round(n.wat.flScore)}% is above the typical range for this metric.`,
        category: 'flow-limitation',
        urgency: light,
      };
    },
  },
  {
    id: 'glasgow',
    category: 'flow-limitation',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.glasgow.overall, th.glasgowOverall!);
      if (light === 'good') return null;
      const elevated = [
        n.glasgow.skew > 0.5 ? 'skew' : null,
        n.glasgow.flatTop > 0.5 ? 'flat top' : null,
        n.glasgow.multiPeak > 0.5 ? 'multi-peak' : null,
        n.glasgow.noPause > 0.5 ? 'no pause' : null,
      ].filter(Boolean);
      const compText = elevated.length > 0 ? ` (${elevated.join(', ')})` : '';
      return {
        id: 'glasgow',
        stem: 'My breath shape analysis shows flow-limited patterns. Can you help me understand what this means?',
        rationale: `Your Glasgow Index of ${fmt(n.glasgow.overall)} is above the typical range for this metric${compText}.`,
        category: 'flow-limitation',
        urgency: light,
      };
    },
  },
  {
    id: 'ned-mean',
    category: 'flow-limitation',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.ned.nedMean, th.nedMean!);
      if (light === 'good') return null;
      return {
        id: 'ned-mean',
        stem: 'My flow data shows negative effort dependence. Can you help me understand what this means?',
        rationale: `Your NED of ${fmt(n.ned.nedMean)}% is above the typical range for this metric.`,
        category: 'flow-limitation',
        urgency: light,
      };
    },
  },

  // --- Arousals ---
  {
    id: 'rera-index',
    category: 'arousals',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.ned.reraIndex, th.reraIndex!);
      if (light === 'good') return null;
      return {
        id: 'rera-index',
        stem: 'My data shows frequent respiratory effort-related arousals. Can you help me understand what might be causing this?',
        rationale: `Your estimated RERA Index of ${fmt(n.ned.reraIndex)}/hr is above the typical range.`,
        category: 'arousals',
        urgency: light,
      };
    },
  },
  {
    id: 'eai',
    category: 'arousals',
    evaluate: (n, th) => {
      const eai = n.ned.estimatedArousalIndex ?? 0;
      const light = getTrafficLight(eai, th.eai!);
      if (light === 'good') return null;
      return {
        id: 'eai',
        stem: 'My estimated arousal index is elevated. What might be contributing to this?',
        rationale: `Your Estimated Arousal Index of ${fmt(eai)}/hr is elevated compared to the typical range.`,
        category: 'arousals',
        urgency: light,
      };
    },
  },

  // --- Breathing Stability ---
  {
    id: 'periodicity',
    category: 'breathing-stability',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.wat.periodicityIndex, th.watPeriodicity!);
      if (light === 'good') return null;
      return {
        id: 'periodicity',
        stem: 'My breathing shows cyclical patterns. Could you help me understand what this periodicity pattern means?',
        rationale: `Your Periodicity Index of ${fmt(n.wat.periodicityIndex)}% shows a recurring pattern at 30–100 second intervals.`,
        category: 'breathing-stability',
        urgency: light,
      };
    },
  },
  {
    id: 'regularity',
    category: 'breathing-stability',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.wat.regularityScore, th.watRegularity!);
      if (light === 'good') return null;
      return {
        id: 'regularity',
        stem: 'My breathing rhythm is quite variable. Is this expected with my current settings?',
        rationale: `Your breathing regularity score of ${Math.round(n.wat.regularityScore)}% indicates significant variation in breathing patterns.`,
        category: 'breathing-stability',
        urgency: light,
      };
    },
  },

  // --- Oximetry ---
  {
    id: 'odi3',
    category: 'oximetry',
    evaluate: (n, th) => {
      if (!n.oximetry) return null;
      const light = getTrafficLight(n.oximetry.odi3, th.odi3!);
      if (light === 'good') return null;
      return {
        id: 'odi3',
        stem: 'My oxygen levels dip frequently during sleep. Is my current therapy adequately covering all events?',
        rationale: `Your ODI-3 of ${fmt(n.oximetry.odi3)}/hr means your oxygen dropped by 3%+ approximately ${Math.round(n.oximetry.odi3)} times per hour.`,
        category: 'oximetry',
        urgency: light,
      };
    },
  },
  {
    id: 'coupled-events',
    category: 'oximetry',
    evaluate: (n, _th) => {
      if (!n.oximetry) return null;
      // Use a simple threshold: coupled3_10 > 3/hr is concerning
      if (n.oximetry.coupled3_10 <= 3) return null;
      const light: TrafficLight = n.oximetry.coupled3_10 > 6 ? 'bad' : 'warn';
      return {
        id: 'coupled-events',
        stem: 'My oxygen dips correlate with breathing disruptions. Would a combined review help identify the cause?',
        rationale: `Your data shows ${fmt(n.oximetry.coupled3_10)}/hr events where oxygen drops and breathing disturbances occur together.`,
        category: 'oximetry',
        urgency: light,
      };
    },
  },

  // --- H1/H2 Shift ---
  {
    id: 'h1h2-ned',
    category: 'h1h2-shift',
    evaluate: (n) => {
      const diff = Math.abs(n.ned.h1NedMean - n.ned.h2NedMean);
      if (diff <= 15) return null;
      const worseHalf = n.ned.h2NedMean > n.ned.h1NedMean ? 'worse' : 'better';
      return {
        id: 'h1h2-ned',
        stem: `My flow limitation is notably ${worseHalf} in the second half of the night. Could REM sleep or position be involved?`,
        rationale: `First-half NED: ${fmt(n.ned.h1NedMean)}%, second-half NED: ${fmt(n.ned.h2NedMean)}% — a ${fmt(diff)}% difference suggests time-dependent or sleep-stage-related changes.`,
        category: 'h1h2-shift',
        urgency: 'warn',
      };
    },
  },

  // --- Settings (BiPAP) ---
  {
    id: 'premature-cycle',
    category: 'settings',
    evaluate: (n, th) => {
      if (!n.settingsMetrics) return null;
      const light = getTrafficLight(n.settingsMetrics.prematureCyclePct, th.settingsPrematureCycle!);
      if (light === 'good') return null;
      return {
        id: 'premature-cycle',
        stem: 'My BiPAP data suggests possible premature cycling. Can you review whether my Cycle settings are appropriate?',
        rationale: `Your inspiratory time patterns suggest the machine may be ending breaths before you're ready to exhale (${fmt(n.settingsMetrics.prematureCyclePct, 0)}% of breaths).`,
        category: 'settings',
        urgency: light,
      };
    },
  },
  {
    id: 'late-cycle',
    category: 'settings',
    evaluate: (n, th) => {
      if (!n.settingsMetrics) return null;
      const light = getTrafficLight(n.settingsMetrics.lateCyclePct, th.settingsLateCycle!);
      if (light === 'good') return null;
      return {
        id: 'late-cycle',
        stem: 'My BiPAP data shows patterns that may indicate late cycling. Can you review whether my settings are appropriate?',
        rationale: `Your data shows patterns consistent with the machine continuing to deliver pressure after your inspiratory effort has ended (${fmt(n.settingsMetrics.lateCyclePct, 0)}% of breaths).`,
        category: 'settings',
        urgency: light,
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Deduplication: consolidate FL category into single question       */
/* ------------------------------------------------------------------ */

function deduplicateFlowLimitation(questions: ClinicianQuestion[]): ClinicianQuestion[] {
  const flQuestions = questions.filter((q) => q.category === 'flow-limitation');
  const others = questions.filter((q) => q.category !== 'flow-limitation');

  if (flQuestions.length <= 1) return questions;

  // Consolidate: pick the most urgent, reference all triggered metrics
  const worstUrgency = flQuestions.reduce<TrafficLight>(
    (worst, q) => (urgencyRank(q.urgency) < urgencyRank(worst) ? q.urgency : worst),
    'good'
  );

  const metricNames = flQuestions.map((q) => {
    if (q.id === 'fl-score') return 'FL Score';
    if (q.id === 'glasgow') return 'Glasgow Index';
    if (q.id === 'ned-mean') return 'NED';
    return q.id;
  });

  const metricDetails = flQuestions.map((q) => q.rationale).join(' ');

  const consolidated: ClinicianQuestion = {
    id: 'fl-consolidated',
    stem: 'Multiple flow limitation metrics are elevated. Can you help me understand what this means for my therapy?',
    rationale: `Your ${metricNames.join(', ')} all indicate flow limitation. ${metricDetails}`,
    category: 'flow-limitation',
    urgency: worstUrgency,
  };

  return [consolidated, ...others];
}

/* ------------------------------------------------------------------ */
/*  Trend questions (5+ nights required)                               */
/* ------------------------------------------------------------------ */

function trendQuestions(
  nights: NightResult[],
  thresholds: Record<string, ThresholdDef>
): ClinicianQuestion[] {
  if (nights.length < 5) return [];

  const questions: ClinicianQuestion[] = [];
  const chrono = [...nights].reverse(); // oldest first

  // Check key metrics for worsening trend (>20% increase over the period)
  const metrics: { name: string; accessor: (n: NightResult) => number; threshold: ThresholdDef }[] = [
    { name: 'Glasgow Index', accessor: (n) => n.glasgow.overall, threshold: thresholds.glasgowOverall! },
    { name: 'FL Score', accessor: (n) => n.wat.flScore, threshold: thresholds.watFL! },
    { name: 'NED Mean', accessor: (n) => n.ned.nedMean, threshold: thresholds.nedMean! },
  ];

  for (const metric of metrics) {
    const vals = chrono.map(metric.accessor);
    const firstVal = mean(vals.slice(0, 2));
    const lastVal = mean(vals.slice(-2));

    if (firstVal === 0) continue;
    const pctChange = ((lastVal - firstVal) / firstVal) * 100;

    if (pctChange > 20) {
      // Check if the latest value is actually concerning (amber or red)
      const latestLight = getTrafficLight(lastVal, metric.threshold);
      if (latestLight === 'good') continue;

      questions.push({
        id: `trend-${metric.name.toLowerCase().replace(/\s+/g, '-')}`,
        stem: `My ${metric.name} has been trending upward recently. Should we review whether anything has changed?`,
        rationale: `Over the past ${nights.length} nights, your ${metric.name} has increased by ${Math.round(pctChange)}% (${fmt(firstVal)} to ${fmt(lastVal)}).`,
        category: 'trend',
        urgency: latestLight,
      });
      // Only one trend question to avoid repetition
      break;
    }
  }

  return questions;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function generateClinicianQuestions(
  nights: NightResult[],
  selectedNight: NightResult,
  _previousNight: NightResult | null,
  _therapyChangeDate: string | null
): ClinicianQuestion[] {
  const thresholds = getStoredThresholds();

  // Evaluate all single-night rules
  let questions: ClinicianQuestion[] = [];
  for (const rule of SINGLE_NIGHT_RULES) {
    const q = rule.evaluate(selectedNight, thresholds);
    if (q) questions.push(q);
  }

  // Deduplicate flow limitation category
  questions = deduplicateFlowLimitation(questions);

  // Add trend questions
  const trends = trendQuestions(nights, thresholds);
  questions.push(...trends);

  // Sort by urgency: bad first, then warn, then good
  questions.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));

  // Cap at MAX_QUESTIONS
  return questions.slice(0, MAX_QUESTIONS);
}

/**
 * Format questions as plain text for clipboard copy.
 */
export function formatQuestionsForClipboard(
  questions: ClinicianQuestion[],
  dateStr: string
): string {
  const header = `Questions for my sleep clinic appointment — generated by AirwayLab (${dateStr})`;
  const separator = '—'.repeat(40);

  const body = questions
    .map((q, i) => `${i + 1}. ${q.stem}\n   ${q.rationale}`)
    .join('\n\n');

  const footer = `Generated by AirwayLab (airwaylab.app). Not medical advice — discuss with your clinician.`;

  return `${header}\n${separator}\n\n${body}\n\n${separator}\n${footer}`;
}
