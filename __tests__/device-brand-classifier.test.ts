import { describe, it, expect, vi } from 'vitest';
import { classifyBrand, type FileRef } from '@/lib/device-brand-classifier';

const refs = (paths: string[]): FileRef[] =>
  paths.map((p) => ({ name: p.split('/').pop() || p, path: p }));

describe('classifyBrand', () => {
  it('detects ResMed from DATALOG + BRP', () => {
    const r = classifyBrand(refs([
      'DATALOG/20260111/20260111_210649_BRP.edf',
      'STR.edf',
      'Identification.tgt',
    ]));
    expect(r.brand).toBe('resmed');
  });

  it('detects ResMed from STR.edf alone', () => {
    expect(classifyBrand(refs(['STR.edf'])).brand).toBe('resmed');
  });

  it('detects BMC from the numeric SERIAL.idx + SERIAL.000 triad', () => {
    const r = classifyBrand(refs(['12345678.idx', '12345678.000', '12345678.usr']));
    expect(r.brand).toBe('bmc');
  });

  it('returns unknown for an unrecognised brand and logs the signature', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = classifyBrand(refs(['P1/001.001', 'P1/002.002', 'SETTINGS.BIN']));
    expect(r.brand).toBe('unknown');
    expect(warn).toHaveBeenCalledWith(
      '[brand-classifier] unmatched device signature',
      expect.objectContaining({ fileCount: 3 }),
    );
    warn.mockRestore();
  });

  it('always returns an auditable signature (extensions, folders, count)', () => {
    const r = classifyBrand(refs(['DATALOG/x/y_BRP.edf', 'STR.edf']));
    expect(r.signature.fileCount).toBe(2);
    expect(r.signature.extensions.edf).toBe(2);
    expect(r.signature.folders).toContain('DATALOG/X');
  });

  it('does not crash and stays quiet on an empty upload', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = classifyBrand([]);
    expect(r.brand).toBe('unknown');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
