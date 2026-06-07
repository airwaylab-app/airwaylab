import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const PEPPER = 'test-pepper-do-not-use-in-prod';

describe('hashDeviceSerial', () => {
  beforeEach(() => {
    process.env.DEVICE_ID_PEPPER = PEPPER;
  });
  afterEach(() => {
    delete process.env.DEVICE_ID_PEPPER;
  });

  async function load() {
    const mod = await import('@/lib/device-id');
    return mod.hashDeviceSerial;
  }

  it('is stable: same serial -> same key', async () => {
    const hash = await load();
    expect(hash('22200000001')).toBe(hash('22200000001'));
  });

  it('distinguishes different serials', async () => {
    const hash = await load();
    expect(hash('22200000001')).not.toBe(hash('23100000002'));
  });

  it('returns null for absent or blank serials (never hashes nothing)', async () => {
    const hash = await load();
    expect(hash(null)).toBeNull();
    expect(hash(undefined)).toBeNull();
    expect(hash('')).toBeNull();
    expect(hash('   ')).toBeNull();
  });

  it('trims surrounding whitespace so formatting variance maps to one key', async () => {
    const hash = await load();
    expect(hash('  22200000001 ')).toBe(hash('22200000001'));
  });

  it('does not return the raw serial', async () => {
    const hash = await load();
    const out = hash('22200000001');
    expect(out).not.toBeNull();
    expect(out).not.toContain('22200000001');
  });

  it('changes with the pepper (so a leaked DB without the pepper cannot be re-linked)', async () => {
    const hash1 = await load();
    const a = hash1('22200000001');

    process.env.DEVICE_ID_PEPPER = 'a-different-pepper';
    const { hashDeviceSerial: hash2 } = await import('@/lib/device-id');
    const b = hash2('22200000001');

    expect(a).not.toBe(b);
  });

  it('throws (fails loud) when the pepper is not configured', async () => {
    delete process.env.DEVICE_ID_PEPPER;
    const hash = await load();
    expect(() => hash('22200000001')).toThrow(/DEVICE_ID_PEPPER/);
  });
});
