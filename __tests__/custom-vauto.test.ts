import { describe, it, expect } from 'vitest';
import {
  parseCustomSettings,
  parseVAutoGlobalSettings,
  formatCustomVAutoSummary,
} from '@/lib/parsers/custom-settings-parser';
import { findCustomSettingsFile, findVAutoGlobalSettingsFile } from '@/lib/parsers/night-grouper';
import { computeCustomVAutoMetrics, type BreathInfo } from '@/lib/analyzers/custom-vauto-engine';
import { generateClinicalPatternInsights } from '@/app/api/ai-insights/clinical-generator';
import type { MachineSettings } from '@/lib/types';

describe('airbreak-plus Custom Settings Parser', () => {
  const REAL_CSG_TGT = `
#LBH 50
#LBL 20
#LLH 64
#LLL 3C
#RPF 0001
#RCF BFE
#RXF 0000
#RDF 0000
#RPW 0000
#RCW 06
#RXW 0000
#RDW 0001
#RPH 0001
#RCH 06
#RXH 0001
#RDH 0046
#RPO 0001
#RCM 0C8
#RXM 0001
#RDM 0000
`;

  it('parses real CSG.tgt register dump including EPS (RDH) and Exh. Shape (RDW)', () => {
    const res = parseCustomSettings(REAL_CSG_TGT);
    expect(res).not.toBeNull();
    expect(res?.enabled).toBe(true);
    expect(res?.asvMax).toBe(4.0); // 0xC8 = 200 / 50.0 = 4.0
    expect(res?.asvSens).toBe('Low');
    expect(res?.asvSensMultiplier).toBe(0.75);
    expect(res?.eps).toBe(1.4); // 0x46 = 70 / 50.0 = 1.4 cmH2O
    expect(res?.exhaleShape).toBe(1);
    expect(res?.exhaleShapeExponent).toBe(-0.5); // -0.75 + 0.25 * 1
    expect(res?.customTriggerCycle).toBe(true);
    expect(res?.squareWave).toBe(true);
    expect(res?.asvBackupRate).toBe(false);
    expect(res?.fallTime).toBe(6);
    expect(res?.monitoring).toBe(true);
    expect(res?.headerClock).toBe(false);
    expect(res?.ibr).toBe(false);
  });

  it('parses EPS = 0 as Off and clamps Exh. Shape to 0..7', () => {
    const offEps = parseCustomSettings('#RPO 0001\n#RDH 0000\n#RDW 0007');
    expect(offEps?.eps).toBe(0);
    expect(offEps?.exhaleShape).toBe(7);
    expect(offEps?.exhaleShapeExponent).toBe(1.0); // -0.75 + 0.25 * 7

    const clamped = parseCustomSettings('#RPO 0001\n#RDH 00C8\n#RDW 000F');
    expect(clamped?.eps).toBe(3.0); // max 3.0 cmH2O
    expect(clamped?.exhaleShape).toBe(7); // max level 7
  });

  it('returns null for empty or non-custom text', () => {
    expect(parseCustomSettings('')).toBeNull();
    expect(parseCustomSettings('Just some random text')).toBeNull();
    expect(parseCustomSettings('#UNKNOWN 1234')).toBeNull();
  });

  it('maps sensitivity levels correctly', () => {
    const testWithSens = (val: string) => parseCustomSettings(`#RPO 0001\n#RXM ${val}\n#RCM 0096`);
    expect(testWithSens('0000')?.asvSens).toBe('Very Low');
    expect(testWithSens('0000')?.asvSensMultiplier).toBe(0.5);

    expect(testWithSens('0001')?.asvSens).toBe('Low');
    expect(testWithSens('0001')?.asvSensMultiplier).toBe(0.75);

    expect(testWithSens('0002')?.asvSens).toBe('Med');
    expect(testWithSens('0002')?.asvSensMultiplier).toBe(1.0);

    expect(testWithSens('0003')?.asvSens).toBe('High');
    expect(testWithSens('0003')?.asvSensMultiplier).toBe(1.25);

    expect(testWithSens('0004')?.asvSens).toBe('Very High');
    expect(testWithSens('0004')?.asvSensMultiplier).toBe(1.5);
  });

  it('formats human-readable summary including EPS and Exh. Shape', () => {
    const parsed = parseCustomSettings(REAL_CSG_TGT)!;
    const summary = formatCustomVAutoSummary(parsed);
    expect(summary).toContain('Custom VAuto: Active');
    expect(summary).toContain('ASV Max: 4.0 cmH2O');
    expect(summary).toContain('ASV Sens: Low (0.75x)');
    expect(summary).toContain('EPS: -1.4 cmH2O');
    expect(summary).toContain('Exh. Shape: 1');
    expect(summary).toContain('Custom T/C: On');
  });

  it('parses VGL.tgt global VAuto pressure bounds accurately', () => {
    const vgl = `
#SPT 096
#STV 0C8
#MNE 1CC
#MXI 2B2
`;
    const parsed = parseVAutoGlobalSettings(vgl);
    expect(parsed).toEqual({
      minEpap: 9.2,
      maxIpap: 13.8,
      pressureSupport: 3.0,
      startPressure: 4.0,
    });
    expect(parseVAutoGlobalSettings('')).toBeNull();
  });
});

describe('findCustomSettingsFile & findVAutoGlobalSettingsFile helpers', () => {
  it('identifies csg.tgt, csg.set, vgl.tgt, and vgl.set case-insensitively', () => {
    const files = [
      { name: 'STR.edf', path: 'STR.edf' },
      { name: 'CSG.tgt', path: 'SETTINGS/CSG.tgt' },
      { name: 'VGL.tgt', path: 'SETTINGS/VGL.tgt' },
    ];
    expect(findCustomSettingsFile(files)).toEqual({ name: 'CSG.tgt', path: 'SETTINGS/CSG.tgt' });
    expect(findVAutoGlobalSettingsFile(files)).toEqual({ name: 'VGL.tgt', path: 'SETTINGS/VGL.tgt' });

    const setFiles = [
      { name: 'csg.set', path: 'SETTINGS/csg.set' },
      { name: 'vgl.set', path: 'SETTINGS/vgl.set' },
    ];
    expect(findCustomSettingsFile(setFiles)).toEqual({ name: 'csg.set', path: 'SETTINGS/csg.set' });
    expect(findVAutoGlobalSettingsFile(setFiles)).toEqual({ name: 'vgl.set', path: 'SETTINGS/vgl.set' });
  });

  it('returns null when no CSG or VGL file is present', () => {
    const files = [{ name: 'STR.edf', path: 'STR.edf' }];
    expect(findCustomSettingsFile(files)).toBeNull();
    expect(findVAutoGlobalSettingsFile(files)).toBeNull();
  });
});

describe('Custom VAuto Analysis Engine', () => {
  const baseSettings: MachineSettings = {
    deviceModel: 'AirCurve 10 VAuto',
    epap: 9.7,
    ipap: 13.4,
    pressureSupport: 3.2,
    papMode: 'VAuto',
    riseTime: null,
    trigger: 'High',
    cycle: 'High',
    easyBreathe: true,
    settingsSource: 'extracted',
    customVAuto: {
      enabled: true,
      asvMax: 4.0,
      asvSens: 'Low',
      asvSensMultiplier: 0.75,
      eps: 1.4,
      exhaleShape: 1,
      exhaleShapeExponent: -0.5,
      customTriggerCycle: true,
      squareWave: true,
      asvBackupRate: false,
    },
  };

  function generateBreaths(count: number, ti = 1.6, tv = 0.4, peakFlow = 30): BreathInfo[] {
    const breaths: BreathInfo[] = [];
    for (let i = 0; i < count; i++) {
      breaths.push({
        inspStart: i * 100,
        expStart: i * 100 + 40,
        inspEnd: i * 100 + 100,
        ti,
        te: 2.4,
        peakFlow,
        tidalVolume: tv,
        peakPressure: 13.0,
        endExpPressure: 9.7,
      });
    }
    return breaths;
  }

  it('returns null when customVAuto is disabled or not present', () => {
    const disabledSettings = {
      ...baseSettings,
      customVAuto: { ...baseSettings.customVAuto!, enabled: false },
    };
    expect(computeCustomVAutoMetrics(generateBreaths(20), disabledSettings, 25)).toBeNull();
  });

  it('returns null when breath count is under 10', () => {
    expect(computeCustomVAutoMetrics(generateBreaths(5), baseSettings, 25)).toBeNull();
  });

  it('computes realistic metrics, EPS relief, and Exhale Shape retention', () => {
    // Generate flow-limited small breaths that will trigger adaptive boost
    const breaths = generateBreaths(30, 1.6, 0.18, 25);
    const metrics = computeCustomVAutoMetrics(breaths, baseSettings, 25);

    expect(metrics).not.toBeNull();
    expect(metrics?.active).toBe(true);
    expect(metrics?.epsConfigured).toBe(1.4);
    expect(metrics?.epsReliefMean).toBeGreaterThan(0.4);
    expect(metrics?.exhaleShape).toBe(1);
    expect(metrics?.exhaleShapeExponent).toBe(-0.5);
    // 0.5 + (-0.5)/6 = 0.4167 -> 41.7%
    expect(metrics?.expiratoryRetentionPct).toBeCloseTo(41.7, 1);
    // Because epap (9.7) + basePs (3.2) = 12.9, and Max IPAP is 13.4, headroom is only 0.5 cmH2O!
    expect(metrics?.maxIpapHeadroomMedian).toBeLessThanOrEqual(0.5);
  });

  it('respects EPS = 0 (Off) and Exh. Shape levels 0, 3, and 7', () => {
    const breaths = generateBreaths(20, 1.6, 0.4, 25);

    const zeroEpsMetrics = computeCustomVAutoMetrics(
      breaths,
      {
        ...baseSettings,
        customVAuto: { ...baseSettings.customVAuto!, eps: 0, exhaleShape: 3 },
      },
      25
    );
    expect(zeroEpsMetrics?.epsConfigured).toBe(0);
    expect(zeroEpsMetrics?.epsReliefMean).toBe(0);
    expect(zeroEpsMetrics?.exhaleShape).toBe(3);
    expect(zeroEpsMetrics?.exhaleShapeExponent).toBe(0);
    expect(zeroEpsMetrics?.expiratoryRetentionPct).toBe(50);

    const highRetentionMetrics = computeCustomVAutoMetrics(
      breaths,
      {
        ...baseSettings,
        customVAuto: { ...baseSettings.customVAuto!, eps: 0.8, exhaleShape: 7 },
      },
      25
    );
    expect(highRetentionMetrics?.exhaleShape).toBe(7);
    expect(highRetentionMetrics?.exhaleShapeExponent).toBe(1.0);
    expect(highRetentionMetrics?.expiratoryRetentionPct).toBeCloseTo(66.7, 1);
  });

  it('tracks short Ti under 0.7s failing EPS relief', () => {
    // All breaths with Ti = 0.5s (< 0.7s)
    const shortBreaths = generateBreaths(20, 0.5, 0.35, 25);
    const metrics = computeCustomVAutoMetrics(shortBreaths, baseSettings, 25);

    expect(metrics?.shortTiUnder07sPct).toBe(100);
    expect(metrics?.epsReliefMean).toBe(0); // Failed the 0.7s eligibility gate!
  });

  it('generates Custom VAuto EPS and Exh. Shape clinical pattern insights', () => {
    const insights = generateClinicalPatternInsights({
      nights: [
        {
          dateStr: '2026-11-15',
          durationHours: 5.68,
          settings: {
            deviceModel: 'AirCurve',
            epap: 8.4,
            ipap: 13.4,
            pressureSupport: 3.0,
            papMode: 'Custom VAuto',
            customVAuto: {
              enabled: true,
              asvMax: 2.0,
              asvSens: 'Low',
              asvSensMultiplier: 0.75,
              eps: 1.4,
              exhaleShape: 1,
              exhaleShapeExponent: -0.5,
              customTriggerCycle: true,
              squareWave: false,
              asvBackupRate: false,
            },
          },
          glasgow: { overall: 1.83, flatTop: 0.2 },
          wat: { flScore: 63.5, periodicityIndex: 39.1 },
          ned: { nedMean: 8.7, mShapePct: 3.0, reraIndex: 3.2 },
          settingsMetrics: {
            customVAutoMetrics: {
              active: true,
              asvBoostMean: 0.34,
              asvBoostMax: 2.0,
              boostedBreathPct: 50.9,
              maxIpapClippedPct: 2.4,
              epsReliefMean: 1.27,
              epsReliefMax: 1.4,
              effectivePsMedian: 3.1,
              effectivePsP95: 4.5,
              shortTiUnder07sPct: 2.9,
              preTriggerAssistPct: 95.8,
              maxIpapHeadroomMedian: 1.9,
              epsConfigured: 1.4,
              exhaleShape: 1,
              exhaleShapeExponent: -0.5,
              expiratoryRetentionPct: 41.7,
            },
          },
        },
      ],
      selectedNightIndex: 0,
    });

    const epsInsight = insights.find((i) => i.title.includes('Expiratory Relief'));
    expect(epsInsight).toBeDefined();
    expect(epsInsight?.body).toContain('7.0 cmH2O');
    expect(epsInsight?.body).toContain('Exh. Shape 1');

    const contextInsight = insights.find((i) => i.title.includes('Custom VAuto Firmware Parameters'));
    expect(contextInsight).toBeDefined();
    expect(contextInsight?.body).toContain('EPS -1.4 cmH2O');
  });
});
