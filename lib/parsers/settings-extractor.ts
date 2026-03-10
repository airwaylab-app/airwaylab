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

function sensitivityLabel(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return SENSITIVITY_MAP[value] ?? String(value);
}

/**
 * Extract daily machine settings from an STR.edf buffer.
 * Returns a map of date string (YYYY-MM-DD) → MachineSettings.
 */
export function extractSettings(strBuffer: ArrayBuffer, deviceModel: string): DailySettings {
  const { signals, startDateTime } = parseSTR(strBuffer);
  const dailySettings: DailySettings = {};

  // Find signals by label
  const findSignal = (substring: string) =>
    signals.find((s) => s.label.includes(substring));

  const targetIPAP = findSignal('TgtIPAP.50');
  const targetEPAP = findSignal('TgtEPAP.50');
  const modeSignal = findSignal('Mode');
  const dateSignal = findSignal('Date');
  const riseTimeSignal = findSignal('S.RiseTime');
  const triggerSignal = findSignal('S.Trigger');
  const cycleSignal = findSignal('S.Cycle');
  const easyBreatheSignal = findSignal('S.EasyBreathe');
  const eprLevelSignal = findSignal('S.EPR.Level');
  const eprEnableSignal = findSignal('S.EPR.EPREnable');
  const cpapPressSignal = findSignal('S.C.Press');

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
    const dateNum = Math.round(dates[i]);
    if (firstDateNum === null) firstDateNum = dateNum;

    // Calculate date string from offset
    const daysDiff = dateNum - firstDateNum;
    const d = new Date(startDateTime.getTime() + daysDiff * 86400000);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const ipap = ipapValues[i];
    const epap = epapValues[i];

    if (isNaN(ipap) || isNaN(epap) || ipap <= 0 || epap <= 0) continue;

    const modeNum = Math.round(modeValues[i] ?? 0);
    const easyBreatheOn = Math.round(easyBreatheRaw[i] ?? 0) !== 0;
    const riseTimeRaw = riseTimeValues[i];
    const triggerRaw = triggerValues[i];
    const cycleRaw = cycleValues[i];

    dailySettings[dateStr] = {
      deviceModel,
      epap,
      ipap,
      pressureSupport: Math.round((ipap - epap) * 10) / 10,
      papMode: MODE_MAP[modeNum] ?? `Mode ${modeNum}`,
      riseTime: easyBreatheOn ? null : (riseTimeRaw !== undefined ? Math.round(riseTimeRaw) : null),
      trigger: sensitivityLabel(triggerRaw !== undefined ? Math.round(triggerRaw) : undefined),
      cycle: sensitivityLabel(cycleRaw !== undefined ? Math.round(cycleRaw) : undefined),
      easyBreathe: easyBreatheOn,
    };
  }

  return dailySettings;
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
  let closest = available[0];
  for (const d of available) {
    if (d <= dateStr) closest = d;
    else break;
  }

  return dailySettings[closest] ?? null;
}
