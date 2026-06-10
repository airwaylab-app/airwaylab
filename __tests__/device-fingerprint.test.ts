import { describe, it, expect } from 'vitest';
import { extractDeviceFingerprint } from '@/lib/device-fingerprint';

// Synthetic identifiers only — never real device serials/GUIDs in fixtures.
const SERIAL = '22200000001';
const GUID = '14ec73e2-0000-4000-8000-000000000000';

const RESMED10 =
  '\r\n#PNA AirCurve_10_VAuto\n\r\n#SRN ' +
  SERIAL +
  '\n\r\n#CID CX036-009-013-026-101-100-101\n\r\n#VID 0009\n\r\n#RID 000D';

const RESMED11 = JSON.stringify({
  FlowGenerator: {
    IdentificationProfiles: {
      Product: {
        UniversalIdentifier: GUID,
        SerialNumber: SERIAL,
        ProductName: 'AirCurve 11 VAuto',
        ModelNumber: '39000',
      },
    },
  },
});

describe('extractDeviceFingerprint', () => {
  it('parses ResMed 10 # code text: model + markers, serial isolated, no guid', () => {
    const fp = extractDeviceFingerprint(RESMED10);
    expect(fp.model).toBe('AirCurve_10_VAuto');
    expect(fp.serial).toBe(SERIAL);
    expect(fp.guid).toBeNull();
    expect(fp.firmwareMarkers.CID).toBe('CX036-009-013-026-101-100-101');
    expect(fp.firmwareMarkers.VID).toBe('0009');
  });

  it('parses ResMed 11 JSON: model + markers, serial + guid isolated', () => {
    const fp = extractDeviceFingerprint(RESMED11);
    expect(fp.model).toBe('AirCurve 11 VAuto');
    expect(fp.serial).toBe(SERIAL);
    expect(fp.guid).toBe(GUID);
    expect(fp.firmwareMarkers.ModelNumber).toBe('39000');
  });

  it('NEVER leaks the serial or guid into firmwareMarkers (privacy invariant)', () => {
    for (const sample of [RESMED10, RESMED11]) {
      const fp = extractDeviceFingerprint(sample);
      const markerBlob = JSON.stringify(fp.firmwareMarkers);
      expect(markerBlob).not.toContain(SERIAL);
      expect(markerBlob).not.toContain(GUID);
    }
  });

  it('recovers serial + guid from truncated JSON (stored text is capped at 2000 chars)', () => {
    // Cut a later field so JSON.parse fails but the serial/guid values stay intact —
    // mirrors the real 2000-char cap, which only ever clips trailing fields.
    const truncated = RESMED11.slice(0, RESMED11.indexOf('ModelNumber'));
    const fp = extractDeviceFingerprint(truncated);
    expect(fp.serial).toBe(SERIAL);
    expect(fp.guid).toBe(GUID);
  });

  it('returns safe defaults for empty/absent input', () => {
    for (const v of [null, undefined, '', '   ']) {
      const fp = extractDeviceFingerprint(v);
      expect(fp).toEqual({ model: 'Unknown', firmwareMarkers: {}, serial: null, guid: null });
    }
  });

  it('falls back to a model hint from free text', () => {
    const fp = extractDeviceFingerprint('garbage AirSense garbage');
    expect(fp.model).toBe('AirSense');
    expect(fp.serial).toBeNull();
  });
});
