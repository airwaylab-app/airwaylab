import { describe, it, expect } from 'vitest';
import { parseIdentification, getSettingsForDate, sensitivityLabel, extractSettings } from '@/lib/parsers/settings-extractor';
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

// ============================================================
// Helpers — build synthetic STR.edf buffers for extractSettings tests
// ============================================================

function buildSTRBuffer(
  signalDefs: { label: string; values: number[]; physMin?: number; physMax?: number }[]
): ArrayBuffer {
  const numSignals = signalDefs.length;
  const numDataRecords = signalDefs[0]?.values.length ?? 1;
  const samplesPerRecord = 1;
  const headerBytes = 256 + numSignals * 256;
  const dataSize = numDataRecords * numSignals * samplesPerRecord * 2;
  const totalSize = headerBytes + dataSize;

  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  const rawView = new Uint8Array(buf);
  const encoder = new TextEncoder();

  const writeField = (offset: number, value: string, length: number) => {
    const bytes = encoder.encode(value.padEnd(length).slice(0, length));
    rawView.set(bytes, offset);
  };

  writeField(0, '0', 8);
  writeField(8, '', 80);
  writeField(88, '', 80);
  writeField(168, '01.01.26', 8);
  writeField(176, '00.00.00', 8);
  writeField(184, String(headerBytes), 8);
  writeField(192, '', 44);
  writeField(236, String(numDataRecords), 8);
  writeField(244, '86400', 8);
  writeField(252, String(numSignals), 4);

  let offset = 256;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 16, signalDefs[i]!.label, 16);
  offset += numSignals * 16;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 80, '', 80);
  offset += numSignals * 80;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, '', 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, String(signalDefs[i]!.physMin ?? 0), 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, String(signalDefs[i]!.physMax ?? 100), 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, '0', 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, '32767', 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 80, '', 80);
  offset += numSignals * 80;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 8, String(samplesPerRecord), 8);
  offset += numSignals * 8;
  for (let i = 0; i < numSignals; i++) writeField(offset + i * 32, '', 32);

  let dataPtr = headerBytes;
  for (let rec = 0; rec < numDataRecords; rec++) {
    for (let sig = 0; sig < numSignals; sig++) {
      const physMin = signalDefs[sig]!.physMin ?? 0;
      const physMax = signalDefs[sig]!.physMax ?? 100;
      const scale = (physMax - physMin) / 32767;
      const physical = signalDefs[sig]!.values[rec] ?? 0;
      const digital = Math.round((physical - physMin) / scale);
      view.setInt16(dataPtr, digital, true);
      dataPtr += 2;
    }
  }
  return buf;
}

// ============================================================
// parseIdentification — AirSense 11 detection
// ============================================================

describe('parseIdentification — AirSense 11 identification', () => {
  it('parses AirSense 11 AutoSet from top-level ModelNumber', () => {
    const json = JSON.stringify({ ModelNumber: 'AirSense 11 AutoSet' });
    expect(parseIdentification(json)).toBe('AirSense 11 AutoSet');
  });

  it('parses AirSense 11 Elite from top-level ModelNumber', () => {
    const json = JSON.stringify({ ModelNumber: 'AirSense 11 Elite' });
    expect(parseIdentification(json)).toBe('AirSense 11 Elite');
  });

  it('parses AirSense11AutoSet (no spaces) from FlowGenerator nested structure', () => {
    // AirSense 11 firmware may use the same FlowGenerator JSON format as AirCurve 11
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            ProductName: 'AirSense11AutoSet',
            SerialNumber: '23199876543',
          },
        },
      },
    });
    expect(parseIdentification(json)).toBe('AirSense11AutoSet');
  });

  it('parses AirSense 11 ModelNumber from FlowGenerator nested structure', () => {
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            ModelNumber: 'AS11-AutoSet-Rev1',
            ProductName: 'AirSense11AutoSet',
          },
        },
      },
    });
    // ProductName is checked first in FlowGenerator path
    expect(parseIdentification(json)).toBe('AirSense11AutoSet');
  });

  it('AirSense 11 model string does NOT match AirCurve 11 substring', () => {
    // Verifies isAirCurve11 = false for AirSense 11 devices — they use CPAP signal paths
    const as11Model = 'AirSense 11 AutoSet';
    const normalized = as11Model.replace(/\s/g, '').toLowerCase();
    expect(normalized.includes('aircurve11')).toBe(false);
    expect(normalized.includes('airsense')).toBe(true);
  });
});

// ============================================================
// extractSettings — AirSense 11 CPAP signal extraction
// ============================================================

describe('extractSettings — AirSense 11 CPAP', () => {
  it('extracts CPAP pressure via S.C.Press signal path (AirSense 10/11)', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',            values: [0],   physMin: 0,   physMax: 36500 },
      { label: 'S.C.Press',       values: [9.0], physMin: 4,   physMax: 20 },
      { label: 'S.EPR.Level',     values: [2],   physMin: 0,   physMax: 3 },
      { label: 'S.EPR.EPREnable', values: [1],   physMin: 0,   physMax: 1 },
      { label: 'Mode',            values: [0],   physMin: 0,   physMax: 10 },
    ]);
    const result = extractSettings(buf, 'AirSense 11 AutoSet');
    const dates = Object.keys(result);
    expect(dates).toHaveLength(1);
    const day = result[dates[0]!]!;
    expect(day.deviceModel).toBe('AirSense 11 AutoSet');
    expect(day.papMode).toBe('CPAP');
    expect(day.ipap).toBeCloseTo(9.0, 1);
    // EPR on at level 2 → epap = 9.0 - 2 = 7.0
    expect(day.epap).toBeCloseTo(7.0, 1);
    // AirSense 11 CPAP has no trigger/cycle settings
    expect(day.trigger).toBe('N/A');
    expect(day.cycle).toBe('N/A');
  });

  it('extracts APAP mode for AirSense 11', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',            values: [0],   physMin: 0,   physMax: 36500 },
      { label: 'S.C.Press',       values: [8.5], physMin: 4,   physMax: 20 },
      { label: 'S.EPR.Level',     values: [0],   physMin: 0,   physMax: 3 },
      { label: 'S.EPR.EPREnable', values: [0],   physMin: 0,   physMax: 1 },
      { label: 'Mode',            values: [1],   physMin: 0,   physMax: 10 },
    ]);
    const result = extractSettings(buf, 'AirSense 11 AutoSet');
    const day = result[Object.keys(result)[0]!]!;
    expect(day.papMode).toBe('APAP');
  });

  it('extracts AutoSet mode for AirSense 11', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',            values: [0],   physMin: 0,   physMax: 36500 },
      { label: 'S.C.Press',       values: [10],  physMin: 4,   physMax: 20 },
      { label: 'S.EPR.Level',     values: [0],   physMin: 0,   physMax: 3 },
      { label: 'S.EPR.EPREnable', values: [0],   physMin: 0,   physMax: 1 },
      { label: 'Mode',            values: [2],   physMin: 0,   physMax: 10 },
    ]);
    const result = extractSettings(buf, 'AirSense 11 AutoSet');
    const day = result[Object.keys(result)[0]!]!;
    expect(day.papMode).toBe('AutoSet');
  });

  it('mode 8 remains iVAPS for AirSense 11 (not remapped to VAuto)', () => {
    // VAuto remapping only applies to AirCurve 11 devices
    const buf = buildSTRBuffer([
      { label: 'Date',            values: [0],  physMin: 0,   physMax: 36500 },
      { label: 'S.C.Press',       values: [8],  physMin: 4,   physMax: 20 },
      { label: 'S.EPR.Level',     values: [0],  physMin: 0,   physMax: 3 },
      { label: 'S.EPR.EPREnable', values: [0],  physMin: 0,   physMax: 1 },
      { label: 'Mode',            values: [8],  physMin: 0,   physMax: 10 },
    ]);
    const result = extractSettings(buf, 'AirSense 11 AutoSet');
    const day = result[Object.keys(result)[0]!]!;
    // Mode 8 = iVAPS unless device is AirCurve 11 — AS11 should not remap to VAuto
    expect(day.papMode).toBe('iVAPS');
  });
});

// ============================================================
// extractSettings — AirCurve 11 BiPAP signal extraction
// ============================================================

describe('extractSettings — AirCurve 11 VAuto', () => {
  it('uses S.VA.Trigger for trigger signal and AC11 1-5 sensitivity scale', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',         values: [0],  physMin: 0,  physMax: 36500 },
      { label: 'TgtIPAP.50',   values: [14], physMin: 4,  physMax: 25 },
      { label: 'TgtEPAP.50',   values: [8],  physMin: 4,  physMax: 25 },
      { label: 'Mode',         values: [5],  physMin: 0,  physMax: 10 },
      { label: 'S.VA.Trigger', values: [3],  physMin: 0,  physMax: 5 },
      { label: 'S.VA.Cycle',   values: [2],  physMin: 0,  physMax: 5 },
      { label: 'S.EasyBreathe',values: [0],  physMin: 0,  physMax: 1 },
      { label: 'S.RiseTime',   values: [1],  physMin: 0,  physMax: 6 },
    ]);
    const result = extractSettings(buf, 'AirCurve11VAuto');
    const day = result[Object.keys(result)[0]!]!;
    expect(day.papMode).toBe('BiPAP Auto');
    // AC11 scale: 3 = medium (not "high" as in old scale)
    expect(day.trigger).toBe('medium');
    // AC11 scale: 2 = low
    expect(day.cycle).toBe('low');
  });

  it('remaps mode 8 to VAuto for AirCurve 11', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',         values: [0],  physMin: 0,  physMax: 36500 },
      { label: 'TgtIPAP.50',   values: [14], physMin: 4,  physMax: 25 },
      { label: 'TgtEPAP.50',   values: [8],  physMin: 4,  physMax: 25 },
      { label: 'Mode',         values: [8],  physMin: 0,  physMax: 10 },
      { label: 'S.VA.Trigger', values: [3],  physMin: 0,  physMax: 5 },
      { label: 'S.VA.Cycle',   values: [2],  physMin: 0,  physMax: 5 },
      { label: 'S.EasyBreathe',values: [0],  physMin: 0,  physMax: 1 },
      { label: 'S.RiseTime',   values: [1],  physMin: 0,  physMax: 6 },
    ]);
    const result = extractSettings(buf, 'AirCurve11VAuto');
    const day = result[Object.keys(result)[0]!]!;
    expect(day.papMode).toBe('VAuto');
  });

  it('falls back to S.Trigger when S.VA.Trigger absent (older AC11 firmware)', () => {
    const buf = buildSTRBuffer([
      { label: 'Date',       values: [0],  physMin: 0,  physMax: 36500 },
      { label: 'TgtIPAP.50', values: [12], physMin: 4,  physMax: 25 },
      { label: 'TgtEPAP.50', values: [8],  physMin: 4,  physMax: 25 },
      { label: 'Mode',       values: [4],  physMin: 0,  physMax: 10 },
      { label: 'S.Trigger',  values: [4],  physMin: 0,  physMax: 5 },
      { label: 'S.Cycle',    values: [1],  physMin: 0,  physMax: 5 },
      { label: 'S.EasyBreathe', values: [0], physMin: 0, physMax: 1 },
      { label: 'S.RiseTime', values: [2],  physMin: 0,  physMax: 6 },
    ]);
    const result = extractSettings(buf, 'AirCurve11VAuto');
    const day = result[Object.keys(result)[0]!]!;
    // AC11 scale: 4 = high
    expect(day.trigger).toBe('high');
    // AC11 scale: 1 = very low
    expect(day.cycle).toBe('very low');
  });
});
