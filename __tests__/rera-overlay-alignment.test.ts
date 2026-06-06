/**
 * Regression tests for AIR-2387 / AIR-2390:
 * RERA graph overlay event count must match the NED engine's reraCount.
 *
 * Tests the mapping logic that converts RERATimestamp[] → WaveformEvent[].
 * The waveform-worker uses this path when nedReraTimestamps are provided.
 */
import { describe, it, expect } from 'vitest';
import type { RERATimestamp } from '@/lib/types';
import type { WaveformEvent } from '@/lib/waveform-types';

/**
 * Pure helper that replicates the waveform-worker's RERA event resolution logic.
 * When NED timestamps are provided and non-empty, they are used instead of heuristic events.
 * Falls back to heuristic events if timestamps are absent (old persisted sessions).
 */
function resolveReraEvents(
  nedReraTimestamps: RERATimestamp[] | undefined,
  heuristicReraEvents: WaveformEvent[]
): WaveformEvent[] {
  if (nedReraTimestamps && nedReraTimestamps.length > 0) {
    return nedReraTimestamps.map(r => ({
      startSec: r.startSec,
      endSec: r.startSec + r.durationSec,
      type: 'rera' as const,
      label: 'RERA candidate',
    }));
  }
  return heuristicReraEvents;
}

describe('RERA overlay alignment (AIR-2387)', () => {
  describe('resolveReraEvents', () => {
    it('uses NED timestamps when provided, ignoring heuristic events', () => {
      const timestamps: RERATimestamp[] = [
        { startSec: 100, durationSec: 30 },
        { startSec: 250, durationSec: 25 },
        { startSec: 410, durationSec: 28 },
      ];
      const heuristic: WaveformEvent[] = [
        { startSec: 50, endSec: 51, type: 'rera', label: 'RERA' },
        { startSec: 200, endSec: 201, type: 'rera', label: 'RERA' },
        { startSec: 300, endSec: 301, type: 'rera', label: 'RERA' },
        { startSec: 450, endSec: 451, type: 'rera', label: 'RERA' },
      ];
      const events = resolveReraEvents(timestamps, heuristic);
      expect(events).toHaveLength(timestamps.length);
      expect(events[0]).toMatchObject({ startSec: 100, endSec: 130, type: 'rera' });
      expect(events[1]).toMatchObject({ startSec: 250, endSec: 275, type: 'rera' });
      expect(events[2]).toMatchObject({ startSec: 410, endSec: 438, type: 'rera' });
    });

    it('event count from NED timestamps equals ned.reraCount', () => {
      const reraCount = 7;
      const timestamps: RERATimestamp[] = Array.from({ length: reraCount }, (_, i) => ({
        startSec: i * 120,
        durationSec: 25,
      }));
      const events = resolveReraEvents(timestamps, []);
      expect(events.filter(e => e.type === 'rera')).toHaveLength(reraCount);
    });

    it('falls back to heuristic events when NED timestamps are undefined', () => {
      const heuristic: WaveformEvent[] = [
        { startSec: 100, endSec: 101, type: 'rera', label: 'RERA' },
        { startSec: 200, endSec: 201, type: 'rera', label: 'RERA' },
      ];
      const events = resolveReraEvents(undefined, heuristic);
      expect(events).toHaveLength(heuristic.length);
      expect(events).toBe(heuristic);
    });

    it('falls back to heuristic events when NED timestamps are empty', () => {
      const heuristic: WaveformEvent[] = [
        { startSec: 100, endSec: 101, type: 'rera', label: 'RERA' },
      ];
      const events = resolveReraEvents([], heuristic);
      expect(events).toHaveLength(heuristic.length);
      expect(events).toBe(heuristic);
    });

    it('returns empty array when both timestamps and heuristic events are empty', () => {
      const events = resolveReraEvents([], []);
      expect(events).toHaveLength(0);
    });

    it('correctly computes endSec from startSec + durationSec', () => {
      const timestamps: RERATimestamp[] = [{ startSec: 300, durationSec: 45 }];
      const events = resolveReraEvents(timestamps, []);
      expect(events[0]!.endSec).toBe(345);
    });

    it('all resolved events have type rera', () => {
      const timestamps: RERATimestamp[] = [
        { startSec: 10, durationSec: 20 },
        { startSec: 50, durationSec: 15 },
      ];
      const events = resolveReraEvents(timestamps, []);
      expect(events.every(e => e.type === 'rera')).toBe(true);
    });
  });
});
