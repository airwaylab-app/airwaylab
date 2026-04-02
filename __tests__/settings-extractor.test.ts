import { describe, it, expect } from 'vitest';
import { parseIdentification, getSettingsForDate, sensitivityLabel } from '@/lib/parsers/settings-extractor';
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
    settingsSource: 'extracted',
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

describe('parseIdentification — AirCurve 11 nested JSON', () => {
  it('parses FlowGenerator.IdentificationProfiles.Product.ProductName', () => {
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            ProductName: 'AirCurve11VAuto',
            SerialNumber: '12345',
          },
        },
      },
    });
    expect(parseIdentification(json)).toBe('AirCurve11VAuto');
  });

  it('prefers FlowGenerator.Product.ProductName over ModelNumber', () => {
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            ModelNumber: 'AC11-VAuto-Rev2',
            ProductName: 'AirCurve11VAuto',
          },
        },
      },
    });
    // ProductName is checked first in the FlowGenerator path (matching AirCurve 11 real data)
    expect(parseIdentification(json)).toBe('AirCurve11VAuto');
  });

  it('parses real AirCurve 11 Identification.json structure', () => {
    // Based on actual John Lally SD card data
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            UniversalIdentifier: '555055d5-9b5a-41ba-b56f-e304d608fbaa',
            SerialNumber: '23244217860',
            ProductCode: '39494',
            ProductName: 'AirCurve11VAuto',
            FdaUniqueDeviceIdentifier: '',
            ProductGeographicIdentifier: 'USA',
          },
          Hardware: { HardwareIdentifier: '(90)R390-7689' },
          Software: { ApplicationIdentifier: 'SW04600.16.8.5.0' },
        },
      },
    });
    expect(parseIdentification(json)).toBe('AirCurve11VAuto');
  });

  it('falls back to top-level fields when FlowGenerator has no Product', () => {
    const json = JSON.stringify({
      FlowGenerator: { IdentificationProfiles: {} },
      ProductName: 'AirSense 11 AutoSet',
    });
    expect(parseIdentification(json)).toBe('AirSense 11 AutoSet');
  });
});

describe('sensitivityLabel — AirCurve 11 scale', () => {
  it('maps old scale (0-4) correctly by default', () => {
    expect(sensitivityLabel(0)).toBe('very low');
    expect(sensitivityLabel(1)).toBe('low');
    expect(sensitivityLabel(2)).toBe('medium');
    expect(sensitivityLabel(3)).toBe('high');
    expect(sensitivityLabel(4)).toBe('very high');
  });

  it('maps AirCurve 11 scale (1-5) when isAirCurve11 is true', () => {
    expect(sensitivityLabel(1, true)).toBe('very low');
    expect(sensitivityLabel(2, true)).toBe('low');
    expect(sensitivityLabel(3, true)).toBe('medium');
    expect(sensitivityLabel(4, true)).toBe('high');
    expect(sensitivityLabel(5, true)).toBe('very high');
  });

  it('old scale value 3 = "high" but AC11 scale value 3 = "medium"', () => {
    expect(sensitivityLabel(3, false)).toBe('high');
    expect(sensitivityLabel(3, true)).toBe('medium');
  });

  it('returns N/A for undefined', () => {
    expect(sensitivityLabel(undefined)).toBe('N/A');
    expect(sensitivityLabel(undefined, true)).toBe('N/A');
  });

  it('returns raw number for unmapped values', () => {
    expect(sensitivityLabel(7)).toBe('7');
    expect(sensitivityLabel(0, true)).toBe('0');
  });
});
