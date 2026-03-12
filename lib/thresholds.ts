// Traffic light thresholds: [greenMax, amberMax] — above amberMax is red
// Lower-is-better metrics (default)
export type ThresholdDef = {
  green: number;
  amber: number;
  lowerIsBetter: boolean;
};

export const THRESHOLDS: Record<string, ThresholdDef> = {
  iflRisk: { green: 20, amber: 45, lowerIsBetter: true },
  glasgowOverall: { green: 1.0, amber: 2.0, lowerIsBetter: true },
  nedMean: { green: 15, amber: 25, lowerIsBetter: true },
  nedP95: { green: 30, amber: 50, lowerIsBetter: true },
  nedClearFL: { green: 2, amber: 5, lowerIsBetter: true },
  combinedFL: { green: 20, amber: 40, lowerIsBetter: true },
  reraIndex: { green: 5, amber: 10, lowerIsBetter: true },
  watFL: { green: 30, amber: 50, lowerIsBetter: true },
  watRegularity: { green: 30, amber: 50, lowerIsBetter: true },
  watPeriodicity: { green: 20, amber: 40, lowerIsBetter: true },
  eai: { green: 10, amber: 20, lowerIsBetter: true },
  hrClin10: { green: 10, amber: 20, lowerIsBetter: true },
  odi3: { green: 5, amber: 15, lowerIsBetter: true },
  odi4: { green: 3, amber: 10, lowerIsBetter: true },
  tBelow90: { green: 5, amber: 15, lowerIsBetter: true },
  tBelow94: { green: 10, amber: 30, lowerIsBetter: true },
  spo2Mean: { green: 95, amber: 92, lowerIsBetter: false },
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
