import { describe, it, expect } from 'vitest';
import { bucketPressure, buildContributionPayload } from '@/lib/contribute-symptoms';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';

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
});
