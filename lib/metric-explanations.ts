import type { ThresholdDef } from './thresholds';
import { getTrafficLight } from './thresholds';

function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}

/* ------------------------------------------------------------------ */
/*  Plain-language methodology descriptions                           */
/*  Used in MetricCard info popovers and the About page               */
/* ------------------------------------------------------------------ */

export const METRIC_METHODOLOGIES = {
  glasgowIndex:
    'Each breath is scored against 9 shape characteristics (skew, spike, flat top, top heavy, multi-peak, no pause, inspiratory rate, multi-breath, variable amplitude). Each component represents the proportion of breaths exhibiting that characteristic (0\u20131). The overall Glasgow Index sums 8 components (excluding Top Heavy). Typical scores range from 0 to about 3 \u2014 scores above 3 are rare and indicate very significant problems. It\u2019s a holistic breath-shape score that catches many types of abnormality, not just classic flow limitation.',

  flScore:
    'Computed by the WAT (Wobble Analysis Tool) engine. For each breath window, it measures the ratio of tidal volume variance in the top half vs the full signal. A higher ratio means more variation is concentrated at the flow peaks, indicating flat-topped (flow-limited) breathing. This is a population-level metric \u2014 it looks at the overall distribution of breath shapes, not individual breaths.',

  nedMean:
    'Measured per-breath as (Qpeak \u2212 Qmid) / Qpeak \u00d7 100, where Qpeak is peak inspiratory flow and Qmid is flow at the midpoint of inspiration. When the airway narrows during inhalation, mid-inspiratory flow drops below peak flow. The NED mean is the average of this ratio across all breaths in the night.',

  reraIndex:
    'Detected by finding sequences of 3\u201315 consecutive breaths where NED exceeds 20% or Tpeak/Ti exceeds 0.40. A sequence counts as a RERA if it shows a rising NED slope, ends with a recovery breath (NED drops below 10%), or contains a breath with NED above 34%. The index is validated events per hour of recording.',

  eai:
    'Estimated by detecting sudden spikes in respiratory rate (>20% above a 120-second rolling baseline) or tidal volume (>30% above baseline). Each spike suggests a micro-awakening that fragments sleep. A 15-second refractory period prevents double-counting. This is a proxy \u2014 true arousals require EEG, but respiratory pattern changes correlate well with cortical arousals.',

  regularity:
    'Uses Sample Entropy (SampEn) on minute ventilation to quantify how predictable your breathing rhythm is. On PAP therapy, highly regular (repetitive) breathing often indicates a persistently narrowed airway forcing uniform restricted breaths. Lower scores reflect healthy natural breath-to-breath variability.',

  periodicity:
    'Applies FFT (frequency spectrum analysis) to minute ventilation, looking for power concentrated in the 0.01\u20130.03 Hz band. This band corresponds to 30\u2013100 second breathing cycles, characteristic of periodic breathing or Cheyne-Stokes respiration.',

  combinedFL:
    'Percentage of breaths classified as flow-limited by either NED (\u226534%) or Flatness Index (\u22650.85). Combines both detection methods to catch obstruction that either method alone might miss.',

  odi3:
    'Counts the number of times per hour your blood oxygen drops by 3% or more from a 2-minute rolling baseline. Each drop is called a desaturation event. More events per hour indicate more frequent breathing disruptions affecting oxygen levels.',

  briefObstructionIndex:
    'Detected by tracking peak inspiratory flow (Qpeak) against a rolling 30-breath median baseline. When Qpeak drops >40% from baseline for just 1-2 breaths, it counts as a brief obstruction. These events are too short for standard hypopnea scoring (which requires 10+ seconds) but represent momentary airway collapses. The detector skips 5 breaths after each event to avoid counting the same collapse twice.',

  hypopneaIndex:
    'When EVE.edf files are present in your upload, AirwayLab uses your machine\u2019s own hypopnea count \u2014 it has access to internal algorithms we can\u2019t replicate. When EVE.edf is absent, AirwayLab detects hypopneas by tracking flow amplitude drops (\u226530% from a rolling baseline, sustained \u226510 seconds). Either way, each event is also checked for NED shape \u2014 events with NED <34% during the drop are flagged as \u201cNED-invisible\u201d since shape-based analysis would miss them.',

  amplitudeCv:
    'Divides the night into 5-minute epochs and computes the coefficient of variation (standard deviation / mean) of peak inspiratory flow within each epoch. Normal tidal breathing has ~15-20% CV. Higher values indicate the airway is intermittently compromising \u2014 even if individual breath shapes look normal by NED.',

  whyDisagree:
    'Glasgow, FL Score, and NED use different methods to detect different aspects of flow limitation. Glasgow scores 9 breath-shape characteristics holistically. FL Score measures population-level flatness across all breaths. NED measures per-breath peak-to-mid flow drops specifically. A high FL Score with low Glasgow can happen when breaths are moderately flat but don\u2019t show the specific shape distortions Glasgow targets (skew, spikes, multi-peaks). Low NED with high Glasgow occurs when breath shapes are abnormal in ways that don\u2019t affect the peak-to-mid flow ratio. Using all three together gives a more complete picture than any single metric.',
} as const;

export function getGlasgowExplanation(value: number, threshold: ThresholdDef): string {
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return `Your Glasgow Index of ${fmt(value)} is in the healthy range. Your breathing shows minimal flow limitation — your airway appears to be staying open well during sleep.`;
  }
  if (light === 'warn') {
    return `Your Glasgow Index of ${fmt(value)} is in the borderline range. Your breathing shows some signs of flow limitation — your airway may be partially narrowing during sleep, even though it's not fully closing. Consider discussing this with your clinician.`;
  }
  return `Your Glasgow Index of ${fmt(value)} indicates significant flow limitation. Your airway is partially narrowing during sleep frequently enough to affect breathing quality. Discuss pressure or settings adjustments with your clinician.`;
}

export function getEAIExplanation(value: number, threshold: ThresholdDef): string {
  if (value === 0) return '';
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return `Your Respiratory Disruption Index of ${fmt(value)}/hr is low, indicating few detected recovery breaths after flow-limited sequences. Note: research suggests flow limitation itself can drive symptoms independently of arousals, so check your flow limitation metrics (Glasgow Index, FL Score, NED) as well.`;
  }
  if (light === 'warn') {
    return `Your Respiratory Disruption Index of ${fmt(value)}/hr is moderately elevated. Your breathing shows recovery breaths after flow-limited sequences, suggesting your nervous system is responding to breathing difficulty. Note: this flow-based estimate typically reads higher than an in-lab arousal index measured with EEG.`;
  }
  return `Your Respiratory Disruption Index of ${fmt(value)}/hr is elevated. Frequent recovery breaths following flow limitation suggest your nervous system is repeatedly responding to breathing difficulty. Discuss with your clinician — an in-lab study with EEG can measure true cortical arousals directly.`;
}

export function getNEDExplanation(nedMean: number, reraIndex: number, nedThreshold: ThresholdDef): string {
  const light = getTrafficLight(nedMean, nedThreshold);
  if (light === 'good' && reraIndex < 5) {
    return `Your NED mean of ${fmt(nedMean)}% with ${fmt(reraIndex)} RERAs/hr shows well-controlled breathing effort. Your therapy is effectively keeping your airway open.`;
  }
  if (reraIndex >= 10) {
    return `Your RERA index of ${fmt(reraIndex)}/hr means your breathing effort increases frequently before triggering a brief arousal. These events don't show up in AHI but can significantly fragment sleep.`;
  }
  if (light === 'bad') {
    return `Your NED mean of ${fmt(nedMean)}% indicates sustained breathing effort throughout the night. This suggests your airway is working harder than it should, even if full apneas aren't occurring.`;
  }
  return `Your NED analysis shows moderate breathing effort (mean ${fmt(nedMean)}%) with ${fmt(reraIndex)} RERAs/hr. Some residual flow limitation is present.`;
}

export function getIFLRiskExplanation(value: number, threshold: ThresholdDef): string {
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return 'Your flow limitation composite is low. Your airway appears to be functioning well during therapy.';
  }
  if (light === 'warn') {
    return 'Moderate flow limitation detected across multiple metrics. This level of FL may be contributing to symptoms. Discuss whether pressure or settings adjustments could help with your clinician.';
  }
  return 'Significant flow limitation detected. Research suggests this level of FL can drive fatigue and unrefreshing sleep via a stress response, even without frequent arousals. Discuss therapy optimisation with your clinician.';
}

export function getODIExplanation(odi3: number, threshold: ThresholdDef): string {
  const light = getTrafficLight(odi3, threshold);
  if (light === 'good') {
    return `Your ODI-3 of ${fmt(odi3)}/hr shows few oxygen desaturations. Your blood oxygen is staying stable during sleep.`;
  }
  if (light === 'warn') {
    return `Your ODI-3 of ${fmt(odi3)}/hr shows moderate oxygen drops during sleep. Each desaturation event means your blood oxygen briefly dropped by 3% or more, which can trigger your body's stress response.`;
  }
  return `Your ODI-3 of ${fmt(odi3)}/hr indicates frequent oxygen desaturations. Your blood oxygen is dropping significantly and repeatedly during sleep, which warrants clinical attention.`;
}
