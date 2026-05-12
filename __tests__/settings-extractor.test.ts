import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { resolve } from 'path';
import { readFileSync } from 'fs';

vi.mock('@/lib/parsers/edf-parser', async () => {
  const actual = await vi.importActual('@/lib/parsers/edf-parser');
  return { ...(actual as object), parseSTR: vi.fn() };
});

import { parseSTR } from '@/lib/parsers/edf-parser';
import { extractSettings, getSTRSignalLabels, isAirSense11, parseIdentification, getSettingsForDate, sensitivityLabel } from '@/lib/parsers/settings-extractor';
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

// ── extractSettings — AirCurve 10 VAuto fixes (AIR-1437) ──────────────────

const mockParseSTR = parseSTR as ReturnType<typeof vi.fn>;

function makeSignal(label: string, values: number[]) {
  return { label, physicalValues: values, digitalValues: values };
}

function makeSTRResult(signals: ReturnType<typeof makeSignal>[]) {
  return { header: {}, signals, startDateTime: new Date('2026-01-11T00:00:00Z') };
}

describe('extractSettings — AirCurve 10 VAuto', () => {
  afterEach(() => {
    mockParseSTR.mockReset();
  });

  it('maps mode 8 to VAuto for AirCurve 10 VAuto', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('TgtIPAP.50', [15]),
      makeSignal('TgtEPAP.50', [8]),
      makeSignal('Mode', [8]),
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirCurve 10 VAuto');
    const dates = Object.keys(result);
    expect(dates.length).toBeGreaterThan(0);
    expect(result[dates[0]!]!.papMode).toBe('VAuto');
  });

  it('maps mode 8 to VAuto for AirCurve 11 VAuto', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('TgtIPAP.50', [15]),
      makeSignal('TgtEPAP.50', [8]),
      makeSignal('Mode', [8]),
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirCurve 11 VAuto');
    const dates = Object.keys(result);
    expect(dates.length).toBeGreaterThan(0);
    expect(result[dates[0]!]!.papMode).toBe('VAuto');
  });

  it('maps mode 8 to iVAPS for AirCurve 10 ST-A (not VAuto)', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('TgtIPAP.50', [15]),
      makeSignal('TgtEPAP.50', [8]),
      makeSignal('Mode', [8]),
      makeSignal('Date', [0]),
    ]));
    // AirCurve 10 ST-A: mode 8 = iVAPS (not VAuto)
    const result10 = extractSettings(new ArrayBuffer(0), 'AirCurve 10 ST-A');
    const dates10 = Object.keys(result10);
    expect(dates10.length).toBeGreaterThan(0);
    expect(result10[dates10[0]!]!.papMode).toBe('iVAPS');
  });

  it('uses S.VA.Trigger exact-match over substring-matched S.S.Trigger for AirCurve 10', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('TgtIPAP.50', [15]),
      makeSignal('TgtEPAP.50', [8]),
      makeSignal('Mode', [5]),
      makeSignal('Date', [0]),
      makeSignal('S.VA.Trigger', [3]),  // value 3 on 0-4 scale = 'high'
      makeSignal('S.S.Trigger', [1]),   // substring match would give 'low'
      makeSignal('S.VA.Cycle', [2]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirCurve 10 VAuto');
    const dates = Object.keys(result);
    expect(dates.length).toBeGreaterThan(0);
    expect(result[dates[0]!]!.trigger).toBe('high');
  });

  it('returns empty map when IPAP signal is missing (condition for SETTINGS_DIAGNOSTIC in worker)', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      // TgtIPAP.50 intentionally absent
      makeSignal('TgtEPAP.50', [8]),
      makeSignal('Mode', [8]),
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirCurve 10 VAuto');
    // Empty result causes the worker to fire SETTINGS_DIAGNOSTIC with signal label list
    expect(Object.keys(result).length).toBe(0);
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

// ── AirSense 11 — device detection and settings extraction ───────────────────

describe('isAirSense11 — device detection helper', () => {
  it('returns true for "AirSense 11 AutoSet"', () => {
    expect(isAirSense11('AirSense 11 AutoSet')).toBe(true);
  });

  it('returns true for "AirSense 11 Elite"', () => {
    expect(isAirSense11('AirSense 11 Elite')).toBe(true);
  });

  it('returns true for underscore-separated "AirSense_11_AutoSet"', () => {
    expect(isAirSense11('AirSense_11_AutoSet')).toBe(true);
  });

  it('returns true for compact "AirSense11"', () => {
    expect(isAirSense11('AirSense11')).toBe(true);
  });

  it('returns false for AirSense 10', () => {
    expect(isAirSense11('AirSense 10 AutoSet')).toBe(false);
  });

  it('returns false for AirCurve 11 (bilevel, not CPAP)', () => {
    expect(isAirSense11('AirCurve 11 VAuto')).toBe(false);
  });

  it('returns false for AirMini', () => {
    expect(isAirSense11('AirMini AutoSet')).toBe(false);
  });
});

describe('parseIdentification — AirSense 11 model strings', () => {
  it('parses "AirSense 11 AutoSet" from top-level ModelNumber', () => {
    expect(parseIdentification(JSON.stringify({ ModelNumber: 'AirSense 11 AutoSet' }))).toBe('AirSense 11 AutoSet');
  });

  it('parses "AirSense_11_AutoSet" (underscore firmware variant)', () => {
    expect(parseIdentification(JSON.stringify({ ModelNumber: 'AirSense_11_AutoSet' }))).toBe('AirSense_11_AutoSet');
  });

  it('parses AS11 from FlowGenerator nested JSON (same structure as AirCurve 11)', () => {
    const json = JSON.stringify({
      FlowGenerator: {
        IdentificationProfiles: {
          Product: {
            ProductName: 'AirSense11AutoSet',
            SerialNumber: '12345678',
          },
        },
      },
    });
    expect(parseIdentification(json)).toBe('AirSense11AutoSet');
  });

  it('confirms AS11 model string does NOT match AirCurve 11 detection regex', () => {
    const model = parseIdentification(JSON.stringify({ ModelNumber: 'AirSense 11 AutoSet' }));
    // isAC11 logic: normalize whitespace, check for 'aircurve11'
    const normalised = model.replace(/\s/g, '').toLowerCase();
    expect(normalised.includes('aircurve11')).toBe(false);
    // But it IS detected as AirSense 11
    expect(isAirSense11(model)).toBe(true);
  });
});

describe('extractSettings — AirSense 11 (mocked STR signals)', () => {
  afterEach(() => {
    mockParseSTR.mockReset();
  });

  it('extracts CPAP settings from AS11 STR using standard AirSense signal names', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('S.C.Press', [10]),
      makeSignal('S.EPR.Level', [2]),
      makeSignal('S.EPR.EPREnable', [1]),
      makeSignal('Mode', [0]),   // CPAP
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirSense 11 AutoSet');
    const dates = Object.keys(result);
    expect(dates.length).toBeGreaterThan(0);
    const s = result[dates[0]!]!;
    expect(s.ipap).toBe(10);
    expect(s.epap).toBe(8);   // 10 - EPR level 2
    expect(s.papMode).toBe('CPAP');
    expect(s.deviceModel).toBe('AirSense 11 AutoSet');
  });

  it('falls back to S.EPR.LevelS when S.EPR.Level is absent (some AS11 firmware)', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('S.C.Press', [12]),
      makeSignal('S.EPR.LevelS', [3]),  // firmware variant label
      makeSignal('S.EPR.EPREnable', [1]),
      makeSignal('Mode', [2]),   // AutoSet
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirSense 11 AutoSet');
    const dates = Object.keys(result);
    expect(dates.length).toBeGreaterThan(0);
    const s = result[dates[0]!]!;
    expect(s.ipap).toBe(12);
    expect(s.epap).toBe(9);   // 12 - EPR level 3
    expect(s.papMode).toBe('AutoSet');
  });

  it('does NOT apply AirCurve 11 sensitivity scale (1-5) for AS11 trigger values', () => {
    mockParseSTR.mockReturnValue(makeSTRResult([
      makeSignal('S.C.Press', [10]),
      makeSignal('S.EPR.Level', [0]),
      makeSignal('S.EPR.EPREnable', [0]),
      makeSignal('S.Trigger', [3]),
      makeSignal('S.Cycle', [3]),
      makeSignal('Mode', [0]),
      makeSignal('Date', [0]),
    ]));
    const result = extractSettings(new ArrayBuffer(0), 'AirSense 11 AutoSet');
    const s = result[Object.keys(result)[0]!]!;
    // AS11 is not an AirCurve 11 — must use 0-4 scale: value 3 = 'high', not 'medium'
    expect(s.trigger).toBe('high');
    expect(s.cycle).toBe('high');
  });
});

// ── extractSettings — AirCurve 10 VAuto integration (real STR.edf fixture) ──
//
// Signal labels found in __tests__/fixtures/sd-card/STR.edf (97 signals):
// Date, MaskOn, MaskOff, MaskEvents, Duration, OnDuration, PatientHours, Mode,
// S.RampEnable, S.RampTime, S.C.StartPress, S.C.Press, S.EPR.ClinEnable,
// S.EPR.EPREnable, S.EPR.Level, S.EPR.EPRType, S.BL.StartPress, S.BL.IPAP,
// S.BL.EPAP, S.EasyBreathe, S.VA.StartPress, S.VA.MaxIPAP, S.VA.MinEPAP,
// S.VA.PS, S.RiseEnable, S.RiseTime, S.Cycle, S.Trigger, S.TiMax, S.TiMin,
// S.SmartStart, S.PtAccess, S.ABFilter, S.LeakAlert, S.Mask, S.Tube,
// S.ClimateControl, S.HumEnable, S.HumLevel, S.TempEnable, S.Temp,
// HeatedTube, Humidifier, BlowPress.95, BlowPress.5, Flow.95, Flow.5,
// BlowFlow.50, AmbHumidity.50, HumTemp.50, HTubeTemp.50, HTubePow.50,
// HumPow.50, SpO2.50, SpO2.95, SpO2.Max, SpO2Thresh, SpontCyc%,
// MaskPress.50, MaskPress.95, MaskPress.Max, TgtIPAP.50, TgtIPAP.95,
// TgtIPAP.Max, TgtEPAP.50, TgtEPAP.95, TgtEPAP.Max, Leak.50, Leak.95,
// Leak.70, Leak.Max, MinVent.50, MinVent.95, MinVent.Max, RespRate.50,
// RespRate.95, RespRate.Max, TidVol.50, TidVol.95, TidVol.Max, IERatio.50,
// IERatio.95, IERatio.Max, Ti.50, Ti.95, Ti.Max, AHI, HI, AI, OAI, CAI,
// UAI, Fault.Device, Fault.Alarm, Fault.Humidifier, Fault.HeatedTube, Crc16
//
// Key firmware signal name differences from what prior code expected:
//   S.HumLevel      (not S.Humid.Level / S.HumidLevel)
//   S.Temp          (not S.TubeTemp / S.Tube.Temp)
//   S.VA.StartPress (ramp start press for VAuto mode, not S.RampPress)

describe('extractSettings — AirCurve 10 VAuto integration (real STR.edf)', () => {
  beforeEach(async () => {
    const { parseSTR: realParseSTR } = await vi.importActual<typeof import('@/lib/parsers/edf-parser')>('@/lib/parsers/edf-parser');
    mockParseSTR.mockImplementation(realParseSTR as typeof parseSTR);
  });

  afterEach(() => {
    mockParseSTR.mockReset();
  });

  function loadStrFixture(): ArrayBuffer {
    const fixturePath = resolve(process.cwd(), '__tests__/fixtures/sd-card/STR.edf');
    const nodeBuf = readFileSync(fixturePath);
    return nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength) as ArrayBuffer;
  }

  it('getSTRSignalLabels enumerates 97 signals including TgtIPAP.50 and TgtEPAP.50', () => {
    const ab = loadStrFixture();
    const labels = getSTRSignalLabels(ab);
    expect(labels).toHaveLength(97);
    expect(labels).toContain('TgtIPAP.50');
    expect(labels).toContain('TgtEPAP.50');
    expect(labels).toContain('S.Trigger');
    expect(labels).toContain('S.Cycle');
    expect(labels).toContain('S.HumLevel');
    expect(labels).toContain('S.Temp');
    expect(labels).toContain('S.VA.StartPress');
  });

  it('extractSettings returns non-empty map with valid IPAP/EPAP for AirCurve 10 VAuto', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const dates = Object.keys(result).sort();
    expect(dates.length).toBeGreaterThan(0);

    // Fixture has valid therapy data from 2025-02-15 through 2026-03-10
    const firstDate = dates[0]!;
    const s = result[firstDate]!;
    expect(s.ipap).toBeGreaterThan(0);
    expect(s.epap).toBeGreaterThan(0);
    expect(s.pressureSupport).toBeGreaterThanOrEqual(0);
    expect(s.deviceModel).toBe('AirCurve_10_VAuto');
  });

  it('extracts correct IPAP=18 EPAP=10 for 2026-03-09 (last DATALOG night)', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const s = result['2026-03-09'];
    expect(s).not.toBeUndefined();
    expect(s!.ipap).toBe(18);
    expect(s!.epap).toBe(10);
    expect(s!.pressureSupport).toBe(8);
  });

  it('extracts non-N/A trigger and cycle from S.Trigger/S.Cycle signals', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const s = result['2026-03-09']!;
    // S.Trigger = 3 → 'high', S.Cycle = 2 → 'medium' on 0-4 scale
    expect(s.trigger).not.toBe('N/A');
    expect(s.cycle).not.toBe('N/A');
  });

  it('extracts humidifierLevel from S.HumLevel signal (not S.Humid.Level)', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const s = result['2026-03-09']!;
    // S.HumLevel = 4 in fixture
    expect(s.humidifierLevel).toBe(4);
  });

  it('extracts tubeTempSetting from S.Temp signal (not S.TubeTemp)', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const s = result['2026-03-09']!;
    // S.Temp = 25 in fixture
    expect(s.tubeTempSetting).toBe(25);
  });

  it('extracts rampPressure from S.VA.StartPress signal (not S.RampPress)', () => {
    const ab = loadStrFixture();
    const result = extractSettings(ab, 'AirCurve_10_VAuto');
    const s = result['2026-03-09']!;
    // S.VA.StartPress = 4.0 in fixture
    expect(s.rampPressure).toBe(4);
  });
});
