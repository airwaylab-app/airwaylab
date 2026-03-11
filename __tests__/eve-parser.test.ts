import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseEVE, type MachineEvent } from '@/lib/parsers/eve-parser';
import { filterEVEFiles } from '@/lib/parsers/night-grouper';

const FIXTURES_DIR = join(__dirname, 'fixtures/sd-card/DATALOG');

function readFixture(relativePath: string): ArrayBuffer {
  const buf = readFileSync(join(FIXTURES_DIR, relativePath));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe('EVE Parser', () => {
  describe('parseEVE — Obstructive Apnea fixture', () => {
    it('extracts Obstructive Apnea events with correct onset and duration', () => {
      const buffer = readFixture('20260111/20260111_210642_EVE.edf');
      const events = parseEVE(buffer);

      expect(events.length).toBe(4);

      for (const event of events) {
        expect(event.type).toBe('obstructive-apnea');
        expect(event.rawLabel).toBe('Obstructive Apnea');
        expect(event.onsetSec).toBeGreaterThan(0);
        expect(event.durationSec).toBeGreaterThan(0);
      }
    });

    it('returns events sorted by onset', () => {
      const buffer = readFixture('20260111/20260111_210642_EVE.edf');
      const events = parseEVE(buffer);

      for (let i = 1; i < events.length; i++) {
        expect(events[i].onsetSec).toBeGreaterThanOrEqual(events[i - 1].onsetSec);
      }
    });

    it('has expected onset values from hexdump analysis', () => {
      const buffer = readFixture('20260111/20260111_210642_EVE.edf');
      const events = parseEVE(buffer);

      // From hexdump: +11954, +22791, +26424, +29628
      expect(events[0].onsetSec).toBe(11954);
      expect(events[1].onsetSec).toBe(22791);
      expect(events[2].onsetSec).toBe(26424);
      expect(events[3].onsetSec).toBe(29628);
    });

    it('has expected duration values', () => {
      const buffer = readFixture('20260111/20260111_210642_EVE.edf');
      const events = parseEVE(buffer);

      // From hexdump: 10, 13, 11, 14
      expect(events[0].durationSec).toBe(10);
      expect(events[1].durationSec).toBe(13);
      expect(events[2].durationSec).toBe(11);
      expect(events[3].durationSec).toBe(14);
    });
  });

  describe('parseEVE — Unclassified Apnea fixture', () => {
    it('normalises generic "Apnea" label to unclassified-apnea', () => {
      const buffer = readFixture('20260309/20260310_000154_EVE.edf');
      const events = parseEVE(buffer);

      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.type).toBe('unclassified-apnea');
        expect(event.rawLabel).toBe('Apnea');
      }
    });

    it('has expected onset values from hexdump analysis', () => {
      const buffer = readFixture('20260309/20260310_000154_EVE.edf');
      const events = parseEVE(buffer);

      // From hexdump: first events at +3960, +7831, +10183, +11860, ...
      expect(events[0].onsetSec).toBe(3960);
      expect(events[1].onsetSec).toBe(7831);
      expect(events[2].onsetSec).toBe(10183);
    });
  });

  describe('parseEVE — Recording starts annotation', () => {
    it('skips "Recording starts" annotation', () => {
      // Both fixtures have a "Recording starts" annotation — it should be excluded
      const buffer = readFixture('20260111/20260111_210642_EVE.edf');
      const events = parseEVE(buffer);

      for (const event of events) {
        expect(event.rawLabel).not.toBe('Recording starts');
      }
    });
  });

  describe('parseEVE — error resilience', () => {
    it('returns empty array for truncated buffer', () => {
      const events = parseEVE(new ArrayBuffer(10));
      expect(events).toEqual([]);
    });

    it('returns empty array for empty buffer', () => {
      const events = parseEVE(new ArrayBuffer(0));
      expect(events).toEqual([]);
    });

    it('returns empty array for buffer with valid header but no annotations signal', () => {
      // Create a minimal EDF header with no EDF Annotations signal
      const buf = new ArrayBuffer(768);
      const view = new Uint8Array(buf);
      const encoder = new TextEncoder();
      // version
      view.set(encoder.encode('0       '), 0);
      // numSignals = 1
      view.set(encoder.encode('1   '), 252);
      // signal label = "SomeOther"
      view.set(encoder.encode('SomeOther       '), 256);
      // headerBytes
      view.set(encoder.encode('512     '), 184);
      // numDataRecords
      view.set(encoder.encode('0       '), 236);
      // recordDuration
      view.set(encoder.encode('0.00    '), 244);

      const events = parseEVE(buf);
      expect(events).toEqual([]);
    });
  });

  describe('parseEVE — unknown labels', () => {
    it('skips events with unrecognised annotation labels', () => {
      // All fixtures should only return recognised event types
      const buffer = readFixture('20260309/20260310_000154_EVE.edf');
      const events = parseEVE(buffer);

      const validTypes = ['obstructive-apnea', 'central-apnea', 'hypopnea', 'unclassified-apnea'];
      for (const event of events) {
        expect(validTypes).toContain(event.type);
      }
    });
  });
});

describe('filterEVEFiles', () => {
  it('matches _EVE.edf files', () => {
    const files = [
      { name: '20260111_210642_EVE.edf', path: 'DATALOG/20260111/20260111_210642_EVE.edf', size: 1000 },
      { name: '20260111_210642_BRP.edf', path: 'DATALOG/20260111/20260111_210642_BRP.edf', size: 500000 },
      { name: 'STR.edf', path: 'STR.edf', size: 10000 },
    ];

    const result = filterEVEFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('20260111_210642_EVE.edf');
  });

  it('matches case-insensitively', () => {
    const files = [
      { name: '20260111_210642_eve.edf', path: 'test/20260111_210642_eve.edf', size: 500 },
      { name: '20260111_210642_EVE.EDF', path: 'test/20260111_210642_EVE.EDF', size: 500 },
    ];

    const result = filterEVEFiles(files);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no EVE files', () => {
    const files = [
      { name: 'BRP.edf', path: 'test/BRP.edf', size: 500000 },
      { name: 'STR.edf', path: 'test/STR.edf', size: 10000 },
    ];

    const result = filterEVEFiles(files);
    expect(result).toHaveLength(0);
  });

  it('does not match partial EVE in filename', () => {
    const files = [
      { name: 'EVELYN.edf', path: 'test/EVELYN.edf', size: 500 },
      { name: 'PREVENT_EVE.edf', path: 'test/PREVENT_EVE.edf', size: 500 },
    ];

    // PREVENT_EVE.edf ends with EVE.edf so it should match
    // EVELYN.edf does not end with EVE.edf
    const result = filterEVEFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('PREVENT_EVE.edf');
  });
});
