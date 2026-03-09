import { describe, it, expect } from 'vitest';
import { parseIdentification, getSettingsForDate } from '@/lib/parsers/settings-extractor';
import type { MachineSettings } from '@/lib/types';

describe('parseIdentification', () => {
  it('parses top-level ModelNumber JSON', () => {
    const json = JSON.stringify({ ModelNumber: 'AirSense 11 AutoSet' });
    expect(parseIdentification(json)).toBe('AirSense 11 AutoSet');
  });

  it('parses top-level ProductName JSON', () => {
    const json = JSON.stringify({ ProductName: 'AirCurve 10 VAuto' });
    expect(parseIdentification(json)).toBe('AirCurve 10 VAuto');
  });

  it('prefers ModelNumber over ProductName', () => {
    const json = JSON.stringify({
      ModelNumber: 'AirSense 11',
      ProductName: 'AirSense 11 Elite',
    });
    expect(parseIdentification(json)).toBe('AirSense 11');
  });

  it('handles iVAPS nested IdentificationProfiles (array)', () => {
    const json = JSON.stringify({
      IdentificationProfiles: [
        { ModelNumber: 'AirCurve 10 ST-A iVAPS', ProductName: 'iVAPS Device' },
      ],
    });
    expect(parseIdentification(json)).toBe('AirCurve 10 ST-A iVAPS');
  });

  it('handles iVAPS nested IdentificationProfiles (object)', () => {
    const json = JSON.stringify({
      IdentificationProfiles: {
        ModelNumber: 'AirCurve 10 ASV',
      },
    });
    expect(parseIdentification(json)).toBe('AirCurve 10 ASV');
  });

  it('handles empty IdentificationProfiles array', () => {
    const json = JSON.stringify({
      IdentificationProfiles: [],
    });
    expect(parseIdentification(json)).toBe('Unknown');
  });

  it('handles IdentificationProfiles with ProductName only', () => {
    const json = JSON.stringify({
      IdentificationProfiles: [
        { ProductName: 'iVAPS ST-A' },
      ],
    });
    expect(parseIdentification(json)).toBe('iVAPS ST-A');
  });

  it('parses key=value format', () => {
    const text = 'Version=1.0\nModelNumber=AirSense 10\nSerial=12345';
    expect(parseIdentification(text)).toBe('AirSense 10');
  });

  it('parses key:value format', () => {
    const text = 'Version: 1.0\nProductName: AirCurve 11\nSerial: 12345';
    expect(parseIdentification(text)).toBe('AirCurve 11');
  });

  it('detects AirCurve from unstructured text', () => {
    const text = 'This device is an AirCurve model.';
    expect(parseIdentification(text)).toBe('AirCurve');
  });

  it('detects AirSense from unstructured text', () => {
    const text = 'Device type: AirSense series';
    expect(parseIdentification(text)).toBe('AirSense');
  });

  it('returns Unknown for unrecognizable input', () => {
    expect(parseIdentification('random gibberish text')).toBe('Unknown');
  });

  it('returns Unknown for empty string', () => {
    expect(parseIdentification('')).toBe('Unknown');
  });

  it('handles invalid JSON gracefully', () => {
    expect(parseIdentification('{invalid json')).toBe('Unknown');
  });
});

describe('getSettingsForDate', () => {
  const makeSettings = (model: string): MachineSettings => ({
    deviceModel: model,
    epap: 8,
    ipap: 12,
    pressureSupport: 4,
    papMode: 'APAP',
    riseTime: null,
    trigger: 'medium',
    cycle: 'medium',
    easyBreathe: true,
  });

  const dailySettings: Record<string, MachineSettings> = {
    '2026-01-10': makeSettings('Jan10'),
    '2026-01-12': makeSettings('Jan12'),
    '2026-01-15': makeSettings('Jan15'),
  };

  it('returns exact match when available', () => {
    const result = getSettingsForDate(dailySettings, '2026-01-12');
    expect(result?.deviceModel).toBe('Jan12');
  });

  it('falls back to nearest earlier date', () => {
    const result = getSettingsForDate(dailySettings, '2026-01-13');
    expect(result?.deviceModel).toBe('Jan12');
  });

  it('falls back to first date for dates before all entries', () => {
    const result = getSettingsForDate(dailySettings, '2026-01-05');
    expect(result?.deviceModel).toBe('Jan10');
  });

  it('uses latest settings for dates after all entries', () => {
    const result = getSettingsForDate(dailySettings, '2026-01-20');
    expect(result?.deviceModel).toBe('Jan15');
  });

  it('returns null for empty settings map', () => {
    const result = getSettingsForDate({}, '2026-01-15');
    expect(result).toBeNull();
  });
});
