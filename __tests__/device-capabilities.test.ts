import { describe, it, expect } from 'vitest';
import {
  isValidDeviceMode,
  getDeviceCapability,
  DEVICE_CAPABILITIES,
} from '@/lib/device-capabilities';

describe('DEVICE_CAPABILITIES', () => {
  it('has entries for all expected device families', () => {
    const patterns = DEVICE_CAPABILITIES.map((e) => e.pattern);
    expect(patterns).toContain('AirCurve 11 VAuto');
    expect(patterns).toContain('AirCurve 11 ASV');
    expect(patterns).toContain('AirCurve 10 VAuto');
    expect(patterns).toContain('AirCurve 10 ASV');
    expect(patterns).toContain('AirCurve 10 ST-A');
    expect(patterns).toContain('AirSense 10 AutoSet');
    expect(patterns).toContain('AirSense 10 Elite');
    expect(patterns).toContain('AirSense 11 AutoSet');
    expect(patterns).toContain('AirSense 11 Elite');
    expect(patterns).toContain('AirMini');
  });

  it('every entry has at least CPAP as a supported mode', () => {
    for (const entry of DEVICE_CAPABILITIES) {
      expect(entry.supportedModes.has('CPAP')).toBe(true);
    }
  });
});

describe('isValidDeviceMode', () => {
  // -- Valid combinations --
  it('returns true for AirSense 10 AutoSet in CPAP mode', () => {
    expect(isValidDeviceMode('AirSense 10 AutoSet', 'CPAP')).toBe(true);
  });

  it('returns true for AirSense 10 AutoSet in APAP mode', () => {
    expect(isValidDeviceMode('AirSense 10 AutoSet', 'APAP')).toBe(true);
  });

  it('returns true for AirSense 10 AutoSet in AutoSet mode', () => {
    expect(isValidDeviceMode('AirSense 10 AutoSet', 'AutoSet')).toBe(true);
  });

  it('returns true for AirCurve 10 ST-A in iVAPS mode', () => {
    expect(isValidDeviceMode('AirCurve 10 ST-A', 'iVAPS')).toBe(true);
  });

  it('returns true for AirCurve 11 ASV in ASVAuto mode', () => {
    expect(isValidDeviceMode('AirCurve 11 ASV', 'ASVAuto')).toBe(true);
  });

  it('returns true for AirCurve 10 VAuto in BiPAP Auto mode', () => {
    expect(isValidDeviceMode('AirCurve 10 VAuto', 'BiPAP Auto')).toBe(true);
  });

  it('returns true for AirMini in APAP mode', () => {
    expect(isValidDeviceMode('AirMini', 'APAP')).toBe(true);
  });

  it('returns true for AirSense 11 Elite in CPAP mode', () => {
    expect(isValidDeviceMode('AirSense 11 Elite', 'CPAP')).toBe(true);
  });

  // -- Invalid combinations --
  it('returns false for AirSense 10 AutoSet in ASV mode', () => {
    expect(isValidDeviceMode('AirSense 10 AutoSet', 'ASV')).toBe(false);
  });

  it('returns false for AirSense 10 Elite in APAP mode', () => {
    expect(isValidDeviceMode('AirSense 10 Elite', 'APAP')).toBe(false);
  });

  it('returns false for AirSense 11 Elite in APAP mode', () => {
    expect(isValidDeviceMode('AirSense 11 Elite', 'APAP')).toBe(false);
  });

  it('returns false for AirCurve 11 VAuto in iVAPS mode', () => {
    expect(isValidDeviceMode('AirCurve 11 VAuto', 'iVAPS')).toBe(false);
  });

  it('returns false for AirCurve 11 VAuto in ASV mode', () => {
    expect(isValidDeviceMode('AirCurve 11 VAuto', 'ASV')).toBe(false);
  });

  it('returns false for AirCurve 10 VAuto in iVAPS mode', () => {
    expect(isValidDeviceMode('AirCurve 10 VAuto', 'iVAPS')).toBe(false);
  });

  it('returns false for AirCurve 10 ASV in BiPAP mode', () => {
    expect(isValidDeviceMode('AirCurve 10 ASV', 'BiPAP')).toBe(false);
  });

  it('returns false for AirMini in ASV mode', () => {
    expect(isValidDeviceMode('AirMini', 'ASV')).toBe(false);
  });

  it('returns false for AirMini in iVAPS mode', () => {
    expect(isValidDeviceMode('AirMini', 'iVAPS')).toBe(false);
  });

  // -- Unknown/missing device model: always valid --
  it('returns true for unknown device model', () => {
    expect(isValidDeviceMode('SomeBrandXYZ', 'ASV')).toBe(true);
  });

  it('returns true for empty device model', () => {
    expect(isValidDeviceMode('', 'ASV')).toBe(true);
  });

  it('returns true for "Unknown" device model', () => {
    expect(isValidDeviceMode('Unknown', 'ASV')).toBe(true);
  });

  // -- Missing mode: always valid --
  it('returns true when papMode is empty', () => {
    expect(isValidDeviceMode('AirSense 10 Elite', '')).toBe(true);
  });

  // -- Case insensitivity on device model --
  it('matches device model case-insensitively', () => {
    expect(isValidDeviceMode('AIRSENSE 10 AUTOSET', 'CPAP')).toBe(true);
    expect(isValidDeviceMode('airsense 10 autoset', 'ASV')).toBe(false);
  });

  // -- Substring matching for realistic model strings --
  it('matches when model string contains extra text', () => {
    // Identification.tgt may return longer strings like "ResMed AirSense 10 AutoSet 37028"
    expect(isValidDeviceMode('ResMed AirSense 10 AutoSet 37028', 'CPAP')).toBe(true);
    expect(isValidDeviceMode('ResMed AirSense 10 AutoSet 37028', 'ASV')).toBe(false);
  });

  // -- Specificity: more specific pattern should match first --
  it('matches AirCurve 10 ST-A before a hypothetical AirCurve 10 fallback', () => {
    // ST-A supports iVAPS, regular AirCurve 10 VAuto does not
    expect(isValidDeviceMode('AirCurve 10 ST-A', 'iVAPS')).toBe(true);
  });

  it('matches AirCurve 10 ASV before AirCurve 10 VAuto', () => {
    // ASV model supports ASV mode, VAuto does not
    expect(isValidDeviceMode('AirCurve 10 ASV', 'ASV')).toBe(true);
    expect(isValidDeviceMode('AirCurve 10 VAuto', 'ASV')).toBe(false);
  });
});

describe('getDeviceCapability', () => {
  it('returns capability entry for known device', () => {
    const cap = getDeviceCapability('AirSense 10 AutoSet');
    expect(cap).not.toBeNull();
    expect(cap!.pattern).toBe('AirSense 10 AutoSet');
    expect(cap!.supportedModes.has('CPAP')).toBe(true);
    expect(cap!.supportedModes.has('APAP')).toBe(true);
  });

  it('returns null for unknown device', () => {
    expect(getDeviceCapability('SomeBrandXYZ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getDeviceCapability('')).toBeNull();
  });

  it('matches with extra text in model string', () => {
    const cap = getDeviceCapability('ResMed AirCurve 11 ASV');
    expect(cap).not.toBeNull();
    expect(cap!.pattern).toBe('AirCurve 11 ASV');
  });
});
