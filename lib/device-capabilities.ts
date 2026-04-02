// ============================================================
// AirwayLab -- Device Model / Therapy Mode Capability Map
//
// Maps known ResMed device families to their supported therapy modes.
// Used to flag impossible device+mode combinations in contributed data
// (indicates a parser bug, not bad user data).
// ============================================================

/**
 * Each entry: a device model substring pattern mapped to the set of
 * papMode strings that device can actually run.
 *
 * Mode strings match the values produced by settings-extractor.ts MODE_MAP:
 *   CPAP, APAP, AutoSet, BiPAP, BiPAP Auto, ASV, ASVAuto, iVAPS
 *
 * Patterns are checked via case-insensitive substring match against the
 * deviceModel string from Identification.tgt parsing.
 *
 * Order matters: more specific patterns are listed first so the first
 * match wins (e.g. "AirCurve 10 ST-A" before "AirCurve 10").
 */
export const DEVICE_CAPABILITIES: ReadonlyArray<{
  pattern: string;
  supportedModes: ReadonlySet<string>;
}> = [
  // -- AirCurve 11 --
  {
    pattern: 'AirCurve 11 ASV',
    supportedModes: new Set(['CPAP', 'ASV', 'ASVAuto']),
  },
  {
    pattern: 'AirCurve 11 VAuto',
    supportedModes: new Set(['CPAP', 'BiPAP', 'BiPAP Auto']),
  },

  // -- AirCurve 10 --
  {
    pattern: 'AirCurve 10 ASV',
    supportedModes: new Set(['CPAP', 'ASV', 'ASVAuto']),
  },
  {
    pattern: 'AirCurve 10 ST-A',
    supportedModes: new Set(['CPAP', 'BiPAP', 'BiPAP Auto', 'iVAPS']),
  },
  {
    pattern: 'AirCurve 10 VAuto',
    supportedModes: new Set(['CPAP', 'BiPAP', 'BiPAP Auto']),
  },

  // -- AirSense 11 --
  {
    pattern: 'AirSense 11 AutoSet',
    supportedModes: new Set(['CPAP', 'APAP', 'AutoSet']),
  },
  {
    pattern: 'AirSense 11 Elite',
    supportedModes: new Set(['CPAP']),
  },

  // -- AirSense 10 --
  {
    pattern: 'AirSense 10 AutoSet',
    supportedModes: new Set(['CPAP', 'APAP', 'AutoSet']),
  },
  {
    pattern: 'AirSense 10 Elite',
    supportedModes: new Set(['CPAP']),
  },

  // -- AirMini --
  {
    pattern: 'AirMini',
    supportedModes: new Set(['CPAP', 'APAP', 'AutoSet']),
  },
];

/**
 * Check whether a device model + therapy mode combination is valid.
 *
 * Returns `true` (valid) when:
 *   - The device model matches a known pattern AND the mode is in its supported set
 *   - The device model does NOT match any known pattern (unknown device, can't validate)
 *   - The papMode is empty/missing (nothing to validate)
 *
 * Returns `false` (invalid) only when the device is recognised AND the
 * mode is definitively not supported by that device.
 */
export function isValidDeviceMode(deviceModel: string, papMode: string): boolean {
  if (!deviceModel || !papMode) return true;

  const modelLower = deviceModel.toLowerCase();

  for (const entry of DEVICE_CAPABILITIES) {
    if (modelLower.includes(entry.pattern.toLowerCase())) {
      return entry.supportedModes.has(papMode);
    }
  }

  // Unknown device -- can't validate, assume valid
  return true;
}

/**
 * Find the matching device capability entry for a given device model.
 * Returns null if no known device matches.
 */
export function getDeviceCapability(deviceModel: string): {
  pattern: string;
  supportedModes: ReadonlySet<string>;
} | null {
  if (!deviceModel) return null;

  const modelLower = deviceModel.toLowerCase();

  for (const entry of DEVICE_CAPABILITIES) {
    if (modelLower.includes(entry.pattern.toLowerCase())) {
      return entry;
    }
  }

  return null;
}
