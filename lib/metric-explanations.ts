import type { ThresholdDef } from './thresholds';
import { getTrafficLight } from './thresholds';

function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}

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
    return `Your Estimated Arousal Index of ${fmt(value)}/hr is low. Your brain appears to be maintaining stable sleep without frequent respiratory disruptions.`;
  }
  if (light === 'warn') {
    return `Your Estimated Arousal Index of ${fmt(value)}/hr is moderately elevated. Your breathing pattern shows signs of frequent mini-awakenings, which can fragment sleep even if you don't remember waking up.`;
  }
  return `Your Estimated Arousal Index of ${fmt(value)}/hr is high. Your breathing pattern suggests your brain is waking up frequently — potentially dozens of times per hour — which can leave you feeling exhausted even after a full night of sleep.`;
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
