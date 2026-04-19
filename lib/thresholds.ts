// Traffic light thresholds: [greenMax, amberMax] — above amberMax is red
// Lower-is-better metrics (default)

import type { MetricTier } from './metric-registry';

/**
 * UI panel grouping derived from metric tiers.
 * - outcome: Tier 1 direct measurements (ODI, SpO₂, machine AHI)
 * - pattern: Tier 2 reliable proxies (NED, RERA, IFL composite)
 * - context: Tier 3 contextual indicators (Glasgow, WAT)
 * - device:  Machine-reported and settings metrics
 */
export type MetricPanel = 'outcome' | 'pattern' | 'context' | 'device';

export type ThresholdDef = {
  green: number;
  amber: number;
  lowerIsBetter: boolean;
  tier?: MetricTier;
  panel?: MetricPanel;
};

export const THRESHOLDS: Record<string, ThresholdDef> = {
  // ---------- Pattern metrics (Tier 2 — reliable proxies) ----------
  iflRisk: { green: 20, amber: 45, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  nedMean: { green: 15, amber: 25, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  nedP95: { green: 30, amber: 50, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  nedClearFL: { green: 2, amber: 5, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  combinedFL: { green: 20, amber: 40, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  reraIndex: { green: 5, amber: 10, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  eai: { green: 5, amber: 10, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  briefObstructionIndex: { green: 3, amber: 6, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  hypopneaIndex: { green: 2, amber: 5, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  amplitudeCv: { green: 20, amber: 30, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  unstableEpochPct: { green: 15, amber: 25, lowerIsBetter: true, tier: 2, panel: 'pattern' },
  estimatedRdi: { green: 5, amber: 15, lowerIsBetter: true, tier: 2, panel: 'pattern' },

  // ---------- Context metrics (Tier 3 — contextual indicators) ----------
  glasgowOverall: { green: 1.0, amber: 2.0, lowerIsBetter: true, tier: 3, panel: 'context' },
  watFL: { green: 30, amber: 50, lowerIsBetter: true, tier: 3, panel: 'context' },
  watRegularity: { green: 30, amber: 50, lowerIsBetter: true, tier: 3, panel: 'context' },
  watPeriodicity: { green: 20, amber: 40, lowerIsBetter: true, tier: 3, panel: 'context' },

  // ---------- Outcome metrics (Tier 1 — direct measurements) ----------
  hrClin10: { green: 10, amber: 20, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  odi3: { green: 5, amber: 15, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  odi4: { green: 3, amber: 10, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  tBelow90: { green: 5, amber: 15, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  tBelow94: { green: 10, amber: 30, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  spo2Mean: { green: 95, amber: 92, lowerIsBetter: false, tier: 1, panel: 'outcome' },
  couplingPct: { green: 30, amber: 50, lowerIsBetter: true, tier: 1, panel: 'outcome' },
  h2CouplingGap: { green: 10, amber: 25, lowerIsBetter: true, tier: 1, panel: 'outcome' },

  // ---------- Device metrics (Tier 1-asym / Tier 3) ----------
  machineAhi: { green: 5, amber: 10, lowerIsBetter: true, tier: '1-asym', panel: 'device' },
  leak95: { green: 24, amber: 40, lowerIsBetter: true, tier: 3, panel: 'device' },
  spontCycPct: { green: 80, amber: 60, lowerIsBetter: false, tier: 3, panel: 'device' },

  // ---------- Settings validation thresholds (BiPAP) ----------
  settingsTriggerDelay: { green: 300, amber: 500, lowerIsBetter: true, tier: 3, panel: 'device' },
  settingsAutoTrigger: { green: 2, amber: 5, lowerIsBetter: true, tier: 3, panel: 'device' },
  settingsTi: { green: 1200, amber: 1000, lowerIsBetter: false, tier: 3, panel: 'device' },
  settingsIeRatio: { green: 1.2, amber: 1.0, lowerIsBetter: false, tier: 3, panel: 'device' },
  settingsTimeAtIpap: { green: 600, amber: 400, lowerIsBetter: false, tier: 3, panel: 'device' },
  settingsIpapDwell: { green: 45, amber: 35, lowerIsBetter: false, tier: 3, panel: 'device' },
  settingsPrematureCycle: { green: 2, amber: 10, lowerIsBetter: true, tier: 3, panel: 'device' },
  settingsLateCycle: { green: 2, amber: 10, lowerIsBetter: true, tier: 3, panel: 'device' },
  settingsVtCv: { green: 25, amber: 30, lowerIsBetter: true, tier: 3, panel: 'device' },
  settingsEpapDelta: { green: 0.5, amber: 1.0, lowerIsBetter: true, tier: 3, panel: 'device' },
};

export type TrafficLight = 'good' | 'warn' | 'bad';

export function getTrafficLight(value: number, threshold: ThresholdDef): TrafficLight {
  if (threshold.lowerIsBetter) {
    if (value <= threshold.green) return 'good';
    if (value <= threshold.amber) return 'warn';
    return 'bad';
  }
  // Higher is better (spo2Mean)
  if (value >= threshold.green) return 'good';
  if (value >= threshold.amber) return 'warn';
  return 'bad';
}

export function getTrafficColor(light: TrafficLight): string {
  switch (light) {
    case 'good': return 'text-emerald-500';
    case 'warn': return 'text-amber-500';
    case 'bad': return 'text-red-500';
  }
}

export function getTrafficBg(light: TrafficLight): string {
  switch (light) {
    case 'good': return 'bg-emerald-500/10';
    case 'warn': return 'bg-amber-500/10';
    case 'bad': return 'bg-red-500/10';
  }
}

export function getTrafficDotColor(light: TrafficLight): string {
  switch (light) {
    case 'good': return 'bg-emerald-500';
    case 'warn': return 'bg-amber-500';
    case 'bad': return 'bg-red-500';
  }
}

/** Get all threshold keys belonging to a specific panel group */
export function getThresholdKeysByPanel(panel: MetricPanel): string[] {
  return Object.entries(THRESHOLDS)
    .filter(([, def]) => def.panel === panel)
    .map(([key]) => key);
}

/** Get the panel group for a threshold key */
export function getMetricPanel(key: string): MetricPanel | null {
  return THRESHOLDS[key]?.panel ?? null;
}

/** Check if a metric is a proxy (Tier 2/3) rather than a direct outcome (Tier 1) */
export function isProxyMetric(key: string): boolean {
  const tier = THRESHOLDS[key]?.tier;
  return tier === 2 || tier === 3;
}

/** Panel display labels for UI headings */
export const PANEL_LABELS: Record<MetricPanel, string> = {
  outcome: 'Outcome Metrics',
  pattern: 'Pattern Metrics',
  context: 'Context Metrics',
  device: 'Device Metrics',
};

/** Panel descriptions for UI subheadings */
export const PANEL_DESCRIPTIONS: Record<MetricPanel, string> = {
  outcome: 'Direct measurements from oximetry and machine data',
  pattern: 'Reliable proxy indicators from breath-by-breath analysis',
  context: 'Contextual flow shape indicators — interpret alongside outcome metrics',
  device: 'Machine-reported statistics and settings validation',
};
