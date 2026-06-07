import { describe, it, expect } from 'vitest';
import {
  buildSessionBoundaries,
  sessionBreaks,
  formatGapDuration,
  wallClockForElapsed,
  wallClockTickShort,
  insertBreakRows,
  formatWallClockTime,
  formatElapsedTimeShort,
} from '@/lib/waveform-utils';
import type { SessionBoundary } from '@/lib/waveform-types';

// A night where the machine was turned off mid-night (bug #1019):
//   Session 1 — 22:00 local, 1h on  → 90000 samples @ 25 Hz
//   Machine OFF 2h 13m (7980 s)
//   Session 2 — 01:13 local (+1d), 30m on → 45000 samples
const RATE = 25;
const s1Start = new Date(2026, 2, 15, 22, 0, 0);
const s2Start = new Date(2026, 2, 16, 1, 13, 0);
const sessions = [
  { flowData: { length: 90000 }, recordingDate: s1Start, durationSeconds: 3600 },
  { flowData: { length: 45000 }, recordingDate: s2Start, durationSeconds: 1800 },
];
const boundaries: SessionBoundary[] = buildSessionBoundaries(sessions);

describe('buildSessionBoundaries', () => {
  it('records the running sample offset + wall-clock start per session', () => {
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]).toEqual({
      startSampleIndex: 0, sampleCount: 90000, startWallClockMs: s1Start.getTime(), durationSeconds: 3600,
    });
    expect(boundaries[1]).toEqual({
      startSampleIndex: 90000, sampleCount: 45000, startWallClockMs: s2Start.getTime(), durationSeconds: 1800,
    });
  });
});

describe('sessionBreaks', () => {
  it('returns one interior break at the session-2 start with the real off-duration', () => {
    const breaks = sessionBreaks(boundaries, RATE);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]!.tSec).toBeCloseTo(3600, 3);   // 90000 / 25
    expect(breaks[0]!.offSeconds).toBeCloseTo(7980, 3); // 2h 13m off
  });

  it('is empty for a single-session night or missing boundaries', () => {
    expect(sessionBreaks(boundaries.slice(0, 1), RATE)).toEqual([]);
    expect(sessionBreaks(undefined, RATE)).toEqual([]);
  });
});

describe('formatGapDuration', () => {
  it('formats compactly', () => {
    expect(formatGapDuration(7980)).toBe('2h 13m');
    expect(formatGapDuration(480)).toBe('8m');
    expect(formatGapDuration(0)).toBe('0m');
  });
});

describe('wallClockForElapsed (the timestamp fix)', () => {
  it('anchors a session-2 sample to session-2 wall-clock, not session-1 + elapsed', () => {
    const t = 4200; // 10 min into session 2 (boundary at 3600)
    const got = wallClockForElapsed(t, boundaries, RATE, s1Start);
    // session-aware: session-2 start + 600 s local
    expect(got).toBe(formatWallClockTime(s2Start, 600));
    // and crucially NOT the old single-anchor result (session-1 start + 4200 s) — that was the bug
    expect(got).not.toBe(formatWallClockTime(s1Start, t));
  });

  it('falls back to the single anchor when there are no session boundaries', () => {
    expect(wallClockForElapsed(600, undefined, RATE, s1Start)).toBe(formatWallClockTime(s1Start, 600));
  });
});

describe('wallClockTickShort', () => {
  it('shows session-2 clock time for a session-2 tick', () => {
    const expected = new Date(s2Start.getTime() + 600 * 1000)
      .toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    expect(wallClockTickShort(4200, boundaries, RATE, s1Start)).toBe(expected);
  });

  it('falls back to elapsed H:MM when no anchor is available', () => {
    expect(wallClockTickShort(1000, undefined, RATE, null)).toBe(formatElapsedTimeShort(1000));
  });
});

describe('insertBreakRows', () => {
  it('inserts a null break row at each boundary so the trace breaks', () => {
    const data = [
      { t: 0, flow: 1, pressure: 2 },
      { t: 3600, flow: 3, pressure: 4 },
    ];
    const out = insertBreakRows(data, [3600]);
    expect(out).toHaveLength(3);
    expect(out[1]).toEqual({ t: 3600, flow: null, pressure: null });
    expect(out[2]).toEqual({ t: 3600, flow: 3, pressure: 4 });
  });

  it('returns the data unchanged when there are no breaks', () => {
    const data = [{ t: 0, flow: 1, pressure: 2 }];
    expect(insertBreakRows(data, [])).toBe(data);
  });
});
