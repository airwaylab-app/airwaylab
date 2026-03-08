// ============================================================
// AirwayLab — Insight Generator
// Produces data-driven, actionable text insights from results.
// ============================================================

import type { NightResult } from './types';
import { getTrafficLight } from './thresholds';
import { getStoredThresholds } from './threshold-overrides';

export interface Insight {
  /** Unique key for React rendering */
  id: string;
  /** 'positive' | 'warning' | 'actionable' | 'info' */
  type: 'positive' | 'warning' | 'actionable' | 'info';
  /** Short headline (≤12 words) */
  title: string;
  /** Supporting explanation (1–2 sentences) */
  body: string;
  /** Metric area this relates to */
  category: 'glasgow' | 'wat' | 'ned' | 'oximetry' | 'therapy' | 'trend';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function trend(vals: number[]): 'improving' | 'stable' | 'worsening' {
  if (vals.length < 3) return 'stable';
  // Simple linear regression slope on index
  const n = vals.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(vals);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (vals[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den === 0 ? 0 : num / den;
  // Normalize by mean to get relative change
  const relSlope = yMean === 0 ? 0 : slope / yMean;
  if (Math.abs(relSlope) < 0.03) return 'stable';
  return relSlope > 0 ? 'worsening' : 'improving';
}

function trendLowerBetter(vals: number[]): 'improving' | 'stable' | 'worsening' {
  return trend(vals);
}

function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}

/* ------------------------------------------------------------------ */
/*  Single-night insights                                              */
/* ------------------------------------------------------------------ */

function singleNightInsights(n: NightResult, prev: NightResult | null): Insight[] {
  const THRESHOLDS = getStoredThresholds();
  const insights: Insight[] = [];
  const gl = getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall);
  const nedL = getTrafficLight(n.ned.nedMean, THRESHOLDS.nedMean);
  const regL = getTrafficLight(n.wat.regularityScore, THRESHOLDS.watRegularity);

  // Glasgow summary
  if (gl === 'good') {
    insights.push({
      id: 'glasgow-good',
      type: 'positive',
      title: 'Glasgow Index in healthy range',
      body: `Score of ${fmt(n.glasgow.overall)} indicates minimal flow limitation — current therapy appears effective.`,
      category: 'glasgow',
    });
  } else if (gl === 'bad') {
    insights.push({
      id: 'glasgow-bad',
      type: 'warning',
      title: 'Significant flow limitation detected',
      body: `Glasgow Index of ${fmt(n.glasgow.overall)} suggests persistent upper airway obstruction. Consider discussing pressure adjustments with your clinician.`,
      category: 'glasgow',
    });
  }

  // Worst Glasgow component
  const comps: { name: string; val: number }[] = [
    { name: 'Skew', val: n.glasgow.skew },
    { name: 'Spike', val: n.glasgow.spike },
    { name: 'Flat Top', val: n.glasgow.flatTop },
    { name: 'Multi-Peak', val: n.glasgow.multiPeak },
    { name: 'No Pause', val: n.glasgow.noPause },
    { name: 'Inspiratory Rate', val: n.glasgow.inspirRate },
    { name: 'Multi-Breath', val: n.glasgow.multiBreath },
    { name: 'Variable Amplitude', val: n.glasgow.variableAmp },
  ];
  const worst = comps.reduce((a, b) => (b.val > a.val ? b : a));
  if (worst.val >= 0.5 && gl !== 'good') {
    insights.push({
      id: 'glasgow-dominant',
      type: 'info',
      title: `Dominant component: ${worst.name}`,
      body: `${worst.name} scored ${fmt(worst.val, 2)}, the highest contributor to your Glasgow Index this night.`,
      category: 'glasgow',
    });
  }

  // WAT regularity (higher = more regular = worse during CPAP therapy)
  if (regL === 'bad') {
    insights.push({
      id: 'regularity-bad',
      type: 'warning',
      title: 'Highly repetitive breathing pattern',
      body: `Regularity score of ${Math.round(n.wat.regularityScore)}% indicates very predictable breathing cycles. During CPAP therapy, this may signal persistent flow limitation with uniform effort.`,
      category: 'wat',
    });
  } else if (regL === 'good') {
    insights.push({
      id: 'regularity-good',
      type: 'positive',
      title: 'Healthy breathing variability',
      body: `Regularity score of ${Math.round(n.wat.regularityScore)}% shows natural breath-to-breath variability — a sign of unobstructed breathing.`,
      category: 'wat',
    });
  }

  // Estimated Arousal Index
  const eaiL = getTrafficLight(n.ned.estimatedArousalIndex, THRESHOLDS.eai);
  if (eaiL === 'bad') {
    insights.push({
      id: 'eai-high',
      type: 'warning',
      title: 'Elevated estimated arousal index',
      body: `EAI of ${fmt(n.ned.estimatedArousalIndex)}/hr suggests frequent respiratory rate and tidal volume spikes, indicating possible sleep fragmentation.`,
      category: 'ned',
    });
  } else if (eaiL === 'good' && n.ned.estimatedArousalIndex > 0) {
    insights.push({
      id: 'eai-good',
      type: 'positive',
      title: 'Low estimated arousal burden',
      body: `EAI of ${fmt(n.ned.estimatedArousalIndex)}/hr indicates few respiratory arousal-like events — sleep continuity appears well-maintained.`,
      category: 'ned',
    });
  }

  // WAT periodicity
  if (n.wat.periodicityIndex > 40) {
    insights.push({
      id: 'periodicity-high',
      type: 'warning',
      title: 'Periodic breathing detected',
      body: `Periodicity index of ${fmt(n.wat.periodicityIndex)}% indicates repetitive breathing cycles (30–100s period). This may suggest central apnea or treatment-emergent events.`,
      category: 'wat',
    });
  }

  // NED RERA
  if (n.ned.reraIndex >= 10) {
    insights.push({
      id: 'rera-high',
      type: 'warning',
      title: 'Elevated RERA events',
      body: `RERA index of ${fmt(n.ned.reraIndex)} events/hr is above the clinical threshold. These respiratory effort-related arousals may fragment sleep.`,
      category: 'ned',
    });
  } else if (n.ned.reraIndex < 5 && nedL === 'good') {
    insights.push({
      id: 'ned-good',
      type: 'positive',
      title: 'Low flow limitation on NED analysis',
      body: `NED mean of ${fmt(n.ned.nedMean)}% with only ${fmt(n.ned.reraIndex)} RERAs/hr — breathing effort looks well-controlled.`,
      category: 'ned',
    });
  }

  // NED H1/H2 split
  if (Math.abs(n.ned.h1NedMean - n.ned.h2NedMean) > 5) {
    const worse = n.ned.h2NedMean > n.ned.h1NedMean ? 'second' : 'first';
    insights.push({
      id: 'ned-h1h2',
      type: 'info',
      title: `Flow limitation worse in ${worse} half`,
      body: `H1 NED ${fmt(n.ned.h1NedMean)}% vs H2 NED ${fmt(n.ned.h2NedMean)}%. ${worse === 'second' ? 'This may relate to REM-dominant obstruction in the latter part of the night.' : 'Early-night obstruction may improve as therapy stabilises.'}`,
      category: 'ned',
    });
  }

  // Night-over-night delta
  if (prev) {
    const gDelta = n.glasgow.overall - prev.glasgow.overall;
    if (Math.abs(gDelta) >= 0.3) {
      const dir = gDelta < 0 ? 'improved' : 'worsened';
      insights.push({
        id: 'night-delta',
        type: gDelta < 0 ? 'positive' : 'warning',
        title: `Glasgow ${dir} from previous night`,
        body: `Changed from ${fmt(prev.glasgow.overall)} to ${fmt(n.glasgow.overall)} (${gDelta > 0 ? '+' : ''}${fmt(gDelta)}).`,
        category: 'trend',
      });
    }
  }

  // Oximetry insights
  if (n.oximetry) {
    const ox = n.oximetry;
    const odiL = getTrafficLight(ox.odi3, THRESHOLDS.odi3);

    if (odiL === 'bad') {
      insights.push({
        id: 'odi-high',
        type: 'warning',
        title: 'Frequent oxygen desaturations',
        body: `ODI-3 of ${fmt(ox.odi3)} events/hr indicates frequent drops in blood oxygen despite CPAP therapy.`,
        category: 'oximetry',
      });
    }

    if (ox.tBelow90 > 15) {
      insights.push({
        id: 'tbelow90-high',
        type: 'warning',
        title: 'Extended time below SpO₂ 90%',
        body: `${fmt(ox.tBelow90)} minutes spent below 90% SpO₂. This warrants clinical attention.`,
        category: 'oximetry',
      });
    }

    if (ox.coupled3_10 > 10) {
      insights.push({
        id: 'coupled-high',
        type: 'info',
        title: 'Frequent coupled desat + HR surge events',
        body: `${fmt(ox.coupled3_10)} coupled events/hr suggests respiratory arousals are causing both oxygen drops and heart rate spikes.`,
        category: 'oximetry',
      });
    }

    // H1/H2 oximetry shift
    if (Math.abs(ox.h1.odi3 - ox.h2.odi3) > 5) {
      const worse = ox.h2.odi3 > ox.h1.odi3 ? 'second' : 'first';
      insights.push({
        id: 'oxi-h1h2',
        type: 'info',
        title: `Desaturations concentrated in ${worse} half`,
        body: `H1 ODI-3: ${fmt(ox.h1.odi3)}/hr vs H2: ${fmt(ox.h2.odi3)}/hr. ${worse === 'second' ? 'May indicate REM-related desaturations.' : 'May improve as mask seal stabilises.'}`,
        category: 'oximetry',
      });
    }
  }

  return insights;
}

/* ------------------------------------------------------------------ */
/*  Multi-night trend insights                                         */
/* ------------------------------------------------------------------ */

function trendInsights(
  nights: NightResult[],
  therapyChangeDate: string | null
): Insight[] {
  if (nights.length < 3) return [];

  const THRESHOLDS = getStoredThresholds();
  const insights: Insight[] = [];
  // Nights are most-recent-first; reverse for chronological order
  const chrono = [...nights].reverse();
  const glasgowVals = chrono.map((n) => n.glasgow.overall);

  const gTrend = trendLowerBetter(glasgowVals);
  if (gTrend === 'improving') {
    insights.push({
      id: 'trend-glasgow-improving',
      type: 'positive',
      title: 'Glasgow Index trending down over time',
      body: `Flow limitation scores are improving across ${nights.length} nights (${fmt(glasgowVals[0])} → ${fmt(glasgowVals[glasgowVals.length - 1])}).`,
      category: 'trend',
    });
  } else if (gTrend === 'worsening') {
    insights.push({
      id: 'trend-glasgow-worsening',
      type: 'actionable',
      title: 'Glasgow Index trending upward',
      body: `Flow limitation is increasing over ${nights.length} nights (${fmt(glasgowVals[0])} → ${fmt(glasgowVals[glasgowVals.length - 1])}). Consider discussing pressure or settings changes.`,
      category: 'trend',
    });
  }

  // Therapy change impact
  if (therapyChangeDate) {
    const changeIdx = chrono.findIndex((n) => n.dateStr === therapyChangeDate);
    if (changeIdx > 0 && changeIdx < chrono.length - 1) {
      const before = mean(chrono.slice(0, changeIdx).map((n) => n.glasgow.overall));
      const after = mean(chrono.slice(changeIdx).map((n) => n.glasgow.overall));
      const delta = after - before;

      if (Math.abs(delta) >= 0.2) {
        insights.push({
          id: 'therapy-change-impact',
          type: delta < 0 ? 'positive' : 'warning',
          title: `Settings change ${delta < 0 ? 'improved' : 'worsened'} flow limitation`,
          body: `Average Glasgow Index went from ${fmt(before)} to ${fmt(after)} after settings were changed on ${therapyChangeDate}.`,
          category: 'therapy',
        });
      }
    }
  }

  // Consistency check
  const glasgowLights = chrono.map((n) => getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall));
  const allGood = glasgowLights.every((l) => l === 'good');
  const allBad = glasgowLights.every((l) => l === 'bad');

  if (allGood) {
    insights.push({
      id: 'consistent-good',
      type: 'positive',
      title: 'Consistently good therapy across all nights',
      body: `All ${nights.length} nights show Glasgow Index in the healthy range. Current settings appear well-optimised.`,
      category: 'trend',
    });
  } else if (allBad) {
    insights.push({
      id: 'consistent-bad',
      type: 'actionable',
      title: 'Persistent flow limitation across all nights',
      body: `All ${nights.length} nights show elevated Glasgow Index. A pressure or settings review is strongly recommended.`,
      category: 'trend',
    });
  }

  return insights;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function generateInsights(
  nights: NightResult[],
  selectedNight: NightResult,
  previousNight: NightResult | null,
  therapyChangeDate: string | null
): Insight[] {
  const single = singleNightInsights(selectedNight, previousNight);
  const trends = trendInsights(nights, therapyChangeDate);

  // Combine, de-dupe by id, cap at 6 for readability
  const all = [...single, ...trends];
  const seen = new Set<string>();
  const deduped: Insight[] = [];
  for (const i of all) {
    if (!seen.has(i.id)) {
      seen.add(i.id);
      deduped.push(i);
    }
  }

  // Sort: warnings/actionable first, then positive, then info
  const priority: Record<Insight['type'], number> = {
    actionable: 0,
    warning: 1,
    positive: 2,
    info: 3,
  };
  deduped.sort((a, b) => priority[a.type] - priority[b.type]);

  return deduped.slice(0, 6);
}
