import type { ThresholdDef } from './thresholds';
import { getTrafficLight } from './thresholds';
import { fmt } from './format-utils';

/* ------------------------------------------------------------------ */
/*  Plain-language metric summaries                                    */
/*  One-sentence descriptions for users who want the "what" not "how" */
/* ------------------------------------------------------------------ */

export const METRIC_PLAIN_LANGUAGE: Record<string, string> = {
  iflRisk:
    'A composite score estimating how much flow limitation may be affecting your sleep quality. Higher values suggest greater symptom risk.',
  glasgowIndex:
    'A breath-shape score measuring how far your breathing deviates from normal flow patterns.',
  flScore:
    'How much of your breathing shows restricted airflow. Higher values mean your airway narrows during sleep.',
  nedMean:
    'Average negative effort dependence -- how much your airway resists airflow during inspiration.',
  reraIndex:
    'How often your breathing effort increases enough to briefly disrupt sleep, even without a full apnoea.',
  eai:
    'An estimate of how often your breathing disruptions cause brief recovery responses, based on flow patterns.',
  regularity:
    'How repetitive your breathing rhythm is. On PAP therapy, high regularity can signal persistently restricted airflow.',
  periodicity:
    'Detects repeating breathing cycles that may indicate periodic breathing or central events.',
  combinedFL:
    'The percentage of breaths where your airway was partially restricted, combining two independent detection methods.',
  odi3:
    'How many times per hour your blood oxygen drops by 3% or more from a recent baseline.',
  tBelow90:
    'Total time your blood oxygen spent below 90%, a level where your body may start to experience stress.',
  spo2Mean:
    'Your average blood oxygen level throughout the night. Normal range is 94-98%.',
  hrClin10:
    'How often your heart rate surges by 10+ beats per minute, which can indicate breathing-related arousals.',
  briefObstructionIndex:
    'How often your airway briefly collapses for just one or two breaths -- too short for standard detection methods.',
  hypopneaIndex:
    'How often your airflow drops significantly for 10 or more seconds, indicating partial airway collapse.',
  amplitudeCv:
    'How much your breath size varies within each 5-minute window. Higher values suggest intermittent airway compromise.',
  estimatedRdi:
    'An estimated count of all respiratory disruptions per hour, combining RERAs and hypopnoeas detected from flow data.',
};

/* ------------------------------------------------------------------ */
/*  Plain-language methodology descriptions                           */
/*  Used in MetricCard info popovers and the About page               */
/* ------------------------------------------------------------------ */

export const METRIC_METHODOLOGIES = {
  glasgowIndex:
    'Each breath is scored against 9 shape characteristics (skew, spike, flat top, top heavy, multi-peak, no pause, inspiratory rate, multi-breath, variable amplitude). Each component represents the proportion of breaths exhibiting that characteristic (0\u20131). The overall Glasgow Index sums all 9 components (0\u20139 scale). Note: the original Glasgow Index Excel tool used a 0\u20133 summary scale \u2014 AirwayLab uses the full 0\u20139 component sum for more granularity. Typical scores range from 0 to about 3; scores above 3 are rare and indicate very significant problems. It\u2019s a holistic breath-shape score that catches many types of abnormality, not just classic flow limitation.',

  flScore:
    'Computed by the WAT (Wobble Analysis Tool) engine. For each breath window, it measures the ratio of tidal volume variance in the top half vs the full signal. A higher ratio means more variation is concentrated at the flow peaks, indicating flat-topped (flow-limited) breathing. This is a population-level metric \u2014 it looks at the overall distribution of breath shapes, not individual breaths.',

  nedMean:
    'Measured per-breath as (Qpeak \u2212 Qmid) / Qpeak \u00d7 100, where Qpeak is peak inspiratory flow and Qmid is flow at the midpoint of inspiration. When the airway narrows during inhalation, mid-inspiratory flow drops below peak flow. The NED mean is the average of this ratio across all breaths in the night.',

  reraIndex:
    'Detected by finding sequences of 3\u201315 consecutive breaths where NED exceeds 20% or Flatness Index exceeds 0.85. A sequence counts as a RERA if it shows a rising NED slope, ends with a recovery breath (NED drops below 10%), or contains a breath with NED above 34%. The index is validated events per hour of recording.',

  eai:
    'Estimated by detecting breaths where both respiratory rate (>35% above a 120-second rolling baseline) and tidal volume (>50% above baseline) spike simultaneously, and where at least 2 of the preceding 5 breaths showed flow limitation (NED >= 20% or FI >= 0.85). A 30-second refractory period prevents double-counting. This is a secondary marker \u2014 true arousals require EEG, and research suggests flow limitation itself drives symptoms independently of arousals. Check your flow limitation metrics (Glasgow, FL Score, NED) for the primary picture.',

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

  estimatedRdi:
    'Combines two types of breathing events detected from your flow data: RERAs (short sequences where your airway progressively narrows before a brief recovery breath) and hypopneas (sustained drops in airflow). This gives an estimated Respiratory Disturbance Index — a measure of how often your breathing is disrupted each hour. Note: a full clinical RDI also includes apneas (complete airway blockages), which cannot be detected from flow data alone, so this estimate is a conservative lower bound. It is most accurate when apneas are rare — as is typical in upper airway resistance syndrome (UARS).',

  whyDisagree:
    'Glasgow, FL Score, and NED use different methods to detect different aspects of flow limitation. Glasgow scores 9 breath-shape characteristics holistically. FL Score measures population-level flatness across all breaths. NED measures per-breath peak-to-mid flow drops specifically. A high FL Score with low Glasgow can happen when breaths are moderately flat but don\u2019t show the specific shape distortions Glasgow targets (skew, spikes, multi-peaks). Low NED with high Glasgow occurs when breath shapes are abnormal in ways that don\u2019t affect the peak-to-mid flow ratio. Using all three together gives a more complete picture than any single metric.',
} as const;

/* ------------------------------------------------------------------ */
/*  Settings Validation methodology descriptions                      */
/*  Used in the Settings dashboard tab MetricCard popovers            */
/* ------------------------------------------------------------------ */

export const SETTINGS_METHODOLOGIES = {
  triggerMetrics:
    'Computed by comparing the 25Hz BRP flow and pressure channels. Inspiration start is detected by a positive-going zero crossing in smoothed flow. Trigger delay is measured from flow onset to the first pressure sample exceeding EPAP + 15% of PS. Auto-triggers are counted when pressure is already above this threshold at flow onset.',

  cycleMetrics:
    'Ti and Te are measured from zero-crossings in smoothed flow. Time-at-IPAP counts pressure samples exceeding EPAP + 90% of PS during inspiration. Premature cycling is detected when pressure drops below EPAP + 50% of PS while flow still exceeds 25% of peak. Late cycling is flagged when the first 100ms of expiratory pressure exceeds the 50% PS threshold.',

  ventilationMetrics:
    'Tidal volume is the integral of inspiratory flow (sum of samples / 60 / sampling rate). CV is standard deviation / mean of all tidal volumes. Minute ventilation is total volume / recording hours. Note: absolute mL values depend on your device\u2019s flow calibration \u2014 night-over-night comparisons and CV are always valid.',

  pressureDetection:
    'EPAP and IPAP are detected from the full BRP pressure channel using P10 and P90 percentiles. This correctly handles the bimodal pressure distribution (EPAP during expiration, IPAP during inspiration) that would bias mean/median estimates toward EPAP.',

  endExpPressure:
    'Measured from the 200ms of pressure data immediately before each inspiration start. The mean should match your prescribed EPAP; the standard deviation indicates how consistently the machine returns to baseline between breaths.',
} as const;

export function getGlasgowExplanation(value: number, threshold: ThresholdDef): string {
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return `Your Glasgow Index of ${fmt(value)} is in the healthy range. Your breathing shows minimal flow limitation — your airway appears to be staying open well during sleep.`;
  }
  if (light === 'warn') {
    return `Your Glasgow Index of ${fmt(value)} is in the borderline range. Your breathing shows some signs of flow limitation — your airway may be partially narrowing during sleep, even though it's not fully closing. Consider discussing this with your clinician.`;
  }
  return `Your Glasgow Index of ${fmt(value)} indicates significant flow limitation. Your airway is partially narrowing during sleep frequently enough to affect breathing quality. Discuss these patterns with your clinician.`;
}

export function getEAIExplanation(value: number, threshold: ThresholdDef): string {
  if (value === 0) return '';
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return `Your Respiratory Disruption Index of ${fmt(value)}/hr is low, indicating few detected recovery breaths after flow-limited sequences. This is a secondary marker \u2014 research suggests flow limitation itself can drive symptoms independently of arousals, so check your flow limitation metrics (Glasgow Index, FL Score, NED) for the primary picture.`;
  }
  if (light === 'warn') {
    return `Your Respiratory Disruption Index of ${fmt(value)}/hr is moderately elevated. This is a secondary marker \u2014 your breathing shows recovery breaths after flow-limited sequences, suggesting your nervous system is responding to breathing difficulty. Check your flow limitation metrics (Glasgow, FL Score, NED) for the primary picture. Note: this flow-based estimate typically reads higher than an in-lab arousal index.`;
  }
  return `Your Respiratory Disruption Index of ${fmt(value)}/hr is elevated. Important: this flow-based estimate typically reads 2\u20133x higher than an in-lab arousal index measured with EEG, because it detects respiratory recovery patterns that don\u2019t always correspond to cortical arousals. This is a secondary marker \u2014 check your flow limitation metrics (Glasgow, FL Score, NED) for the primary picture. Discuss with your clinician if concerned.`;
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
    return `Your NED mean of ${fmt(nedMean)}% shows mid-inspiratory flow reduction throughout the night. This level of breathing effort is elevated, even if full apneas aren't occurring.`;
  }
  return `Your NED analysis shows moderate breathing effort (mean ${fmt(nedMean)}%) with ${fmt(reraIndex)} RERAs/hr. Some residual flow limitation is present.`;
}

export function getIFLRiskExplanation(value: number, threshold: ThresholdDef): string {
  const light = getTrafficLight(value, threshold);
  if (light === 'good') {
    return 'Your flow limitation composite is low. Your airway appears to be functioning well during therapy.';
  }
  if (light === 'warn') {
    return 'Moderate flow limitation detected across multiple metrics. Individual sensitivity varies \u2014 this level of FL may be contributing to symptoms in some people. Discuss these findings with your clinician.';
  }
  return 'Multiple flow limitation metrics are elevated. Individual experiences vary. Discuss with your clinician if you have concerns.';
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
