import { describe, it, expect } from 'vitest';
import { bucketPressure, buildContributionPayload } from '@/lib/contribute-symptoms';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';
import type { NightResult, SettingsMetrics } from '@/lib/types';

describe('bucketPressure', () => {
  it('returns <6 for pressure below 6', () => {
    expect(bucketPressure(4)).toBe('<6');
    expect(bucketPressure(5.9)).toBe('<6');
  });

  it('returns correct bucket for each range', () => {
    expect(bucketPressure(6)).toBe('6-8');
    expect(bucketPressure(7.9)).toBe('6-8');
    expect(bucketPressure(8)).toBe('8-10');
    expect(bucketPressure(10)).toBe('10-12');
    expect(bucketPressure(12)).toBe('12-14');
    expect(bucketPressure(14)).toBe('14+');
    expect(bucketPressure(20)).toBe('14+');
  });
});

describe('buildContributionPayload', () => {
  it('builds a valid payload from a night result', () => {
    const night = SAMPLE_NIGHTS[0];
    const payload = buildContributionPayload(night, 4);

    expect(payload.symptom_rating).toBe(4);
    expect(payload.ifl_risk).toBeGreaterThanOrEqual(0);
    expect(payload.ifl_risk).toBeLessThanOrEqual(100);
    expect(payload.glasgow_overall).toBe(Math.round(night.glasgow.overall * 100) / 100);
    expect(payload.pap_mode).toBe(night.settings.papMode);
    expect(payload.device_model).toBe(night.settings.deviceModel);
    expect(payload.pressure_bucket).toBe('10-12'); // EPAP = 10
  });

  it('rounds values appropriately', () => {
    const night = SAMPLE_NIGHTS[0];
    const payload = buildContributionPayload(night, 3);

    // IFL risk should be rounded to 1 decimal
    expect(String(payload.ifl_risk).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1);
    // Glasgow should be rounded to 2 decimals
    expect(String(payload.glasgow_overall).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it('includes enhanced NED fields when available', () => {
    const night = {
      ...SAMPLE_NIGHTS[0],
      ned: {
        ...SAMPLE_NIGHTS[0].ned,
        hypopneaIndex: 2.345,
        amplitudeCvOverall: 31.678,
        unstableEpochPct: 15,
      },
    } as NightResult;

    const payload = buildContributionPayload(night, 3);

    expect(payload.hypopnea_index).toBe(2.3); // rounded to 1 decimal
    expect(payload.amplitude_cv).toBe(31.7);  // rounded to 1 decimal
    expect(payload.unstable_epoch_pct).toBe(15);
  });

  it('includes settings metrics fields when settingsMetrics available', () => {
    const settingsMetrics: SettingsMetrics = {
      breathCount: 480,
      epapDetected: 10, ipapDetected: 14, psDetected: 4,
      triggerDelayMedianMs: 85.4, triggerDelayP10Ms: 50, triggerDelayP90Ms: 150,
      autoTriggerPct: 2.5, tiMedianMs: 1200, tiP25Ms: 1000, tiP75Ms: 1400,
      teMedianMs: 2800, ieRatio: 0.4321, timeAtIpapMedianMs: 900,
      timeAtIpapP25Ms: 750, ipapDwellMedianPct: 75, ipapDwellP10Pct: 60,
      prematureCyclePct: 3.2, lateCyclePct: 1.8, endExpPressureMean: 10.1,
      endExpPressureSd: 0.3, tidalVolumeMedianMl: 450, tidalVolumeP25Ml: 380,
      tidalVolumeP75Ml: 520, tidalVolumeCv: 18.567, minuteVentProxy: 7.2,
    };
    const night = { ...SAMPLE_NIGHTS[0], settingsMetrics } as NightResult;

    const payload = buildContributionPayload(night, 4);

    expect(payload.tidal_volume_cv).toBe(18.6); // rounded
    expect(payload.trigger_delay_median_ms).toBe(85); // rounded to int
    expect(payload.ie_ratio).toBe(0.43); // rounded to 2 decimals
  });

  it('omits enhanced fields when not available', () => {
    const night = SAMPLE_NIGHTS[0];
    const payload = buildContributionPayload(night, 3);

    expect(payload.hypopnea_index).toBeUndefined();
    expect(payload.amplitude_cv).toBeUndefined();
    expect(payload.tidal_volume_cv).toBeUndefined();
  });
});
