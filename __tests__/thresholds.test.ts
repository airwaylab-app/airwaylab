import { describe, it, expect } from 'vitest';
import {
  getTrafficLight,
  getTrafficColor,
  getTrafficBg,
  getTrafficDotColor,
  getThresholdKeysByPanel,
  getMetricPanel,
  isProxyMetric,
  THRESHOLDS,
  PANEL_LABELS,
  PANEL_DESCRIPTIONS,
  type ThresholdDef,
  type MetricPanel,
} from '@/lib/thresholds';

describe('getTrafficLight', () => {
  describe('lower-is-better metrics', () => {
    const threshold: ThresholdDef = { green: 1.0, amber: 2.0, lowerIsBetter: true };

    it('returns "good" when value is below green threshold', () => {
      expect(getTrafficLight(0.5, threshold)).toBe('good');
    });

    it('returns "good" when value equals green threshold', () => {
      expect(getTrafficLight(1.0, threshold)).toBe('good');
    });

    it('returns "warn" when value is between green and amber', () => {
      expect(getTrafficLight(1.5, threshold)).toBe('warn');
    });

    it('returns "warn" when value equals amber threshold', () => {
      expect(getTrafficLight(2.0, threshold)).toBe('warn');
    });

    it('returns "bad" when value exceeds amber threshold', () => {
      expect(getTrafficLight(3.0, threshold)).toBe('bad');
    });

    it('handles zero values', () => {
      expect(getTrafficLight(0, threshold)).toBe('good');
    });

    it('handles negative values', () => {
      expect(getTrafficLight(-1, threshold)).toBe('good');
    });
  });

  describe('higher-is-better metrics', () => {
    const threshold: ThresholdDef = { green: 95, amber: 92, lowerIsBetter: false };

    it('returns "good" when value is above green threshold', () => {
      expect(getTrafficLight(97, threshold)).toBe('good');
    });

    it('returns "good" when value equals green threshold', () => {
      expect(getTrafficLight(95, threshold)).toBe('good');
    });

    it('returns "warn" when value is between amber and green', () => {
      expect(getTrafficLight(93, threshold)).toBe('warn');
    });

    it('returns "warn" when value equals amber threshold', () => {
      expect(getTrafficLight(92, threshold)).toBe('warn');
    });

    it('returns "bad" when value is below amber', () => {
      expect(getTrafficLight(88, threshold)).toBe('bad');
    });
  });

  describe('real thresholds', () => {
    it('Glasgow overall: 0.5 is good', () => {
      expect(getTrafficLight(0.5, THRESHOLDS.glasgowOverall!)).toBe('good');
    });

    it('Glasgow overall: 1.5 is warn', () => {
      expect(getTrafficLight(1.5, THRESHOLDS.glasgowOverall!)).toBe('warn');
    });

    it('Glasgow overall: 3.0 is bad', () => {
      expect(getTrafficLight(3.0, THRESHOLDS.glasgowOverall!)).toBe('bad');
    });

    it('SpO2 mean: 96 is good (higher-is-better)', () => {
      expect(getTrafficLight(96, THRESHOLDS.spo2Mean!)).toBe('good');
    });

    it('SpO2 mean: 90 is bad (higher-is-better)', () => {
      expect(getTrafficLight(90, THRESHOLDS.spo2Mean!)).toBe('bad');
    });

    it('ODI-3: 3 is good', () => {
      expect(getTrafficLight(3, THRESHOLDS.odi3!)).toBe('good');
    });

    it('RERA index: 12 is bad', () => {
      expect(getTrafficLight(12, THRESHOLDS.reraIndex!)).toBe('bad');
    });
  });
});

describe('getTrafficColor', () => {
  it('returns correct Tailwind class for good', () => {
    expect(getTrafficColor('good')).toBe('text-emerald-500');
  });

  it('returns correct Tailwind class for warn', () => {
    expect(getTrafficColor('warn')).toBe('text-amber-500');
  });

  it('returns correct Tailwind class for bad', () => {
    expect(getTrafficColor('bad')).toBe('text-red-500');
  });
});

describe('getTrafficBg', () => {
  it('returns correct background for each state', () => {
    expect(getTrafficBg('good')).toContain('emerald');
    expect(getTrafficBg('warn')).toContain('amber');
    expect(getTrafficBg('bad')).toContain('red');
  });
});

describe('getTrafficDotColor', () => {
  it('returns correct dot color for each state', () => {
    expect(getTrafficDotColor('good')).toBe('bg-emerald-500');
    expect(getTrafficDotColor('warn')).toBe('bg-amber-500');
    expect(getTrafficDotColor('bad')).toBe('bg-red-500');
  });
});

describe('settings thresholds', () => {
  it('has all 10 settings threshold keys', () => {
    const settingsKeys = [
      'settingsTriggerDelay', 'settingsAutoTrigger', 'settingsTi',
      'settingsIeRatio', 'settingsTimeAtIpap', 'settingsIpapDwell',
      'settingsPrematureCycle', 'settingsLateCycle', 'settingsVtCv',
      'settingsEpapDelta',
    ];
    for (const key of settingsKeys) {
      expect(THRESHOLDS).toHaveProperty(key);
    }
  });

  it('settingsTriggerDelay: 200ms=good, 400ms=warn, 600ms=bad', () => {
    expect(getTrafficLight(200, THRESHOLDS.settingsTriggerDelay!)).toBe('good');
    expect(getTrafficLight(400, THRESHOLDS.settingsTriggerDelay!)).toBe('warn');
    expect(getTrafficLight(600, THRESHOLDS.settingsTriggerDelay!)).toBe('bad');
  });

  it('settingsTi: 1500ms=good, 1100ms=warn, 800ms=bad (higher-is-better)', () => {
    expect(getTrafficLight(1500, THRESHOLDS.settingsTi!)).toBe('good');
    expect(getTrafficLight(1100, THRESHOLDS.settingsTi!)).toBe('warn');
    expect(getTrafficLight(800, THRESHOLDS.settingsTi!)).toBe('bad');
  });

  it('settingsIpapDwell: 50%=good, 40%=warn, 30%=bad (higher-is-better)', () => {
    expect(getTrafficLight(50, THRESHOLDS.settingsIpapDwell!)).toBe('good');
    expect(getTrafficLight(40, THRESHOLDS.settingsIpapDwell!)).toBe('warn');
    expect(getTrafficLight(30, THRESHOLDS.settingsIpapDwell!)).toBe('bad');
  });
});

describe('THRESHOLDS object', () => {
  it('has all expected threshold keys', () => {
    const expected = [
      'glasgowOverall', 'nedMean', 'nedP95', 'nedClearFL', 'combinedFL',
      'reraIndex', 'watFL', 'watRegularity', 'watPeriodicity',
      'hrClin10', 'odi3', 'odi4', 'tBelow90', 'tBelow94', 'spo2Mean',
    ];
    for (const key of expected) {
      expect(THRESHOLDS).toHaveProperty(key);
    }
  });

  it('all thresholds have valid structure', () => {
    for (const [_key, def] of Object.entries(THRESHOLDS)) {
      expect(typeof def.green).toBe('number');
      expect(typeof def.amber).toBe('number');
      expect(typeof def.lowerIsBetter).toBe('boolean');
      // For lower-is-better, green < amber; for higher-is-better, green > amber
      if (def.lowerIsBetter) {
        expect(def.green).toBeLessThanOrEqual(def.amber);
      } else {
        expect(def.green).toBeGreaterThanOrEqual(def.amber);
      }
    }
  });
});

describe('metric tier hierarchy', () => {
  it('every threshold has a tier assignment', () => {
    for (const [key, def] of Object.entries(THRESHOLDS)) {
      expect(def.tier, `${key} missing tier`).toBeDefined();
    }
  });

  it('every threshold has a panel assignment', () => {
    for (const [key, def] of Object.entries(THRESHOLDS)) {
      expect(def.panel, `${key} missing panel`).toBeDefined();
    }
  });

  it('outcome panel contains Tier 1 oximetry metrics', () => {
    const outcomeKeys = getThresholdKeysByPanel('outcome');
    expect(outcomeKeys).toContain('odi3');
    expect(outcomeKeys).toContain('spo2Mean');
    expect(outcomeKeys).toContain('hrClin10');
    expect(outcomeKeys).toContain('tBelow94');
  });

  it('pattern panel contains Tier 2 proxy metrics', () => {
    const patternKeys = getThresholdKeysByPanel('pattern');
    expect(patternKeys).toContain('iflRisk');
    expect(patternKeys).toContain('nedMean');
    expect(patternKeys).toContain('reraIndex');
    expect(patternKeys).toContain('eai');
  });

  it('context panel contains Tier 3 metrics', () => {
    const contextKeys = getThresholdKeysByPanel('context');
    expect(contextKeys).toContain('glasgowOverall');
    expect(contextKeys).toContain('watFL');
    expect(contextKeys).toContain('watRegularity');
  });

  it('device panel contains machine and settings metrics', () => {
    const deviceKeys = getThresholdKeysByPanel('device');
    expect(deviceKeys).toContain('machineAhi');
    expect(deviceKeys).toContain('leak95');
    expect(deviceKeys).toContain('settingsTriggerDelay');
  });

  it('machineAhi is Tier 1-asym (alarm-only)', () => {
    expect(THRESHOLDS.machineAhi!.tier).toBe('1-asym');
  });

  it('getMetricPanel returns correct panel', () => {
    expect(getMetricPanel('odi3')).toBe('outcome');
    expect(getMetricPanel('nedMean')).toBe('pattern');
    expect(getMetricPanel('glasgowOverall')).toBe('context');
    expect(getMetricPanel('machineAhi')).toBe('device');
  });

  it('getMetricPanel returns null for unknown key', () => {
    expect(getMetricPanel('nonexistent')).toBeNull();
  });

  it('isProxyMetric identifies Tier 2/3 correctly', () => {
    expect(isProxyMetric('iflRisk')).toBe(true);
    expect(isProxyMetric('nedMean')).toBe(true);
    expect(isProxyMetric('glasgowOverall')).toBe(true);
    expect(isProxyMetric('odi3')).toBe(false);
    expect(isProxyMetric('machineAhi')).toBe(false);
  });

  it('all four panels have labels and descriptions', () => {
    const panels: MetricPanel[] = ['outcome', 'pattern', 'context', 'device'];
    for (const panel of panels) {
      expect(PANEL_LABELS[panel]).toBeTruthy();
      expect(PANEL_DESCRIPTIONS[panel]).toBeTruthy();
    }
  });

  it('no threshold key is unclassified (panel covers all)', () => {
    const allPanelKeys = new Set([
      ...getThresholdKeysByPanel('outcome'),
      ...getThresholdKeysByPanel('pattern'),
      ...getThresholdKeysByPanel('context'),
      ...getThresholdKeysByPanel('device'),
    ]);
    const allKeys = Object.keys(THRESHOLDS);
    expect(allPanelKeys.size).toBe(allKeys.length);
  });
});
