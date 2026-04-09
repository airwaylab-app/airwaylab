// ============================================================
// AirwayLab — Data Highlights Generator
// Translates metric patterns into observational highlights users
// can bring to their next sleep clinic appointment.
// Education, not prescription — never recommend therapy changes.
// ============================================================

import type { NightResult } from './types';
import type { TrafficLight, ThresholdDef } from './thresholds';
import { getTrafficLight } from './thresholds';
import { getStoredThresholds } from './threshold-overrides';
import { fmt, mean } from './format-utils';

export interface DataHighlight {
  id: string;
  stem: string;
  rationale: string;
  category:
    | 'flow-limitation'
    | 'arousals'
    | 'breathing-stability'
    | 'oximetry'
    | 'h1h2-shift'
    | 'trend';
  urgency: TrafficLight;
}

const MAX_HIGHLIGHTS = 4;

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
/*  Single-night highlight rules                                      */
/* ------------------------------------------------------------------ */

interface HighlightRule {
  id: string;
  category: DataHighlight['category'];
  /** Return a highlight or null if the rule doesn't fire */
  evaluate: (
    night: NightResult,
    thresholds: Record<string, ThresholdDef>
  ) => DataHighlight | null;
}

const SINGLE_NIGHT_RULES: HighlightRule[] = [
  // --- Flow Limitation (deduplicated below) ---
  {
    id: 'fl-score',
    category: 'flow-limitation',
    evaluate: (n, th) => {
      const light = getTrafficLight(n.wat.flScore, th.watFL!);
      if (light === 'good') return null;
      return {
        id: 'fl-score',
        stem: 'Your FL Score is above the typical range, indicating elevated flow limitation.',
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
        stem: 'Your Glasgow Index shows flow-limited breath shapes.',
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
        stem: 'Your NED is above the typical range, indicating negative effort dependence.',
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
        stem: 'Your estimated RERA Index indicates respiratory effort-related arousals beyond what AHI captures.',
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
        stem: 'Your Estimated Arousal Index is elevated, suggesting sleep fragmentation.',
        rationale: `Your Estimated Arousal Index of ${fmt(eai)}/hr is above the typical range for this metric.`,
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
        stem: 'Your Periodicity Index shows cyclical breathing patterns at 30\u2013100 second intervals.',
        rationale: `Your Periodicity Index of ${fmt(n.wat.periodicityIndex)}% is above the typical range for this metric.`,
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
        stem: 'Your breathing regularity score indicates significant variation in breathing patterns.',
        rationale: `Your breathing regularity score of ${Math.round(n.wat.regularityScore)}% is above the typical range for this metric.`,
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
        stem: 'Your ODI-3 indicates frequent oxygen desaturations during sleep.',
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
        stem: 'Your data shows correlated oxygen desaturations and breathing disturbances.',
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
      return {
        id: 'h1h2-ned',
        stem: 'Your flow limitation differs between the first and second halves of the night.',
        rationale: `First-half NED: ${fmt(n.ned.h1NedMean)}%, second-half NED: ${fmt(n.ned.h2NedMean)}% \u2014 a ${fmt(diff)}% difference.`,
        category: 'h1h2-shift',
        urgency: 'warn',
      };
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Deduplication: consolidate FL category into single highlight      */
/* ------------------------------------------------------------------ */

function deduplicateFlowLimitation(highlights: DataHighlight[]): DataHighlight[] {
  const flHighlights = highlights.filter((q) => q.category === 'flow-limitation');
  const others = highlights.filter((q) => q.category !== 'flow-limitation');

  if (flHighlights.length <= 1) return highlights;

  // Consolidate: pick the most urgent, reference all triggered metrics
  const worstUrgency = flHighlights.reduce<TrafficLight>(
    (worst, q) => (urgencyRank(q.urgency) < urgencyRank(worst) ? q.urgency : worst),
    'good'
  );

  const metricNames = flHighlights.map((q) => {
    if (q.id === 'fl-score') return 'FL Score';
    if (q.id === 'glasgow') return 'Glasgow Index';
    if (q.id === 'ned-mean') return 'NED';
    return q.id;
  });

  const metricDetails = flHighlights.map((q) => q.rationale).join(' ');

  const consolidated: DataHighlight = {
    id: 'fl-consolidated',
    stem: 'Multiple flow limitation metrics are elevated.',
    rationale: `Your ${metricNames.join(', ')} all indicate flow limitation. ${metricDetails}`,
    category: 'flow-limitation',
    urgency: worstUrgency,
  };

  return [consolidated, ...others];
}

/* ------------------------------------------------------------------ */
/*  Trend highlights (5+ nights required)                              */
/* ------------------------------------------------------------------ */

function trendHighlights(
  nights: NightResult[],
  thresholds: Record<string, ThresholdDef>
): DataHighlight[] {
  if (nights.length < 5) return [];

  const highlights: DataHighlight[] = [];
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

      highlights.push({
        id: `trend-${metric.name.toLowerCase().replace(/\s+/g, '-')}`,
        stem: `Your ${metric.name} has been trending upward over recent nights.`,
        rationale: `Over the past ${nights.length} nights, your ${metric.name} has increased by ${Math.round(pctChange)}% (${fmt(firstVal)} to ${fmt(lastVal)}).`,
        category: 'trend',
        urgency: latestLight,
      });
      // Only one trend highlight to avoid repetition
      break;
    }
  }

  return highlights;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function generateDataHighlights(
  nights: NightResult[],
  selectedNight: NightResult,
  _previousNight: NightResult | null,
  _therapyChangeDate: string | null
): DataHighlight[] {
  const thresholds = getStoredThresholds();

  // Evaluate all single-night rules
  let highlights: DataHighlight[] = [];
  for (const rule of SINGLE_NIGHT_RULES) {
    const q = rule.evaluate(selectedNight, thresholds);
    if (q) highlights.push(q);
  }

  // Deduplicate flow limitation category
  highlights = deduplicateFlowLimitation(highlights);

  // Add trend highlights
  const trends = trendHighlights(nights, thresholds);
  highlights.push(...trends);

  // Sort by urgency: bad first, then warn, then good
  highlights.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));

  // Cap at MAX_HIGHLIGHTS
  return highlights.slice(0, MAX_HIGHLIGHTS);
}

/**
 * Format highlights as plain text for clipboard copy.
 */
export function formatHighlightsForClipboard(
  highlights: DataHighlight[],
  dateStr: string
): string {
  const header = `Data highlights for your sleep clinic appointment \u2014 generated by AirwayLab (${dateStr})`;
  const separator = '\u2014'.repeat(40);

  const body = highlights
    .map((q, i) => `${i + 1}. ${q.stem}\n   ${q.rationale}`)
    .join('\n\n');

  const footer = `Generated by AirwayLab (airwaylab.app). Not medical advice \u2014 discuss with your clinician.`;

  return `${header}\n${separator}\n\n${body}\n\n${separator}\n${footer}`;
}
