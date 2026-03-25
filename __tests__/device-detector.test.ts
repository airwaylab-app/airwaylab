import { describe, it, expect } from 'vitest';
import { detectDeviceType, getFileStructureMetadata } from '@/lib/parsers/device-detector';

function makeFile(name: string, path?: string, size = 1024): { name: string; path: string; size: number } {
  return { name, path: path ?? name, size };
}

describe('detectDeviceType', () => {
  it('identifies ResMed from DATALOG folder + BRP.edf files', () => {
    const files = [
      makeFile('20260320_001122_BRP.edf', 'DATALOG/20260320/20260320_001122_BRP.edf', 100000),
      makeFile('STR.edf', 'STR.edf'),
      makeFile('Identification.tgt', 'Identification.tgt'),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('resmed');
    expect(result.deviceLabel).toBe('ResMed');
  });

  it('identifies ResMed from BRP.edf even without DATALOG folder', () => {
    const files = [
      makeFile('BRP.edf', 'BRP.edf', 100000),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('resmed');
  });

  it('identifies BMC from serial.000 + serial.idx + serial.USR pattern', () => {
    const files = [
      makeFile('22734456.000', '22734456.000', 16777216),
      makeFile('22734456.001', '22734456.001', 16777216),
      makeFile('22734456.idx', '22734456.idx', 36000),
      makeFile('22734456.USR', '22734456.USR', 1000000),
      makeFile('22734456.evt', '22734456.evt', 250000),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('bmc');
    expect(result.bmcSerial).toBe('22734456');
    expect(result.deviceLabel).toBe('BMC / Luna');
  });

  it('identifies BMC from serial.000 + serial.USR (no .idx)', () => {
    const files = [
      makeFile('12345678.000', '12345678.000', 16777216),
      makeFile('12345678.USR', '12345678.USR', 1000000),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('bmc');
    expect(result.bmcSerial).toBe('12345678');
  });

  it('returns unknown for unrecognised file structure', () => {
    const files = [
      makeFile('data.bin', 'data.bin', 100000),
      makeFile('settings.xml', 'settings.xml'),
      makeFile('session1.dat', 'session1.dat'),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('unknown');
  });

  it('returns unknown for empty file list', () => {
    const result = detectDeviceType([]);
    expect(result.deviceType).toBe('unknown');
  });

  it('does not misidentify non-numeric .idx files as BMC', () => {
    const files = [
      makeFile('config.idx', 'config.idx'),
      makeFile('data.000', 'data.000'),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('unknown');
  });

  it('prioritises ResMed detection over BMC when both patterns present', () => {
    const files = [
      makeFile('BRP.edf', 'DATALOG/20260320/BRP.edf', 100000),
      makeFile('22734456.000', '22734456.000'),
      makeFile('22734456.idx', '22734456.idx'),
    ];
    const result = detectDeviceType(files);
    expect(result.deviceType).toBe('resmed');
  });
});

describe('getFileStructureMetadata', () => {
  it('counts extensions and total size', () => {
    const files = [
      makeFile('a.000', 'a.000', 1000),
      makeFile('a.001', 'a.001', 2000),
      makeFile('a.idx', 'a.idx', 500),
    ];
    const meta = getFileStructureMetadata(files);
    expect(meta.totalFiles).toBe(3);
    expect(meta.extensions['000']).toBe(1);
    expect(meta.extensions['001']).toBe(1);
    expect(meta.extensions['idx']).toBe(1);
    expect(meta.totalSizeBytes).toBe(3500);
  });
});
