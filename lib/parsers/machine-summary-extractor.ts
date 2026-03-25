// ============================================================
// AirwayLab — Machine Summary Stats Extractor from STR.edf
// Extracts non-S.* channels: AHI, leak, breathing stats, faults.
// Separate from settings-extractor.ts to minimize protected module changes.
// ============================================================

import type { MachineSummaryStats } from '../types';
import { parseSTR } from './edf-parser';

interface DailySummary {
  [date: string]: MachineSummaryStats;
}

/** Signal label to MachineSummaryStats field mapping */
const SIGNAL_MAP: Record<string, keyof MachineSummaryStats> = {
  'AHI': 'ahi',
  'HI': 'hi',
  'OAI': 'oai',
  'CAI': 'cai',
  'UAI': 'uai',
  'Leak.50': 'leak50',
  'Leak.70': 'leak70',
  'Leak.95': 'leak95',
  'Leak.Max': 'leakMax',
  'MinVent.50': 'minVent50',
  'MinVent.95': 'minVent95',
  'RespRate.50': 'respRate50',
  'RespRate.95': 'respRate95',
  'TidVol.50': 'tidVol50',
  'TidVol.95': 'tidVol95',
  'Ti.50': 'ti50',
  'Ti.95': 'ti95',
  'IERatio.50': 'ieRatio50',
  'SpontCyc%': 'spontCycPct',
  'TgtIPAP.50': 'tgtIpap50',
  'TgtIPAP.95': 'tgtIpap95',
  'TgtEPAP.50': 'tgtEpap50',
  'TgtEPAP.95': 'tgtEpap95',
  'MaskPress.50': 'maskPress50',
  'MaskPress.95': 'maskPress95',
  'Duration': 'durationMin',
  'MaskOn': 'maskOnMin',
  'MaskOff': 'maskOffMin',
  'MaskEvents': 'maskEvents',
  'SpO2.50': 'spo2_50',
  'SpO2.95': 'spo2_95',
  'AmbHumidity.50': 'ambHumidity50',
};

const FAULT_SIGNALS: Record<string, keyof MachineSummaryStats> = {
  'Fault.Device': 'faultDevice',
  'Fault.Alarm': 'faultAlarm',
  'Fault.Humidifier': 'faultHumidifier',
  'Fault.HeatedTube': 'faultHeatedTube',
};

/** Type-safe dynamic field setters for MachineSummaryStats */
type NumericFields = { [K in keyof MachineSummaryStats]: MachineSummaryStats[K] extends number | null ? K : never }[keyof MachineSummaryStats];
type BooleanFields = { [K in keyof MachineSummaryStats]: MachineSummaryStats[K] extends boolean ? K : never }[keyof MachineSummaryStats];

function setNumericField(summary: MachineSummaryStats, field: keyof MachineSummaryStats, value: number): void {
  (summary[field as NumericFields] as number | null) = value;
}
function setBooleanField(summary: MachineSummaryStats, field: keyof MachineSummaryStats, value: boolean): void {
  (summary[field as BooleanFields] as boolean) = value;
}

function makeEmptySummary(): MachineSummaryStats {
  return {
    ahi: null, hi: null, oai: null, cai: null, uai: null,
    leak50: null, leak70: null, leak95: null, leakMax: null,
    minVent50: null, minVent95: null,
    respRate50: null, respRate95: null,
    tidVol50: null, tidVol95: null,
    ti50: null, ti95: null,
    ieRatio50: null, spontCycPct: null,
    tgtIpap50: null, tgtIpap95: null,
    tgtEpap50: null, tgtEpap95: null,
    maskPress50: null, maskPress95: null,
    durationMin: null, maskOnMin: null, maskOffMin: null, maskEvents: null,
    spo2_50: null, spo2_95: null,
    faultDevice: false, faultAlarm: false,
    faultHumidifier: false, faultHeatedTube: false,
    anyFault: false,
    ambHumidity50: null,
  };
}

/**
 * Extract daily machine summary statistics from an STR.edf buffer.
 * Returns a map of date string (YYYY-MM-DD) -> MachineSummaryStats.
 * Reads all non-S.* channels that the settings extractor ignores.
 */
export function extractMachineSummary(
  strBuffer: ArrayBuffer,
  _deviceModel: string
): DailySummary {
  const { signals, startDateTime } = parseSTR(strBuffer);
  const result: DailySummary = {};

  const findSignal = (label: string) =>
    signals.find((s) => s.label === label);

  const dateSignal = findSignal('Date');
  if (!dateSignal) return result;

  const dates = dateSignal.physicalValues;
  let firstDateNum: number | null = null;

  for (let i = 0; i < dates.length; i++) {
    const dateNum = Math.round(dates[i]!);
    if (firstDateNum === null) firstDateNum = dateNum;

    const daysDiff = dateNum - firstDateNum;
    const d = new Date(startDateTime.getTime() + daysDiff * 86400000);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const summary = makeEmptySummary();

    // Extract numeric signals
    for (const [signalLabel, field] of Object.entries(SIGNAL_MAP)) {
      const sig = findSignal(signalLabel);
      if (!sig) continue;
      const val = sig.physicalValues[i];
      if (val === undefined || isNaN(val)) continue;

      // Event indices: clamp to >= 0 (digital-to-physical can produce small negatives)
      const isEventIndex = ['ahi', 'hi', 'oai', 'cai', 'uai'].includes(field);
      const clamped = isEventIndex ? Math.max(0, val) : val;

      // Round to 2 decimal places
      setNumericField(summary, field, Math.round(clamped * 100) / 100);
    }

    // Extract fault flags
    for (const [signalLabel, field] of Object.entries(FAULT_SIGNALS)) {
      const sig = findSignal(signalLabel);
      if (!sig) continue;
      const val = sig.physicalValues[i];
      setBooleanField(summary, field as keyof MachineSummaryStats, val !== undefined && Math.round(val) !== 0);
    }

    summary.anyFault = summary.faultDevice || summary.faultAlarm ||
      summary.faultHumidifier || summary.faultHeatedTube;

    result[dateStr] = summary;
  }

  return result;
}
