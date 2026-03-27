import { describe, it, expect } from 'vitest';
import { SAMPLE_NIGHTS, SAMPLE_THERAPY_CHANGE_DATE } from '@/lib/sample-data';

describe('SAMPLE_NIGHTS data integrity', () => {
  it('contains exactly 7 nights', () => {
    expect(SAMPLE_NIGHTS).toHaveLength(7);
  });

  it('dates are in descending order (newest first)', () => {
    for (let i = 0; i < SAMPLE_NIGHTS.length - 1; i++) {
      const current = SAMPLE_NIGHTS[i]!;
      const next = SAMPLE_NIGHTS[i + 1]!;
      expect(current.dateStr > next.dateStr).toBe(true);
    }
  });

  it('all nights have required core fields', () => {
    for (const night of SAMPLE_NIGHTS) {
      expect(night.date).toBeInstanceOf(Date);
      expect(night.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(night.durationHours).toBeGreaterThan(0);
      expect(night.sessionCount).toBeGreaterThanOrEqual(1);
      expect(night.settings).toBeDefined();
      expect(night.settings.deviceModel).toBeTruthy();
      expect(night.settings.settingsSource).toBe('extracted');
      expect(night.glasgow).toBeDefined();
      expect(night.glasgow.overall).toBeGreaterThanOrEqual(0);
      expect(night.wat).toBeDefined();
      expect(night.wat.flScore).toBeGreaterThanOrEqual(0);
      expect(night.ned).toBeDefined();
      expect(night.ned.breathCount).toBeGreaterThan(0);
    }
  });

  it('all nights have machineSummary populated', () => {
    for (const night of SAMPLE_NIGHTS) {
      expect(night.machineSummary).not.toBeNull();
      expect(night.machineSummary!.ahi).not.toBeNull();
      expect(night.machineSummary!.ahi).toBeGreaterThanOrEqual(0);
      expect(night.machineSummary!.durationMin).not.toBeNull();
      expect(night.machineSummary!.durationMin!).toBeGreaterThan(0);
    }
  });

  it('has oximetry on exactly 5 of 7 nights', () => {
    const withOximetry = SAMPLE_NIGHTS.filter((n) => n.oximetry !== null);
    expect(withOximetry).toHaveLength(5);
  });

  it('oximetry is present on expected nights', () => {
    // Nights 1-3 (newest, post-change), night 5, and night 6 (old settings) have oximetry
    // Nights 4 and 7 do not
    expect(SAMPLE_NIGHTS[0]!.oximetry).not.toBeNull(); // Jan 17
    expect(SAMPLE_NIGHTS[1]!.oximetry).not.toBeNull(); // Jan 16
    expect(SAMPLE_NIGHTS[2]!.oximetry).not.toBeNull(); // Jan 15
    expect(SAMPLE_NIGHTS[3]!.oximetry).toBeNull();      // Jan 14
    expect(SAMPLE_NIGHTS[4]!.oximetry).not.toBeNull(); // Jan 13
    expect(SAMPLE_NIGHTS[5]!.oximetry).not.toBeNull(); // Jan 12
    expect(SAMPLE_NIGHTS[6]!.oximetry).toBeNull();      // Jan 11
  });

  it('night 1 has settingsMetrics and crossDevice populated', () => {
    const night1 = SAMPLE_NIGHTS[0]!;
    expect(night1.settingsMetrics).not.toBeNull();
    expect(night1.settingsMetrics!.breathCount).toBeGreaterThan(0);
    expect(night1.crossDevice).not.toBeNull();
    expect(night1.crossDevice!.couplingPct).toBeGreaterThan(0);
  });

  it('therapy change date falls within the sample date range', () => {
    const dateStrs = SAMPLE_NIGHTS.map((n) => n.dateStr);
    const oldest = dateStrs[dateStrs.length - 1]!;
    const newest = dateStrs[0]!;
    expect(SAMPLE_THERAPY_CHANGE_DATE >= oldest).toBe(true);
    expect(SAMPLE_THERAPY_CHANGE_DATE <= newest).toBe(true);
  });

  it('settings differ before and after therapy change', () => {
    // Nights after the change (newer dates) use baseSettings (EPAP 10)
    // Nights on or before the change use oldSettings (EPAP 8)
    const postChange = SAMPLE_NIGHTS.filter((n) => n.dateStr >= SAMPLE_THERAPY_CHANGE_DATE);
    const preChange = SAMPLE_NIGHTS.filter((n) => n.dateStr < SAMPLE_THERAPY_CHANGE_DATE);

    for (const night of postChange) {
      expect(night.settings.epap).toBe(10);
      expect(night.settings.ipap).toBe(16);
    }
    for (const night of preChange) {
      expect(night.settings.epap).toBe(8);
      expect(night.settings.ipap).toBe(14);
    }
  });

  it('machineSummary AHI values are clinically plausible (0-30 range)', () => {
    for (const night of SAMPLE_NIGHTS) {
      const ahi = night.machineSummary!.ahi!;
      expect(ahi).toBeGreaterThanOrEqual(0);
      expect(ahi).toBeLessThanOrEqual(30);
    }
  });

  it('glasgow overall scores are within valid range (0-9)', () => {
    for (const night of SAMPLE_NIGHTS) {
      expect(night.glasgow.overall).toBeGreaterThanOrEqual(0);
      expect(night.glasgow.overall).toBeLessThanOrEqual(9);
    }
  });

  it('glasgow component scores are within valid range (0-1)', () => {
    const componentKeys = [
      'skew', 'spike', 'flatTop', 'topHeavy', 'multiPeak',
      'noPause', 'inspirRate', 'multiBreath', 'variableAmp',
    ] as const;
    for (const night of SAMPLE_NIGHTS) {
      for (const key of componentKeys) {
        expect(night.glasgow[key]).toBeGreaterThanOrEqual(0);
        expect(night.glasgow[key]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('date strings match Date objects', () => {
    for (const night of SAMPLE_NIGHTS) {
      const y = night.date.getFullYear();
      const m = String(night.date.getMonth() + 1).padStart(2, '0');
      const d = String(night.date.getDate()).padStart(2, '0');
      expect(night.dateStr).toBe(`${y}-${m}-${d}`);
    }
  });
});
