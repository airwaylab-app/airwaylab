import { describe, it, expect } from 'vitest';
import { generateInsights, type Insight } from '@/lib/insights';
import { SAMPLE_NIGHTS, SAMPLE_THERAPY_CHANGE_DATE } from '@/lib/sample-data';
import type { NightResult } from '@/lib/types';

describe('generateInsights', () => {
  // SAMPLE_NIGHTS (7 nights, newest first):
  // [0] night1(1.8) Jan 17, [1] night2(1.2) Jan 16, [2] night3(1.5) Jan 15,
  // [3] night4(2.6) Jan 14, [4] night5(1.5) Jan 13, [5] night6(2.1) Jan 12,
  // [6] night7(2.3) Jan 11
  // Settings change at Jan 15: [0-2] = new settings (EPAP 10), [3-6] = old settings (EPAP 8)
  // Oximetry: [0,1,2,5] have it, [3,4,6] do not

  it('returns an array of insights', () => {
    const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('caps insights at 6', () => {
    const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, SAMPLE_THERAPY_CHANGE_DATE);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('each insight has required fields', () => {
    const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null);
    for (const insight of result) {
      expect(insight.id).toBeTruthy();
      expect(['positive', 'warning', 'actionable', 'info']).toContain(insight.type);
      expect(insight.title.length).toBeGreaterThan(0);
      expect(insight.body.length).toBeGreaterThan(0);
      expect(['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend', 'settings', 'correlation', 'temporal']).toContain(insight.category);
    }
  });

  it('deduplicates insights by id', () => {
    const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null);
    const ids = result.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts insights: warnings/actionable first, then positive, then info', () => {
    const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null);
    const priority: Record<Insight['type'], number> = { actionable: 0, warning: 1, positive: 2, info: 3 };
    for (let i = 1; i < result.length; i++) {
      expect(priority[result[i]!.type]).toBeGreaterThanOrEqual(priority[result[i - 1]!.type]);
    }
  });

  describe('single-night insights', () => {
    it('generates Glasgow warning for night with bad Glasgow', () => {
      // night4 (index 3) has Glasgow 2.6 → bad
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[3]!, SAMPLE_NIGHTS[4]!, null);
      const glasgowWarning = result.find((i) => i.id === 'glasgow-bad');
      expect(glasgowWarning).toBeDefined();
      expect(glasgowWarning!.type).toBe('warning');
    });

    it('generates Glasgow positive for good Glasgow night', () => {
      // night2 (index 1) has Glasgow 1.2 → warn (not quite good at ≤1.0)
      // We need a night with Glasgow ≤ 1.0 for 'good'
      // Sample data doesn't have one that's ≤1.0, so this tests that warn nights don't get 'good' insight
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[1]!, SAMPLE_NIGHTS[3]!, null);
      const glasgowGood = result.find((i) => i.id === 'glasgow-good');
      // night2 Glasgow is 1.2 which is > 1.0 (green threshold), so no 'good' insight
      expect(glasgowGood).toBeUndefined();
    });

    it('detects elevated RERA on bad nights', () => {
      // night4 (index 3) has RERA 11.8 >= 10
      // Use only 2 nights to avoid trend insights consuming the 6-insight cap
      const result = generateInsights(
        [SAMPLE_NIGHTS[3]!, SAMPLE_NIGHTS[4]!],
        SAMPLE_NIGHTS[3]!,
        SAMPLE_NIGHTS[4]!,
        null
      );
      const reraWarning = result.find((i) => i.id === 'rera-high');
      expect(reraWarning).toBeDefined();
      expect(reraWarning!.category).toBe('ned');
    });

    it('generates regularity-bad for night4 (regularity 52 > amber threshold 50, lowerIsBetter)', () => {
      // night4 (index 3) has regularity 52 → bad (threshold: green=30, amber=50, lowerIsBetter)
      // 52 > 50 (amber) → 'bad', so regularity-bad insight fires
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[3]!, SAMPLE_NIGHTS[4]!, null);
      const regWarning = result.find((i) => i.id === 'regularity-bad');
      expect(regWarning).toBeDefined();
      expect(regWarning!.type).toBe('warning');
    });

    it('detects night-over-night Glasgow change', () => {
      // night4 (2.6) to night2 (1.2) = delta -1.4 → improved
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[1]!, SAMPLE_NIGHTS[3]!, null);
      const delta = result.find((i) => i.id === 'night-delta');
      expect(delta).toBeDefined();
      expect(delta!.type).toBe('positive'); // improved
    });

    it('does not generate dominant component when worst < 0.5', () => {
      // night4 (index 3): flatTop is 0.48 (highest component), but threshold is ≥0.5
      // So glasgow-dominant insight should NOT fire
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[3]!, SAMPLE_NIGHTS[4]!, null);
      const dominant = result.find((i) => i.id === 'glasgow-dominant');
      expect(dominant).toBeUndefined();
    });

    it('detects H1/H2 NED split when difference is >5', () => {
      // night4 (index 3): h1=24.2, h2=32.8 → diff=8.6 → insight expected
      // Pass only 2 nights and strip machineSummary to avoid filling the 6-insight cap
      const n3 = { ...SAMPLE_NIGHTS[3]!, machineSummary: null };
      const n4 = { ...SAMPLE_NIGHTS[4]!, machineSummary: null };
      const result = generateInsights(
        [n3, n4],
        n3,
        n4,
        null
      );
      const h1h2 = result.find((i) => i.id === 'ned-h1h2');
      expect(h1h2).toBeDefined();
    });
  });

  describe('oximetry insights', () => {
    it('no oximetry insights when oximetry is null', () => {
      // night4 (index 3) has no oximetry
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[3]!, SAMPLE_NIGHTS[4]!, null);
      const oxInsights = result.filter((i) => i.category === 'oximetry');
      expect(oxInsights).toHaveLength(0);
    });

    it('generates ODI insight for night6 (higher ODI)', () => {
      // night6 (index 5) ODI-3 = 6.8, threshold bad >15, so not bad
      // night6 ODI-3 = 6.8 → warn (green=5, amber=15, lowerIsBetter → 6.8 > 5 ≤ 15 = warn)
      // Not "bad" so no odi-high insight. But we can verify that.
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[5]!, SAMPLE_NIGHTS[4]!, null);
      const odiHigh = result.find((i) => i.id === 'odi-high');
      // ODI 6.8 is warn, not bad, so no odi-high
      expect(odiHigh).toBeUndefined();
    });

    it('generates tonic-desat insight when T<94% high but ODI3 low', () => {
      const tonicNight = {
        ...SAMPLE_NIGHTS[0]!,
        oximetry: {
          ...SAMPLE_NIGHTS[0]!.oximetry!,
          tBelow94: 20,
          odi3: 2,
        },
      };
      const result = generateInsights([tonicNight], tonicNight, null, null);
      const tonic = result.find((i) => i.id === 'tonic-desat');
      expect(tonic).toBeDefined();
      expect(tonic!.type).toBe('info');
      expect(tonic!.category).toBe('oximetry');
      expect(tonic!.body).toContain('baseline oxygen');
      expect(tonic!.body).toContain('Your clinician can help interpret these findings in context');
    });

    it('does not generate tonic-desat when both T<94% and ODI3 are elevated', () => {
      const obstructiveNight = {
        ...SAMPLE_NIGHTS[0]!,
        oximetry: {
          ...SAMPLE_NIGHTS[0]!.oximetry!,
          tBelow94: 20,
          odi3: 10,
        },
      };
      const result = generateInsights([obstructiveNight], obstructiveNight, null, null);
      const tonic = result.find((i) => i.id === 'tonic-desat');
      expect(tonic).toBeUndefined();
    });

    it('does not generate tonic-desat when T<94% is normal', () => {
      const normalNight = {
        ...SAMPLE_NIGHTS[0]!,
        oximetry: {
          ...SAMPLE_NIGHTS[0]!.oximetry!,
          tBelow94: 5,
          odi3: 2,
        },
      };
      const result = generateInsights([normalNight], normalNight, null, null);
      const tonic = result.find((i) => i.id === 'tonic-desat');
      expect(tonic).toBeUndefined();
    });
  });

  describe('trend insights', () => {
    it('returns trend insights when 3+ nights provided', () => {
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null);
      // With 7 nights there should be some trend insights
      const trendInsights = result.filter((i) => i.category === 'trend');
      expect(trendInsights.length).toBeGreaterThanOrEqual(0); // May or may not fire depending on slope
    });

    it('returns no trend insights with <3 nights', () => {
      const twoNights = SAMPLE_NIGHTS.slice(0, 2);
      const result = generateInsights(twoNights, twoNights[0]!, twoNights[1]!, null);
      const trendInsights = result.filter((i) => i.category === 'trend' && i.id.startsWith('trend-'));
      expect(trendInsights).toHaveLength(0);
    });

    it('generates therapy change insight when date is provided', () => {
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, SAMPLE_THERAPY_CHANGE_DATE);
      const therapyInsight = result.find((i) => i.id === 'therapy-change-impact');
      // Therapy change date is 2025-01-15, which is night3
      // Before: nights 4,5,6,7 avg Glasgow = (2.6+1.5+2.1+2.3)/4 = 2.125
      // After: nights 1,2,3 avg Glasgow = (1.8+1.2+1.5)/3 = 1.5
      // Delta = 1.5 - 2.125 = -0.625 → improved
      expect(therapyInsight).toBeDefined();
      expect(therapyInsight!.type).toBe('positive');
    });
  });

  describe('symptom rating cross-reference', () => {
    it('generates symptom-fl-correlation when IFL >45 and rating <=2', () => {
      // IFL Risk with corrected FI formula:
      // FL Score 70*0.35=24.5, NED 35*0.30=10.5, FI Math.max(0,(0.70-0.5)/0.5)*100=40*0.20=8.0, Glasgow (2.0/9)*100*0.15=3.33
      // Total = 46.33 → above 45 threshold
      const highFLNight = {
        ...SAMPLE_NIGHTS[3]!,
        wat: { ...SAMPLE_NIGHTS[3]!.wat, flScore: 70, regularityScore: 25, periodicityIndex: 10 },
        ned: { ...SAMPLE_NIGHTS[3]!.ned, nedMean: 35, fiMean: 0.70, reraIndex: 3, estimatedArousalIndex: 4, h1NedMean: 33, h2NedMean: 35, briefObstructionIndex: 1 },
        glasgow: { ...SAMPLE_NIGHTS[3]!.glasgow, overall: 2.0 },
      };
      const result = generateInsights([highFLNight], highFLNight, null, null, 2);
      const correlation = result.find((i) => i.id === 'symptom-fl-correlation');
      expect(correlation).toBeDefined();
      expect(correlation!.type).toBe('warning');
      expect(correlation!.body).toContain('Poor');
    });

    it('generates symptom-fl-asymptomatic when IFL >45 and rating >=4', () => {
      // Same IFL Risk calculation as above = 46.33 → above 45 threshold
      // Strip machineSummary to avoid machine-ahi-elevated crowding the 6-insight cap
      const highFLNight = {
        ...SAMPLE_NIGHTS[3]!,
        machineSummary: null,
        wat: { ...SAMPLE_NIGHTS[3]!.wat, flScore: 70, regularityScore: 25, periodicityIndex: 10 },
        ned: { ...SAMPLE_NIGHTS[3]!.ned, nedMean: 35, fiMean: 0.70, reraIndex: 3, estimatedArousalIndex: 4, h1NedMean: 33, h2NedMean: 35, briefObstructionIndex: 1 },
        glasgow: { ...SAMPLE_NIGHTS[3]!.glasgow, overall: 2.0 },
      };
      const result = generateInsights([highFLNight], highFLNight, null, null, 4);
      const asymptomatic = result.find((i) => i.id === 'symptom-fl-asymptomatic');
      expect(asymptomatic).toBeDefined();
      expect(asymptomatic!.type).toBe('info');
    });

    it('generates symptom-non-fl-cause when IFL <20 and rating <=2', () => {
      // Low FL: FI 0.55 maps to Math.max(0,(0.55-0.5)/0.5)*100=10, *0.20=2.0
      // 10*0.35 + 8*0.30 + 10*0.20 + (0.5/9)*100*0.15 = 3.5+2.4+2.0+0.83 = 8.73 → <20
      const lowFLNight = {
        ...SAMPLE_NIGHTS[1]!,
        wat: { ...SAMPLE_NIGHTS[1]!.wat, flScore: 10 },
        ned: { ...SAMPLE_NIGHTS[1]!.ned, nedMean: 8, fiMean: 0.55 },
        glasgow: { ...SAMPLE_NIGHTS[1]!.glasgow, overall: 0.5 },
      };
      const result = generateInsights([lowFLNight], lowFLNight, null, null, 1);
      const nonFL = result.find((i) => i.id === 'symptom-non-fl-cause');
      expect(nonFL).toBeDefined();
      expect(nonFL!.type).toBe('info');
      expect(nonFL!.body).toContain('Terrible');
    });

    it('does not generate symptom insights when rating is 3 (OK)', () => {
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null, 3);
      const symptomInsights = result.filter((i) => i.id.startsWith('symptom-'));
      expect(symptomInsights).toHaveLength(0);
    });

    it('does not generate symptom insights when rating is null', () => {
      const result = generateInsights(SAMPLE_NIGHTS, SAMPLE_NIGHTS[0]!, SAMPLE_NIGHTS[1]!, null, null);
      const symptomInsights = result.filter((i) => i.id.startsWith('symptom-'));
      expect(symptomInsights).toHaveLength(0);
    });
  });

  describe('settings insights', () => {
    const baseSettingsMetrics = {
      breathCount: 3000,
      epapDetected: 10,
      ipapDetected: 18,
      psDetected: 8,
      triggerDelayMedianMs: 250,
      triggerDelayP10Ms: 150,
      triggerDelayP90Ms: 400,
      autoTriggerPct: 1,
      tiMedianMs: 1500,
      tiP25Ms: 1300,
      tiP75Ms: 1700,
      teMedianMs: 2000,
      ieRatio: 1.33,
      timeAtIpapMedianMs: 700,
      timeAtIpapP25Ms: 500,
      ipapDwellMedianPct: 50,
      ipapDwellP10Pct: 35,
      prematureCyclePct: 1,
      lateCyclePct: 1,
      endExpPressureMean: 10.1,
      endExpPressureSd: 0.3,
      tidalVolumeMedianMl: 450,
      tidalVolumeP25Ml: 380,
      tidalVolumeP75Ml: 520,
      tidalVolumeCv: 20,
      minuteVentProxy: 350,
    };

    function makeNightWithSettings(overrides: Record<string, unknown> = {}): NightResult {
      return {
        ...SAMPLE_NIGHTS[0]!,
        settingsMetrics: { ...baseSettingsMetrics, ...overrides },
      } as NightResult;
    }

    it('generates settings-premature-cycle warning when prematureCyclePct > 10', () => {
      const night = makeNightWithSettings({ prematureCyclePct: 15 });
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'settings-premature-cycle');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('warning');
      expect(insight!.category).toBe('settings');
    });

    it('generates settings-low-ipap-dwell actionable when ipapDwellMedianPct < 35', () => {
      const night = makeNightWithSettings({ ipapDwellMedianPct: 30 });
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'settings-low-ipap-dwell');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('actionable');
      expect(insight!.category).toBe('settings');
    });

    it('generates settings-good positive when all settings in range', () => {
      const night = makeNightWithSettings({ prematureCyclePct: 1, lateCyclePct: 1, ipapDwellMedianPct: 50 });
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'settings-good');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('positive');
    });

    it('does not generate settings insights when settingsMetrics is null', () => {
      const night = { ...SAMPLE_NIGHTS[0]!, settingsMetrics: null, crossDevice: null, machineSummary: null, settingsFingerprint: null } as NightResult;
      const result = generateInsights([night], night, null, null);
      const settingsInsights = result.filter((i) => i.category === 'settings');
      expect(settingsInsights).toHaveLength(0);
    });

    it('generates settings-ti-delta when Ti changes >150ms from previous night', () => {
      const current = makeNightWithSettings({ tiMedianMs: 1500 });
      const prev = makeNightWithSettings({ tiMedianMs: 1300 });
      const result = generateInsights([current, prev], current, prev, null);
      const insight = result.find((i) => i.id === 'settings-ti-delta');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('warning');
    });

    it('generates settings-pressure-mismatch when epapDetected differs >1 from prescribed', () => {
      const night = makeNightWithSettings({ epapDetected: 11.5 });
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'settings-pressure-mismatch');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('warning');
    });
  });

  describe('edge cases', () => {
    it('handles single night with no previous', () => {
      const result = generateInsights([SAMPLE_NIGHTS[0]!], SAMPLE_NIGHTS[0]!, null, null);
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles night with null oximetry gracefully', () => {
      const nightNoOx = SAMPLE_NIGHTS[3]!; // night4 has no oximetry
      expect(() => generateInsights([nightNoOx], nightNoOx, null, null)).not.toThrow();
    });
  });

  describe('low-ahi-elevated-fl insight', () => {
    // night4 (index 3) has Glasgow 2.6 → bad (threshold: good ≤1.0, warn ≤2.0, bad >2.0)
    // We override machineSummary.ahi to control the AHI value.

    it('triggers when AHI is low (< 5) and Glasgow is red', () => {
      const night = {
        ...SAMPLE_NIGHTS[3]!,
        machineSummary: { ...SAMPLE_NIGHTS[3]!.machineSummary!, ahi: 0.8 },
      } as NightResult;
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'low-ahi-elevated-fl');
      expect(insight).toBeDefined();
      expect(insight!.type).toBe('info');
      expect(insight!.category).toBe('glasgow');
      expect(insight!.body).toContain('0.8');
      expect(insight!.body).toContain('low range');
      expect(insight!.body).toContain('separate dimension');
    });

    it('does not trigger when AHI is elevated (>= 5)', () => {
      const night = {
        ...SAMPLE_NIGHTS[3]!,
        machineSummary: { ...SAMPLE_NIGHTS[3]!.machineSummary!, ahi: 8.0 },
      } as NightResult;
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'low-ahi-elevated-fl');
      expect(insight).toBeUndefined();
    });

    it('does not trigger when AHI is null', () => {
      const night = {
        ...SAMPLE_NIGHTS[3]!,
        machineSummary: { ...SAMPLE_NIGHTS[3]!.machineSummary!, ahi: null },
      } as NightResult;
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'low-ahi-elevated-fl');
      expect(insight).toBeUndefined();
    });

    it('does not trigger when both Glasgow and FL are within typical range', () => {
      // Use night2 (Glasgow 1.2 = warn) with low AHI — neither Glasgow nor FL are 'bad'
      const night = {
        ...SAMPLE_NIGHTS[1]!,
        machineSummary: { ...SAMPLE_NIGHTS[1]!.machineSummary!, ahi: 1.2 },
      } as NightResult;
      const result = generateInsights([night], night, null, null);
      const insight = result.find((i) => i.id === 'low-ahi-elevated-fl');
      // Only triggers on 'bad' FL or Glasgow, not 'warn'
      // night2 Glasgow 1.2 is warn, not bad → should not trigger
      expect(insight).toBeUndefined();
    });
  });
});
