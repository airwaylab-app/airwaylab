// ============================================================
// AirwayLab — Insight Generator
// Produces data-driven, actionable text insights from results.
// ============================================================

import type { NightResult } from './types';
import { getTrafficLight } from './thresholds';
import { getStoredThresholds } from './threshold-overrides';
import { computeIFLRisk, getIFLContextNote } from './ifl-risk';
import { fmt, mean } from './format-utils';

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
  category: 'glasgow' | 'wat' | 'ned' | 'oximetry' | 'therapy' | 'trend' | 'settings' | 'correlation' | 'temporal';
  /** Optional link for further reading */
  link?: { text: string; href: string };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function trend(vals: number[]): 'improving' | 'stable' | 'worsening' {
  if (vals.length < 3) return 'stable';
  // Simple linear regression slope on index
  const n = vals.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(vals);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (vals[i]! - yMean);
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

const RATING_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Poor',
  3: 'OK',
  4: 'Good',
  5: 'Great',
};

/* ------------------------------------------------------------------ */
/*  Single-night insights                                              */
/* ------------------------------------------------------------------ */

function singleNightInsights(n: NightResult, prev: NightResult | null, symptomRating?: number | null): Insight[] {
  const THRESHOLDS = getStoredThresholds();
  const insights: Insight[] = [];
  const gl = getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall!);
  const nedL = getTrafficLight(n.ned.nedMean, THRESHOLDS.nedMean!);
  const regL = getTrafficLight(n.wat.regularityScore, THRESHOLDS.watRegularity!);

  // IFL Symptom Risk composite
  const iflRisk = computeIFLRisk(n);
  const iflL = getTrafficLight(iflRisk, THRESHOLDS.iflRisk!);
  if (iflL === 'bad') {
    insights.push({
      id: 'ifl-risk-high',
      type: 'warning',
      title: 'Elevated flow limitation across multiple metrics',
      body: `Your IFL Symptom Risk of ${fmt(iflRisk)}% indicates substantial flow limitation across multiple metrics. Research suggests this level of FL can drive fatigue independently of arousals, though individual sensitivity varies. Discuss pressure optimisation with your clinician.`,
      category: 'ned',
      link: { text: 'Read: Does Flow Limitation Drive Sleepiness?', href: '/blog/flow-limitation-and-sleepiness' },
    });
  } else if (iflL === 'good') {
    insights.push({
      id: 'ifl-risk-good',
      type: 'positive',
      title: 'Low flow limitation symptom risk',
      body: `Your IFL Symptom Risk of ${fmt(iflRisk)}% is low — your airway appears to be functioning well during therapy.`,
      category: 'ned',
    });
  }

  // IFL Risk + EAI divergence
  const eaiForContext = n.ned.estimatedArousalIndex ?? 0;
  const contextNote = getIFLContextNote(iflRisk, eaiForContext);
  if (contextNote && iflRisk > 30 && eaiForContext <= 5) {
    insights.push({
      id: 'ifl-eai-divergence-fl-high',
      type: 'info',
      title: 'High flow limitation with low disruption index',
      body: contextNote,
      category: 'ned',
      link: { text: 'Read: Does Flow Limitation Drive Sleepiness?', href: '/blog/flow-limitation-and-sleepiness' },
    });
  } else if (contextNote && iflRisk <= 15 && eaiForContext > 10) {
    insights.push({
      id: 'ifl-eai-divergence-eai-high',
      type: 'info',
      title: 'Elevated disruptions without significant flow limitation',
      body: contextNote,
      category: 'ned',
    });
  }

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
      body: `Glasgow Index of ${fmt(n.glasgow.overall)} suggests persistent upper airway obstruction. Review your flow waveforms for visual confirmation and discuss with your clinician.`,
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

  // WAT regularity (higher = more regular = worse during PAP therapy)
  if (regL === 'bad') {
    insights.push({
      id: 'regularity-bad',
      type: 'warning',
      title: 'Highly repetitive breathing pattern',
      body: `Regularity score of ${Math.round(n.wat.regularityScore)}% indicates very predictable breathing cycles. During PAP therapy, this may signal persistent flow limitation with uniform effort.`,
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

  // Respiratory Disruption Index
  const eaiVal = n.ned.estimatedArousalIndex ?? 0;
  const eaiL = getTrafficLight(eaiVal, THRESHOLDS.eai!);
  if (eaiL === 'bad') {
    insights.push({
      id: 'eai-high',
      type: 'info',
      title: 'Elevated respiratory disruption markers',
      body: `RDI of ${fmt(eaiVal)}/hr suggests frequent recovery breaths following flow-limited breathing. Areas to investigate: EPR/PS level, positional factors. Get personalised suggestions with AI Analysis.`,
      category: 'ned',
    });
  } else if (eaiL === 'good' && eaiVal > 0) {
    insights.push({
      id: 'eai-good',
      type: 'positive',
      title: 'Low respiratory disruption burden',
      body: `RDI of ${fmt(eaiVal)}/hr indicates few detected disruptions. Note: research suggests flow limitation itself can drive symptoms independently of arousals — check your flow limitation metrics for the fuller picture.`,
      category: 'ned',
    });
  }

  // Sensitization mismatch: low flow limitation but high disruptions
  const glasgowVal = n.glasgow.overall;
  if (glasgowVal <= 2.0 && eaiVal >= 15) {
    insights.push({
      id: 'sensitization-mismatch',
      type: 'actionable',
      title: 'Low FL but high disruptions — investigate further',
      body: `Glasgow Index of ${fmt(glasgowVal)} shows mild flow limitation, but RDI of ${fmt(eaiVal)}/hr indicates frequent disruptions. This mismatch suggests non-respiratory causes may be contributing: check for mask leak, pressure comfort (EPR/ramp), nasal congestion, caffeine timing, or stress. Log your night context to track patterns. If this persists, discuss CNS sensitization with your clinician.`,
      category: 'ned',
      link: { text: 'Learn more about this pattern', href: '/blog/what-is-cns-sensitization' },
    });
  }

  // Metric divergence: Glasgow/NED low but WAT FL high (or vice versa)
  const watFLL = getTrafficLight(n.wat.flScore, THRESHOLDS.watFL!);
  if (gl === 'good' && nedL === 'good' && (watFLL === 'bad' || watFLL === 'warn')) {
    insights.push({
      id: 'metric-divergence-wat-high',
      type: 'info',
      title: 'WAT FL elevated despite low Glasgow/NED',
      body: `WAT FL Score of ${Math.round(n.wat.flScore)}% detects inspiratory flow shape flattening that Glasgow (${fmt(n.glasgow.overall)}) and NED (${fmt(n.ned.nedMean)}%) did not flag. These tools measure different aspects of flow limitation — WAT focuses on waveform flatness, while Glasgow and NED use other criteria. This pattern may indicate subtle or intermittent obstruction.`,
      category: 'wat',
    });
  } else if ((gl === 'bad' || nedL === 'bad') && watFLL === 'good') {
    insights.push({
      id: 'metric-divergence-wat-low',
      type: 'info',
      title: 'Low WAT FL despite elevated Glasgow/NED',
      body: `WAT FL Score of ${Math.round(n.wat.flScore)}% is normal, but Glasgow (${fmt(n.glasgow.overall)}) or NED (${fmt(n.ned.nedMean)}%) are elevated. The obstruction pattern may not involve classic waveform flattening — Glasgow detects skew, spikes, and multi-peak patterns that WAT does not measure.`,
      category: 'wat',
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
      type: 'info',
      title: 'Elevated RERA events',
      body: `RERA index of ${fmt(n.ned.reraIndex)} events/hr is above the clinical threshold. These effort-related arousals fragment sleep. Consider reviewing pressure support, trigger sensitivity, and whether nasal congestion is increasing breathing effort. AI Analysis can provide personalised suggestions based on your full data.`,
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

  // Brief Obstruction Index
  const boiVal = n.ned.briefObstructionIndex ?? 0;
  if (boiVal > 5) {
    const interval = Math.round(60 / boiVal);
    insights.push({
      id: 'boi-high',
      type: 'warning',
      title: 'High brief obstruction rate',
      body: `Brief obstruction rate of ${fmt(boiVal)}/hr means your airway is briefly narrowing roughly every ${interval} minutes. These events are too short for standard detection but may fragment sleep. They often do not respond to pressure changes alone — possible causes include swallowing, positional shifts, or epiglottic flutter. Track your sleep position and note patterns. Discuss with your clinician.`,
      category: 'ned',
    });
  }

  // NED-invisible dominance
  const nedInvisiblePct = n.ned.hypopneaNedInvisiblePct ?? 0;
  const hypCount = n.ned.hypopneaCount ?? 0;
  if (nedInvisiblePct > 50 && hypCount >= 3) {
    insights.push({
      id: 'ned-invisible-high',
      type: 'info',
      title: 'Most amplitude events have normal NED shape',
      body: `${fmt(nedInvisiblePct, 0)}% of amplitude-drop events had normal NED shape, suggesting brief airway collapses rather than progressive flow limitation. These events are invisible to shape-based flow analysis.`,
      category: 'ned',
    });
  }

  // H2>H1 brief obstructions
  const boiH1 = n.ned.briefObstructionH1Index ?? 0;
  const boiH2 = n.ned.briefObstructionH2Index ?? 0;
  if (boiH2 > boiH1 * 1.5 && boiH2 > 3) {
    insights.push({
      id: 'boi-h2-gt-h1',
      type: 'info',
      title: 'Brief obstructions increase in the second half',
      body: `Brief obstructions are higher in H2 (${fmt(boiH2)}/hr) vs H1 (${fmt(boiH1)}/hr), consistent with REM-related airway changes. These events often do not respond to pressure changes — positional therapy or tracking sleep position may be more informative.`,
      category: 'ned',
    });
  }

  // Symptom rating cross-reference insights
  if (symptomRating != null && symptomRating !== 3) {
    const ratingLabel = RATING_LABELS[symptomRating] ?? '';

    if (iflRisk > 45 && symptomRating <= 2) {
      insights.push({
        id: 'symptom-fl-correlation',
        type: 'warning',
        title: 'Flow limitation may be affecting your sleep quality',
        body: `Your IFL Symptom Risk of ${fmt(iflRisk)}% is elevated and you rated this night as ${ratingLabel}. This pattern suggests your flow limitation may be contributing to symptoms. Discuss pressure or settings adjustments with your clinician.`,
        category: 'ned',
      });
    } else if (iflRisk > 45 && symptomRating >= 4) {
      insights.push({
        id: 'symptom-fl-asymptomatic',
        type: 'info',
        title: 'Elevated flow limitation but feeling well',
        body: `Your IFL Symptom Risk of ${fmt(iflRisk)}% is elevated but you rated this night as ${ratingLabel}. Not everyone with elevated FL is symptomatic \u2014 continue monitoring and flag any changes in how you feel.`,
        category: 'ned',
      });
    } else if (iflRisk < 20 && symptomRating <= 2) {
      insights.push({
        id: 'symptom-non-fl-cause',
        type: 'info',
        title: 'Poor sleep quality despite low flow limitation',
        body: `You rated this night as ${ratingLabel} despite low flow limitation (${fmt(iflRisk)}%). Other factors may be contributing \u2014 check your night context (congestion, stress, alcohol) for patterns. If poor sleep persists, discuss with your clinician.`,
        category: 'ned',
      });
    }
  }

  // Settings insights (BiPAP only)
  if (n.settingsMetrics) {
    const sm = n.settingsMetrics;
    const settingsWarningIds: string[] = [];

    if (sm.prematureCyclePct > 10) {
      settingsWarningIds.push('settings-premature-cycle');
      insights.push({
        id: 'settings-premature-cycle',
        type: 'warning',
        title: 'Machine cycling off during active inspiration',
        body: `${fmt(sm.prematureCyclePct, 0)}% of breaths had pressure support withdrawn while you were still inhaling. This can reduce effective ventilation. Consider decreasing Cycle sensitivity — discuss with your clinician.`,
        category: 'settings',
      });
    }

    if (sm.lateCyclePct > 10) {
      settingsWarningIds.push('settings-late-cycle');
      insights.push({
        id: 'settings-late-cycle',
        type: 'warning',
        title: 'Machine slow to release pressure',
        body: `${fmt(sm.lateCyclePct, 0)}% of breaths had pressure support continuing into your expiration. This can make exhaling uncomfortable. Consider increasing Cycle sensitivity — discuss with your clinician.`,
        category: 'settings',
      });
    }

    if (sm.ipapDwellMedianPct < 35) {
      settingsWarningIds.push('settings-low-ipap-dwell');
      insights.push({
        id: 'settings-low-ipap-dwell',
        type: 'actionable',
        title: 'Low time at full pressure support',
        body: `Your machine reaches IPAP but cycles off quickly — only ${fmt(sm.ipapDwellMedianPct, 0)}% of each breath is spent at full pressure. This reduces the effective benefit of your PS setting. Cycle sensitivity or Rise Time may need adjustment.`,
        category: 'settings',
      });
    }

    if (sm.tiMedianMs < 1200) {
      insights.push({
        id: 'settings-ti-short',
        type: 'info',
        title: 'Short inspiratory time',
        body: `Median inspiratory time of ${sm.tiMedianMs}ms is below typical range. If combined with elevated respiratory rate, this may indicate compensatory tachypnea.`,
        category: 'settings',
      });
    }

    if (prev?.settingsMetrics) {
      const tiDelta = sm.tiMedianMs - prev.settingsMetrics.tiMedianMs;
      if (Math.abs(tiDelta) > 150) {
        insights.push({
          id: 'settings-ti-delta',
          type: 'warning',
          title: 'Inspiratory time changed from previous night',
          body: `Ti shifted by ${tiDelta > 0 ? '+' : ''}${Math.round(tiDelta)}ms compared to last night (${prev.settingsMetrics.tiMedianMs}ms → ${sm.tiMedianMs}ms). This may reflect a Cycle or EPAP interaction.`,
          category: 'settings',
        });
      }
    }

    // Only compare detected vs prescribed when settings were actually extracted
    if (n.settings.settingsSource === 'extracted' && n.settings.epap > 0) {
      const epapDelta = Math.abs(sm.epapDetected - n.settings.epap);
      if (epapDelta > 1.0) {
        insights.push({
          id: 'settings-pressure-mismatch',
          type: 'warning',
          title: 'Delivered pressure differs from prescribed',
          body: `Detected EPAP of ${fmt(sm.epapDetected)} cmH₂O differs from your prescribed ${n.settings.epap} cmH₂O by more than 1 cmH₂O. Check for mask leak or machine issues.`,
          category: 'settings',
        });
      }
    }

    if (sm.tidalVolumeCv > 30) {
      insights.push({
        id: 'settings-vt-unstable',
        type: 'info',
        title: 'Unstable ventilation',
        body: `Tidal volume varies significantly breath-to-breath (CV ${fmt(sm.tidalVolumeCv, 0)}%). This may indicate intermittent airway instability affecting how effectively your machine delivers support.`,
        category: 'settings',
      });
    }

    // Positive insight: only if no warnings/actionable settings insights fired
    if (settingsWarningIds.length === 0 &&
        sm.prematureCyclePct < 2 &&
        sm.lateCyclePct < 2 &&
        sm.ipapDwellMedianPct > 45) {
      insights.push({
        id: 'settings-good',
        type: 'positive',
        title: 'Settings delivering as expected',
        body: 'Your Trigger, Cycle, and pressure delivery metrics are all within expected ranges — your machine appears well-matched to your breathing pattern.',
        category: 'settings',
      });
    }
  }

  // Oximetry insights
  if (n.oximetry) {
    const ox = n.oximetry;
    const odiL = getTrafficLight(ox.odi3, THRESHOLDS.odi3!);

    if (odiL === 'bad') {
      insights.push({
        id: 'odi-high',
        type: 'warning',
        title: 'Frequent oxygen desaturations',
        body: `ODI-3 of ${fmt(ox.odi3)} events/hr indicates frequent drops in blood oxygen despite PAP therapy.`,
        category: 'oximetry',
      });
    }

    if (ox.tBelow90 > 15) {
      insights.push({
        id: 'tbelow90-high',
        type: 'warning',
        title: 'Extended time below SpO₂ 90%',
        body: `${fmt(ox.tBelow90)}% of the night spent below 90% SpO₂. This warrants clinical attention.`,
        category: 'oximetry',
      });
    }

    // Tonic vs phasic desaturation: high T<94% with low ODI3
    if (ox.tBelow94 > 15 && ox.odi3 < 5) {
      insights.push({
        id: 'tonic-desat',
        type: 'info',
        title: 'Baseline oxygen lower than usual',
        body: `${fmt(ox.tBelow94)}% of time below 94% SpO2 but only ${fmt(ox.odi3)} desaturation events/hr. This pattern suggests your baseline oxygen level was lower rather than repeated drops from obstruction. Common causes include alcohol, sedating medication, or nasal congestion. If this persists without an obvious cause, discuss with your clinician.`,
        category: 'oximetry',
      });
    }

    if (ox.coupled3_10 > 10) {
      insights.push({
        id: 'coupled-high',
        type: 'info',
        title: 'Frequent coupled desat + HR surge events',
        body: `${fmt(ox.coupled3_10)} coupled events/hr — desaturation and heart rate surge occurring within 30 seconds of each other. This indicates a respiratory cause for these specific events. Note: in UARS, most HR surges and desaturations are independent of each other.`,
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

  // Cross-device insights
  if (n.crossDevice) {
    const cd = n.crossDevice;
    if (cd.couplingPct > 50) {
      insights.push({
        id: 'coupling-high',
        type: 'info',
        title: 'Most breathing events cause arousals',
        body: `${fmt(cd.couplingPct)}% of your breathing events caused heart rate arousals. This suggests your arousal threshold may benefit from clinical review.`,
        category: 'correlation',
      });
    } else if (cd.couplingPct < 25 && cd.totalCount >= 10) {
      insights.push({
        id: 'coupling-low',
        type: 'positive',
        title: 'Low arousal coupling',
        body: `Only ${fmt(cd.couplingPct)}% of your breathing events caused arousals -- your arousal threshold appears well-managed.`,
        category: 'correlation',
      });
    }
    const h2Gap = cd.h2CouplingPct - cd.h1CouplingPct;
    if (h2Gap > 15 && cd.h2CouplingPct > 40) {
      insights.push({
        id: 'coupling-h2-gap',
        type: 'warning',
        title: 'Arousal coupling increases in second half',
        body: `Your arousal coupling is ${fmt(cd.h2CouplingPct)}% in the second half vs ${fmt(cd.h1CouplingPct)}% in the first half. This pattern can indicate medication wearing off -- discuss timing with your clinician.`,
        category: 'correlation',
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

  // IFL Risk trend
  const iflVals = chrono.map((n) => computeIFLRisk(n));
  const iflTrend = trendLowerBetter(iflVals);
  if (iflTrend === 'improving') {
    insights.push({
      id: 'trend-ifl-improving',
      type: 'positive',
      title: 'IFL Symptom Risk trending down',
      body: `Your flow limitation composite has been improving over recent nights \u2014 from ${fmt(iflVals[0]!)}% to ${fmt(iflVals[iflVals.length - 1]!)}%. Your current therapy settings appear to be reducing flow limitation.`,
      category: 'trend',
    });
  } else if (iflTrend === 'worsening') {
    insights.push({
      id: 'trend-ifl-worsening',
      type: 'actionable',
      title: 'IFL Symptom Risk trending upward',
      body: `Your flow limitation composite is increasing over ${nights.length} nights (${fmt(iflVals[0]!)}% \u2192 ${fmt(iflVals[iflVals.length - 1]!)}%). Consider discussing pressure or settings adjustments with your clinician.`,
      category: 'trend',
    });
  }

  const gTrend = trendLowerBetter(glasgowVals);
  if (gTrend === 'improving') {
    insights.push({
      id: 'trend-glasgow-improving',
      type: 'positive',
      title: 'Glasgow Index trending down over time',
      body: `Flow limitation scores are improving across ${nights.length} nights (${fmt(glasgowVals[0]!)} → ${fmt(glasgowVals[glasgowVals.length - 1]!)}).`,
      category: 'trend',
    });
  } else if (gTrend === 'worsening') {
    insights.push({
      id: 'trend-glasgow-worsening',
      type: 'actionable',
      title: 'Glasgow Index trending upward',
      body: `Flow limitation is increasing over ${nights.length} nights (${fmt(glasgowVals[0]!)} → ${fmt(glasgowVals[glasgowVals.length - 1]!)}). Review flow waveforms alongside this trend for context.`,
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
  const glasgowLights = chrono.map((n) => getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall!));
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
      body: `All ${nights.length} nights show elevated Glasgow Index. Visual review of flow waveforms and pressure data can help identify the underlying pattern.`,
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
  therapyChangeDate: string | null,
  symptomRating?: number | null
): Insight[] {
  const single = singleNightInsights(selectedNight, previousNight, symptomRating);
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
