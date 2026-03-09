import { describe, it, expect } from 'vitest';
import { exportForumSingleNight, exportForumMultiNight } from '@/lib/forum-export';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';
import type { Tier } from '@/lib/auth/auth-context';

describe('exportForumSingleNight', () => {
  const night = SAMPLE_NIGHTS[0]; // night1 with oximetry

  it('produces non-empty output', () => {
    const output = exportForumSingleNight(night);
    expect(output.length).toBeGreaterThan(0);
  });

  it('includes date in header', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain(night.dateStr);
  });

  it('includes machine info', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain(night.settings.deviceModel);
    expect(output).toContain(night.settings.papMode);
  });

  it('includes pressure settings', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain(`EPAP ${night.settings.epap}`);
    expect(output).toContain(`IPAP ${night.settings.ipap}`);
  });

  it('includes Glasgow section', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('Glasgow Index');
    expect(output).toContain(night.glasgow.overall.toFixed(1));
  });

  it('includes WAT section', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('Ventilation Analysis');
    expect(output).toContain('FL Score');
    expect(output).toContain('Regularity');
    expect(output).toContain('Periodicity');
  });

  it('includes NED section', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('Breath Analysis');
    expect(output).toContain('NED Mean');
    expect(output).toContain('RERA Index');
  });

  it('includes oximetry when present', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('Oximetry');
    expect(output).toContain('ODI-3');
    expect(output).toContain('SpO₂ Mean');
  });

  it('omits oximetry when not present', () => {
    const nightNoOx = SAMPLE_NIGHTS[2]; // night3 has no oximetry
    const output = exportForumSingleNight(nightNoOx);
    expect(output).not.toContain('**Oximetry**');
    expect(output).not.toContain('ODI-3');
  });

  it('includes AirwayLab attribution', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('AirwayLab');
    expect(output).toContain('airwaylab.app');
  });

  it('includes traffic light emojis', () => {
    const output = exportForumSingleNight(night);
    // Should contain at least one of ✅, ⚠️, or 🔴
    expect(output).toMatch(/[✅⚠️🔴]/);
  });

  it('includes session count', () => {
    const output = exportForumSingleNight(night);
    expect(output).toContain('1 session');
  });

  it('pluralizes sessions correctly', () => {
    const nightMultiSession = SAMPLE_NIGHTS[2]; // 2 sessions
    const output = exportForumSingleNight(nightMultiSession);
    expect(output).toContain('2 sessions');
  });
});

describe('exportForumMultiNight', () => {
  it('produces non-empty output', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output.length).toBeGreaterThan(0);
  });

  it('includes night count in header', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output).toContain(`${SAMPLE_NIGHTS.length} Nights`);
  });

  it('sorts nights chronologically', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    // Oldest date (2025-01-11) should appear before newest (2025-01-15)
    const pos11 = output.indexOf('2025-01-11');
    const pos15 = output.indexOf('2025-01-15');
    expect(pos11).toBeLessThan(pos15);
  });

  it('includes table headers', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output).toContain('Date');
    expect(output).toContain('Duration');
    expect(output).toContain('Glasgow');
    expect(output).toContain('FL Score');
  });

  it('includes average row', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output).toContain('**Average**');
  });

  it('includes oximetry table for nights with oximetry', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    // nights 1, 2, and 5 have oximetry
    expect(output).toContain('**Oximetry**');
    expect(output).toContain('ODI-3');
  });

  it('does not include oximetry table when no nights have it', () => {
    const nightsNoOx = SAMPLE_NIGHTS.filter((n) => !n.oximetry);
    const output = exportForumMultiNight(nightsNoOx);
    expect(output).not.toContain('**Oximetry**');
  });

  it('includes all nights in table', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    for (const night of SAMPLE_NIGHTS) {
      expect(output).toContain(night.dateStr);
    }
  });

  it('includes date range', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output).toContain('2025-01-11');
    expect(output).toContain('2025-01-15');
  });

  it('includes AirwayLab attribution', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS);
    expect(output).toContain('AirwayLab');
  });
});

describe('tier badges in forum export', () => {
  const night = SAMPLE_NIGHTS[0];

  it('includes champion badge for champion tier', () => {
    const output = exportForumSingleNight(night, 'champion' as Tier);
    expect(output).toContain('\u{1F3C6}'); // 🏆
  });

  it('includes supporter badge for supporter tier', () => {
    const output = exportForumSingleNight(night, 'supporter' as Tier);
    expect(output).toContain('\u{1F49A}'); // 💚
  });

  it('includes no badge for community tier', () => {
    const output = exportForumSingleNight(night, 'community' as Tier);
    expect(output).not.toContain('\u{1F3C6}');
    expect(output).not.toContain('\u{1F49A}');
  });

  it('includes no badge when tier is undefined', () => {
    const output = exportForumSingleNight(night);
    expect(output).not.toContain('\u{1F3C6}');
    expect(output).not.toContain('\u{1F49A}');
  });

  it('multi-night export includes champion badge', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS, 'champion' as Tier);
    expect(output).toContain('\u{1F3C6}');
  });

  it('multi-night export includes supporter badge', () => {
    const output = exportForumMultiNight(SAMPLE_NIGHTS, 'supporter' as Tier);
    expect(output).toContain('\u{1F49A}');
  });
});
