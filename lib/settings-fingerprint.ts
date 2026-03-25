// ============================================================
// AirwayLab — Settings Fingerprint
// Encodes comparison-relevant BiPAP/CPAP settings into a hash
// for detecting settings changes across nights.
// ============================================================

import type { MachineSettings, SettingsFingerprint } from './types';

/**
 * Compute a settings fingerprint from MachineSettings.
 * Returns null if settings are unavailable or insufficient.
 */
export function computeFingerprint(settings: MachineSettings): SettingsFingerprint | null {
  if (!settings || settings.settingsSource === 'unavailable') return null;

  const epap = settings.epap;
  const ps = settings.pressureSupport;
  if (epap == null || ps == null || (epap <= 0 && ps <= 0)) return null;

  const cycle = settings.cycle ?? 'unknown';
  const rt = settings.riseTime ?? 0;
  const trigger = settings.trigger ?? 'unknown';
  const tiMax = settings.tiMax ?? 0;

  const hash = `E${epap}-PS${ps}-Cy${cycle}-RT${rt}-Tr${trigger}-TiMax${tiMax}`;

  return { epap, ps, cycle, riseTime: rt, triggerSensitivity: trigger, tiMax, hash };
}

/**
 * Detect which settings changed between two fingerprints.
 */
export function detectSettingsChanges(
  a: SettingsFingerprint | null,
  b: SettingsFingerprint | null
): SettingsChangeResult {
  if (!a || !b) return { changed: false, riseTime: false, ps: false, cycle: false, epap: false, label: '' };

  const riseTime = a.riseTime !== b.riseTime;
  const ps = a.ps !== b.ps;
  const cycle = a.cycle !== b.cycle;
  const epap = a.epap !== b.epap;
  const changed = riseTime || ps || cycle || epap;

  const parts: string[] = [];
  if (riseTime) parts.push(`RT ${a.riseTime}\u2192${b.riseTime}`);
  if (ps) parts.push(`PS ${a.ps}\u2192${b.ps}`);
  if (epap) parts.push(`EPAP ${a.epap}\u2192${b.epap}`);
  if (cycle) parts.push(`Cy ${a.cycle}\u2192${b.cycle}`);

  return { changed, riseTime, ps, cycle, epap, label: parts.join(', ') };
}

export interface SettingsChangeResult {
  changed: boolean;
  riseTime: boolean;
  ps: boolean;
  cycle: boolean;
  epap: boolean;
  label: string;
}
