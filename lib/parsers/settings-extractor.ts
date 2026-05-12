// ============================================================
// AirwayLab — Machine Settings Extractor from STR.edf
// Ported from VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer
// ============================================================

import type { MachineSettings } from '../types';
import { parseSTR } from './edf-parser';

interface DailySettings {
  [date: string]: MachineSettings;
}

const MODE_MAP: Record<number, string> = {
  0: 'CPAP',
  1: 'APAP',
  2: 'AutoSet',
  3: 'APAP',
  4: 'BiPAP',
  5: 'BiPAP Auto',
  6: 'ASV',
  7: 'ASVAuto',
  8: 'iVAPS',
};

const SENSITIVITY_MAP: Record<number, string> = {
  4: 'very high',
  3: 'high',
  2: 'medium',
  1: 'low',
  0: 'very low',
};

/** AirCurve 11 (BiPAP) uses a 1-5 sensitivity scale instead of 0-4. AirSense 11 (CPAP) does not have trigger/cycle settings. */
const SENSITIVITY_MAP_AIRCURVE11: Record<number, string> = {
  5: 'very high',
  4: 'high',
  3: 'medium',
  2: 'low',
  1: 'very low',
};

const MASK_MAP: Record<number, string> = {
  0: 'Pillows',
  1: 'Full Face',
  2: 'Nasal',
};

export function sensitivityLabel(value: number | undefined, isAirCurve11 = false): string {
  if (value === undefined || value === null) return 'N/A';
  const map = isAirCurve11 ? SENSITIVITY_MAP_AIRCURVE11 : SENSITIVITY_MAP;
  return map[value] ?? String(value);
}

/** Signals already handled by typed fields — excluded from extendedSettings */
const TYPED_SIGNAL_LABELS = new Set([
  'TgtIPAP.50', 'TgtEPAP.50', 'Mode', 'Date',
  'S.RiseTime', 'S.Trigger', 'S.Cycle', 'S.EasyBreathe',
  'S.EPR.Level', 'S.EPR.EPREnable', 'S.C.Press',
  'S.VA.Trigger', 'S.VA.Cycle', // AirCurve 11 VAuto-specific signals
  'S.RampEnable', 'S.RampTime', 'S.RampPress',
  'S.Humid.Level', 'S.HumidLevel', 'S.ClimateControl', 'S.Humid.Status',
  'S.TubeTemp', 'S.Tube.Temp', 'S.Mask', 'S.SmartStart',
  'S.TiMax', 'S.TiMin',
]);

/**
 * Extract daily machine settings from an STR.edf buffer.
 * Returns a map of date string (YYYY-MM-DD) → MachineSettings.
 * Captures all S.* prefix signals into extendedSettings alongside typed fields.
 */
export function extractSettings(strBuffer: ArrayBuffer, deviceModel: string): DailySettings {
  const { signals, startDateTime } = parseSTR(strBuffer);
  const dailySettings: DailySettings = {};

  // Log all signal labels for discovery
  const allLabels = signals.map((s) => s.label);
  console.error(`[settings] STR.edf signals (${allLabels.length}): ${allLabels.join(', ')}`);

  // AirCurve 11 (BiPAP) uses different sensitivity scale and VAuto mode mapping.
  // AirSense 11 (CPAP/APAP) uses the same signal names as AirSense 10 — detected via signals below.
  const isAirCurve11 = deviceModel.replace(/\s/g, '').toLowerCase().includes('aircurve11');

  const findSignal = (substring: string) =>
    signals.find((s) => s.label.includes(substring));

  /** Find a signal by exact label match (avoids S.S.Trigger matching S.Trigger) */
  const findSignalExact = (label: string) =>
    signals.find((s) => s.label === label);

  // Core pressure signals
  const targetIPAP = findSignal('TgtIPAP.50');
  const targetEPAP = findSignal('TgtEPAP.50');
  const modeSignal = findSignal('Mode');
  const dateSignal = findSignal('Date');
  const riseTimeSignal = findSignal('S.RiseTime');
  // AirCurve 11 VAuto uses S.VA.Trigger/S.VA.Cycle signals.
  // findSignal('S.Trigger') would match S.S.Trigger (Spont mode) via substring,
  // so prefer S.VA.* exact matches for AirCurve 11 devices, falling back to generic.
  const triggerSignal = isAirCurve11
    ? (findSignalExact('S.VA.Trigger') ?? findSignal('S.Trigger'))
    : findSignal('S.Trigger');
  const cycleSignal = isAirCurve11
    ? (findSignalExact('S.VA.Cycle') ?? findSignal('S.Cycle'))
    : findSignal('S.Cycle');
  const easyBreatheSignal = findSignal('S.EasyBreathe');
  const eprLevelSignal = findSignal('S.EPR.Level');
  const eprEnableSignal = findSignal('S.EPR.EPREnable');
  const cpapPressSignal = findSignal('S.C.Press');

  // Comfort/environment signals
  const rampEnableSignal = findSignal('S.RampEnable');
  const rampTimeSignal = findSignal('S.RampTime');
  const rampPressSignal = findSignal('S.RampPress');
  const humidLevelSignal = findSignal('S.Humid.Level') ?? findSignal('S.HumidLevel');
  const climateControlSignal = findSignal('S.ClimateControl') ?? findSignal('S.Humid.Status');
  const tubeTempSignal = findSignal('S.TubeTemp') ?? findSignal('S.Tube.Temp');
  const maskSignal = findSignal('S.Mask');
  const smartStartSignal = findSignal('S.SmartStart');
  const tiMaxSignal = findSignal('S.TiMax');
  const tiMinSignal = findSignal('S.TiMin');

  // All remaining S.* signals for extendedSettings
  const extendedSignals = signals.filter(
    (s) => s.label.startsWith('S.') && !TYPED_SIGNAL_LABELS.has(s.label)
  );

  if (!dateSignal) return dailySettings;

  // Determine machine type
  const isAirCurve = !!(targetIPAP && targetEPAP);
  const isAirSense = !!(cpapPressSignal && eprLevelSignal && eprEnableSignal && !targetIPAP);

  if (!isAirCurve && !isAirSense) return dailySettings;

  const dates = dateSignal.physicalValues;

  // Compute pressure arrays
  let ipapValues: number[] = [];
  let epapValues: number[] = [];

  if (isAirCurve) {
    ipapValues = targetIPAP!.physicalValues.map((v) => Math.round(v * 10) / 10);
    epapValues = targetEPAP!.physicalValues.map((v) => Math.round(v * 10) / 10);
  } else if (isAirSense) {
    const cpapValues = cpapPressSignal!.physicalValues.map((v) => Math.round(v * 10) / 10);
    const eprLevels = eprLevelSignal!.physicalValues;
    const eprEnabled = eprEnableSignal!.physicalValues;

    ipapValues = cpapValues;
    epapValues = cpapValues.map((cp, i) => {
      const eprOn = (eprEnabled[i] ?? 0) !== 0;
      const eprLevel = eprLevels[i] ?? 0;
      if (eprOn && eprLevel > 0) {
        return Math.round((cp - eprLevel) * 10) / 10;
      }
      return cp;
    });
  }

  const modeValues = modeSignal?.physicalValues ?? [];
  const riseTimeValues = riseTimeSignal?.physicalValues ?? [];
  const triggerValues = triggerSignal?.physicalValues ?? [];
  const cycleValues = cycleSignal?.physicalValues ?? [];
  const easyBreatheRaw = easyBreatheSignal?.physicalValues ?? [];

  // Date anchor: first date value maps to startDateTime
  let firstDateNum: number | null = null;

  const len = Math.min(dates.length, ipapValues.length, epapValues.length);
  for (let i = 0; i < len; i++) {
    const dateNum = Math.round(dates[i]!);
    if (firstDateNum === null) firstDateNum = dateNum;

    // Calculate date string from offset
    const daysDiff = dateNum - firstDateNum;
    const d = new Date(startDateTime.getTime() + daysDiff * 86400000);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const ipap = ipapValues[i]!;
    const epap = epapValues[i]!;

    if (isNaN(ipap) || isNaN(epap) || ipap <= 0 || epap <= 0) continue;

    const modeNum = Math.round(modeValues[i] ?? 0);
    const easyBreatheOn = Math.round(easyBreatheRaw[i] ?? 0) !== 0;
    const riseTimeRaw = riseTimeValues[i];
    const triggerRaw = triggerValues[i];
    const cycleRaw = cycleValues[i];

    // Comfort/environment values for this day
    const rampEnableRaw = rampEnableSignal?.physicalValues[i];
    const rampTimeRaw = rampTimeSignal?.physicalValues[i];
    const rampPressRaw = rampPressSignal?.physicalValues[i];
    const humidLevelRaw = humidLevelSignal?.physicalValues[i];
    const climateControlRaw = climateControlSignal?.physicalValues[i];
    const tubeTempRaw = tubeTempSignal?.physicalValues[i];
    const maskRaw = maskSignal?.physicalValues[i];
    const smartStartRaw = smartStartSignal?.physicalValues[i];
    const tiMaxRaw = tiMaxSignal?.physicalValues[i];
    const tiMinRaw = tiMinSignal?.physicalValues[i];

    // Catch-all for remaining S.* signals
    const extended: Record<string, number> = {};
    for (const sig of extendedSignals) {
      const val = sig.physicalValues[i];
      if (val !== undefined && !isNaN(val)) {
        extended[sig.label] = Math.round(val * 100) / 100;
      }
    }

    // AirCurve 11 uses mode 8 for VAuto, not iVAPS
    let papMode = MODE_MAP[modeNum] ?? `Mode ${modeNum}`;
    if (isAirCurve11 && modeNum === 8) {
      papMode = 'VAuto';
    }

    dailySettings[dateStr] = {
      deviceModel,
      epap,
      ipap,
      pressureSupport: Math.round((ipap - epap) * 10) / 10,
      papMode,
      riseTime: easyBreatheOn ? null : (riseTimeRaw !== undefined ? Math.round(riseTimeRaw) : null),
      trigger: sensitivityLabel(triggerRaw !== undefined ? Math.round(triggerRaw) : undefined, isAirCurve11),
      cycle: sensitivityLabel(cycleRaw !== undefined ? Math.round(cycleRaw) : undefined, isAirCurve11),
      easyBreathe: easyBreatheOn,
      rampEnabled: rampEnableRaw !== undefined ? Math.round(rampEnableRaw) !== 0 : null,
      rampTime: rampTimeRaw !== undefined ? Math.round(rampTimeRaw) : null,
      rampPressure: rampPressRaw !== undefined ? Math.round(rampPressRaw * 10) / 10 : null,
      humidifierLevel: humidLevelRaw !== undefined ? Math.round(humidLevelRaw) : null,
      climateControlAuto: climateControlRaw !== undefined ? Math.round(climateControlRaw) !== 0 : null,
      tubeTempSetting: tubeTempRaw !== undefined ? Math.round(tubeTempRaw) : null,
      maskType: maskRaw !== undefined ? (MASK_MAP[Math.round(maskRaw)] ?? `Type ${Math.round(maskRaw)}`) : null,
      smartStart: smartStartRaw !== undefined ? Math.round(smartStartRaw) !== 0 : null,
      tiMax: tiMaxRaw !== undefined ? Math.round(tiMaxRaw * 100) / 100 : null,
      tiMin: tiMinRaw !== undefined ? Math.round(tiMinRaw * 100) / 100 : null,
      extendedSettings: Object.keys(extended).length > 0 ? extended : undefined,
      settingsSource: 'extracted',
    };
  }

  return dailySettings;
}

/**
 * Extract signal labels from an STR.edf buffer (for diagnostics when extraction fails).
 */
export function getSTRSignalLabels(strBuffer: ArrayBuffer): string[] {
  try {
    const { signals } = parseSTR(strBuffer);
    return signals.map((s) => s.label);
  } catch {
    return [];
  }
}

/**
 * Parse Identification.tgt or Identification.json for device model.
 */
export function parseIdentification(text: string): string {
  // Try JSON format first
  try {
    const json = JSON.parse(text);
    if (json.ModelNumber) return json.ModelNumber;
    if (json.ProductName) return json.ProductName;
    // Handle AirCurve 11 nested JSON: FlowGenerator.IdentificationProfiles.Product.ProductName
    const fg = json.FlowGenerator;
    if (fg?.IdentificationProfiles?.Product?.ProductName) {
      return fg.IdentificationProfiles.Product.ProductName;
    }
    if (fg?.IdentificationProfiles?.Product?.ModelNumber) {
      return fg.IdentificationProfiles.Product.ModelNumber;
    }
    // Handle iVAPS nested IdentificationProfiles structure
    if (json.IdentificationProfiles) {
      const profiles = json.IdentificationProfiles;
      if (Array.isArray(profiles) && profiles.length > 0) {
        const first = profiles[0];
        if (first?.ModelNumber) return first.ModelNumber;
        if (first?.ProductName) return first.ProductName;
      }
      if (typeof profiles === 'object' && !Array.isArray(profiles) && profiles.ModelNumber) {
        return profiles.ModelNumber;
      }
    }
  } catch {
    // Not JSON, try text parsing
  }

  // Try key=value format
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes('ModelNumber') || line.includes('ProductName')) {
      const val = line.split('=')[1]?.trim() || line.split(':')[1]?.trim();
      if (val) return val;
    }
  }

  // Check for known models
  const lc = text.toLowerCase();
  if (lc.includes('aircurve')) return 'AirCurve';
  if (lc.includes('airsense')) return 'AirSense';

  return 'Unknown';
}

/**
 * Get settings for a specific date, with fallback to nearest available date.
 */
export function getSettingsForDate(
  dailySettings: DailySettings,
  dateStr: string
): MachineSettings | null {
  if (dailySettings[dateStr]) return dailySettings[dateStr];

  // Find nearest available date
  const available = Object.keys(dailySettings).sort();
  if (available.length === 0) return null;

  // Find the closest date before or on the target
  let closest = available[0]!;
  for (const d of available) {
    if (d <= dateStr) closest = d;
    else break;
  }

  return dailySettings[closest] ?? null;
}
