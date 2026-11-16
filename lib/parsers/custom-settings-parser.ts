// ============================================================
// AirwayLab — airbreak-plus Custom Settings Parser
// Parses CSG.tgt / CSG.set and VGL.tgt / VGL.set persistent settings
// from ResMed SD cards running the airbreak-plus custom firmware payload.
// ============================================================

import type { CustomVAutoSettings, ASVSensitivityLabel } from '../types';

const SENSITIVITY_MAP: Record<number, { label: ASVSensitivityLabel; multiplier: number }> = {
  0: { label: 'Very Low', multiplier: 0.50 },
  1: { label: 'Low', multiplier: 0.75 },
  2: { label: 'Med', multiplier: 1.00 },
  3: { label: 'High', multiplier: 1.25 },
  4: { label: 'Very High', multiplier: 1.50 },
};

export interface VAutoGlobalSettings {
  minEpap?: number;
  maxIpap?: number;
  pressureSupport?: number;
  startPressure?: number;
}

/**
 * Parse ResMed VGL.tgt / VGL.set global VAuto bounds.
 * Pressures are stored in hex units of 1/50 cmH2O:
 *   #MNE 1CC -> 460 / 50 = 9.2 cmH2O (Min EPAP)
 *   #MXI 2B2 -> 690 / 50 = 13.8 cmH2O (Max IPAP)
 *   #SPT 096 -> 150 / 50 = 3.0 cmH2O (PS)
 *   #STV 0C8 -> 200 / 50 = 4.0 cmH2O (Start Pressure)
 */
export function parseVAutoGlobalSettings(text: string): VAutoGlobalSettings | null {
  if (!text || typeof text !== 'string') return null;

  const raw: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('#')) continue;
    const parts = trimmed.substring(1).trim().split(/\s+/);
    if (parts.length < 2) continue;
    raw[parts[0]!.toUpperCase()] = parts[1]!;
  }

  const parsePress = (key: string): number | undefined => {
    const hex = raw[key];
    if (hex === undefined) return undefined;
    const val = parseInt(hex, 16);
    if (isNaN(val) || val <= 0 || val === 0xffff) return undefined;
    return Math.round((val / 50.0) * 10) / 10;
  };

  const minEpap = parsePress('MNE');
  const maxIpap = parsePress('MXI');
  const pressureSupport = parsePress('SPT');
  const startPressure = parsePress('STV');

  if (
    minEpap === undefined &&
    maxIpap === undefined &&
    pressureSupport === undefined &&
    startPressure === undefined
  ) {
    return null;
  }

  return { minEpap, maxIpap, pressureSupport, startPressure };
}

/**
 * Parse airbreak-plus CSG.tgt / CSG.set text into structured CustomVAutoSettings.
 * Format on SD card is ASCII text with lines like:
 *   #RPO 0001   (Custom VAuto On/Off)
 *   #RCM 0C8    (ASV Max in hex / 50.0 -> cmH2O)
 *   #RXM 0001   (ASV Sensitivity 0-4)
 *   #RDH 46     (EPS exhale relief in hex / 50.0 -> 0.0-3.0 cmH2O, step 0.2)
 *   #RDW 1      (Exh. Shape level 0-7 -> s = -0.75 + 0.25 * level)
 *   #RPH 0001   (Custom T/C On/Off)
 *   #RPF 0001   (Square Wave On/Off)
 *   #RPW 0000   (ASV Backup Rate On/Off)
 *
 * Returns null if the text is empty or contains no airbreak-plus registers.
 */
export function parseCustomSettings(text: string): CustomVAutoSettings | null {
  if (!text || typeof text !== 'string') return null;

  const lines = text.split(/\r?\n/);
  const raw: Record<string, string | number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('#')) continue;

    const parts = trimmed.substring(1).trim().split(/\s+/);
    if (parts.length < 2) continue;

    const key = parts[0]!.toUpperCase();
    const valHex = parts[1]!;
    raw[key] = valHex;
  }

  // Check if any Custom VAuto or airbreak registers are present
  const hasCustomVAutoKey =
    'RPO' in raw || 'RCM' in raw || 'RXM' in raw || 'RPH' in raw || 'RDH' in raw || 'RDW' in raw;
  if (!hasCustomVAutoKey && !('RPF' in raw) && !('RPW' in raw)) {
    return null;
  }

  // RPO: Custom VAuto toggle (0 = Off, 1 = On)
  const rpoRaw = raw['RPO'] !== undefined ? parseInt(String(raw['RPO']), 16) : 0;
  const enabled = rpoRaw === 1;

  // RCM: ASV Max (hex value / 50.0 -> cmH2O). Default in airbreak is 3.0 cmH2O (150 = 0x96)
  let asvMax = 3.0;
  if (raw['RCM'] !== undefined) {
    const rcmVal = parseInt(String(raw['RCM']), 16);
    if (!isNaN(rcmVal) && rcmVal !== 0xffff) {
      asvMax = Math.round((rcmVal / 50.0) * 10) / 10;
    }
  }

  // RXM: ASV Sens (0: Very Low, 1: Low, 2: Med, 3: High, 4: Very High). Default is 2 (Med)
  let asvSensCode = 2;
  if (raw['RXM'] !== undefined) {
    const rxmVal = parseInt(String(raw['RXM']), 16);
    if (!isNaN(rxmVal) && rxmVal in SENSITIVITY_MAP) {
      asvSensCode = rxmVal;
    }
  }
  const sensInfo = SENSITIVITY_MAP[asvSensCode] ?? SENSITIVITY_MAP[2]!;

  // RDH: EPS Exhale Relief (hex value / 50.0 -> 0.0-3.0 cmH2O, step 0.2; 0 = Off)
  let eps: number | undefined;
  if (raw['RDH'] !== undefined) {
    const rdhVal = parseInt(String(raw['RDH']), 16);
    if (!isNaN(rdhVal) && rdhVal !== 0xffff) {
      const clamped = Math.max(0, Math.min(3.0, rdhVal / 50.0));
      eps = Math.round(clamped * 10) / 10;
    }
  }

  // RDW: Exh. Shape (0-7, step 1; s = -0.75 + 0.25 * level)
  let exhaleShape: number | undefined;
  let exhaleShapeExponent: number | undefined;
  if (raw['RDW'] !== undefined) {
    const rdwVal = parseInt(String(raw['RDW']), 16);
    if (!isNaN(rdwVal) && rdwVal !== 0xffff) {
      exhaleShape = Math.max(0, Math.min(7, Math.round(rdwVal)));
      exhaleShapeExponent = Math.round((-0.75 + 0.25 * exhaleShape) * 100) / 100;
    }
  }

  // RPH: Custom Trigger/Cycle (0 = Off, 1 = On)
  const rphRaw = raw['RPH'] !== undefined ? parseInt(String(raw['RPH']), 16) : 0;
  const customTriggerCycle = rphRaw === 1;

  // RPF: Square Wave (0 = Off, 1 = On)
  const rpfRaw = raw['RPF'] !== undefined ? parseInt(String(raw['RPF']), 16) : 0;
  const squareWave = rpfRaw === 1;

  // RPW: ASV Backup Rate (0 = Off, 1 = On)
  const rpwRaw = raw['RPW'] !== undefined ? parseInt(String(raw['RPW']), 16) : 0;
  const asvBackupRate = rpwRaw === 1;

  // RSA: AutoEPAP (0 = Off, 1 = On)
  const autoEpap = raw['RSA'] !== undefined ? parseInt(String(raw['RSA']), 16) === 1 : undefined;

  // RDF: AutoEPAP Min EPAP (hex value / 50.0 -> cmH2O)
  let autoEpapMinEpap: number | undefined;
  if (raw['RDF'] !== undefined) {
    const rdfVal = parseInt(String(raw['RDF']), 16);
    if (!isNaN(rdfVal) && rdfVal > 0 && rdfVal !== 0xffff) {
      autoEpapMinEpap = Math.round((rdfVal / 50.0) * 10) / 10;
    }
  }

  // RDM: AutoEPAP Max EPAP (hex value / 50.0 -> cmH2O)
  let autoEpapMaxEpap: number | undefined;
  if (raw['RDM'] !== undefined) {
    const rdmVal = parseInt(String(raw['RDM']), 16);
    if (!isNaN(rdmVal) && rdmVal > 0 && rdmVal !== 0xffff) {
      autoEpapMaxEpap = Math.round((rdmVal / 50.0) * 10) / 10;
    }
  }

  // RCW: Fall Time (in 8ms ticks)
  let fallTime: number | undefined;
  if (raw['RCW'] !== undefined) {
    const rcwVal = parseInt(String(raw['RCW']), 16);
    if (!isNaN(rcwVal) && rcwVal !== 0xffff) {
      fallTime = rcwVal;
    }
  }

  // RXW: ST iBR (0 = Off, 1 = On)
  const ibr = raw['RXW'] !== undefined ? parseInt(String(raw['RXW']), 16) === 1 : undefined;

  // RXF: Header Clock (0 = Off, 1 = On)
  const headerClock = raw['RXF'] !== undefined ? parseInt(String(raw['RXF']), 16) === 1 : undefined;

  // RXH: Monitoring (0 = Off, 1 = On)
  const monitoring = raw['RXH'] !== undefined ? parseInt(String(raw['RXH']), 16) === 1 : undefined;

  return {
    enabled,
    asvMax,
    asvSens: sensInfo.label,
    asvSensMultiplier: sensInfo.multiplier,
    ...(eps !== undefined ? { eps } : {}),
    ...(exhaleShape !== undefined ? { exhaleShape, exhaleShapeExponent } : {}),
    customTriggerCycle,
    squareWave,
    asvBackupRate,
    autoEpap,
    autoEpapMinEpap,
    autoEpapMaxEpap,
    fallTime,
    ibr,
    headerClock,
    monitoring,
    rawSettings: raw,
  };
}

/**
 * Format a clinical summary of Custom VAuto settings.
 */
export function formatCustomVAutoSummary(settings: CustomVAutoSettings): string {
  if (!settings.enabled) {
    return 'Custom VAuto: Disabled (Stock VAuto pressure shaping)';
  }

  const epsStr =
    settings.eps !== undefined
      ? ` | EPS: ${settings.eps === 0 ? 'Off' : `${settings.eps.toFixed(1)} cmH2O`}`
      : '';
  const shapeStr =
    settings.exhaleShape !== undefined ? ` | Exh. Shape: ${settings.exhaleShape}` : '';

  return (
    `Custom VAuto: Active | ASV Max: ${settings.asvMax.toFixed(1)} cmH2O | ` +
    `ASV Sens: ${settings.asvSens} (${settings.asvSensMultiplier.toFixed(2)}x)` +
    epsStr +
    shapeStr +
    ` | Custom T/C: ${settings.customTriggerCycle ? 'On' : 'Off'} | ` +
    `Square Wave: ${settings.squareWave ? 'On' : 'Off'}`
  );
}
