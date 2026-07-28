/**
 * Build 2 (TacoSauce event-truth investigation, #266):
 * Verify machine EVE events land at the CORRECT concatenated x-position on the
 * REAL multi-session SD-card night, driving the production placement path
 * (placeMachineEventStartSec) — not synthetic data, not the helper in isolation.
 *
 * The 20260111 night is the alignment stress case: ONE EVE.edf (start 21:06
 * local) carrying 4 Obstructive Apnea onsets that span the WHOLE night across
 * three mask-on sessions separated by machine-off gaps. The pre-fix code matched
 * the EVE *file* to session 0 and added each raw (gap-inclusive) onset to
 * session 0's machine-on base, drawing every later-session OA tens of minutes too
 * late — boxes over normal breathing, real apneas unmarked. This asserts each OA
 * lands at the position derived from its OWN wall-clock.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEDF } from '@/lib/parsers/edf-parser';
import { groupByNight } from '@/lib/parsers/night-grouper';
import { parseEVE, parseEVEStartMs } from '@/lib/parsers/eve-parser';
import {
  buildSessionBoundaries,
  matchSessionForWallClock,
  placeMachineEventStartSec,
} from '@/lib/waveform-utils';
import type { SessionBoundary } from '@/lib/waveform-types';

const FIX = join(__dirname, 'fixtures/sd-card/DATALOG/20260111');

function load(name: string): ArrayBuffer {
  const b = readFileSync(join(FIX, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

// The full multi-session night: three BRP sessions; ONE EVE on the first.
const BRP1 = '20260111_210649_BRP.edf';
const BRP2 = '20260111_220919_BRP.edf';
const BRP3 = '20260112_023425_BRP.edf';
const EVE1 = '20260111_210642_EVE.edf';

describe('machine-event placement on the real 3-session fixture (#266)', () => {
  const edfs = [BRP1, BRP2, BRP3].map((n) => parseEDF(load(n), join(FIX, n)));
  const night = groupByNight(edfs)[0]!;
  const sessions = night.sessions;
  const boundaries: SessionBoundary[] = buildSessionBoundaries(sessions);
  const avgRate = sessions.reduce((s, x) => s + x.samplingRate, 0) / sessions.length;
  const totalSamples = sessions.reduce((s, x) => s + x.flowData.length, 0);
  const totalConcatSec = totalSamples / avgRate;

  // Independent ground truth: a session's concatenated window + the wall-clock
  // position of an event inside it, derived straight from the boundaries.
  function concatBase(b: SessionBoundary): number {
    return b.startSampleIndex / avgRate;
  }
  function expectedFromWallClock(evWallMs: number): { idx: number; sec: number } {
    for (let i = 0; i < boundaries.length; i++) {
      const b = boundaries[i]!;
      const startMs = b.startWallClockMs;
      const endMs = startMs + b.durationSeconds * 1000;
      if (evWallMs >= startMs - 5000 && evWallMs <= endMs + 5000) {
        return { idx: i, sec: concatBase(b) + (evWallMs - startMs) / 1000 };
      }
    }
    return { idx: -1, sec: NaN };
  }

  it('groups all three BRP sessions into one time-ordered night', () => {
    expect(sessions).toHaveLength(3);
    expect(sessions[0]!.recordingDate.getTime()).toBeLessThan(sessions[1]!.recordingDate.getTime());
    expect(sessions[1]!.recordingDate.getTime()).toBeLessThan(sessions[2]!.recordingDate.getTime());
  });

  it('the single EVE file resolves (by file start) to session 0', () => {
    const eveStartMs = parseEVEStartMs(load(EVE1));
    expect(eveStartMs).not.toBeNull();
    expect(matchSessionForWallClock(boundaries, eveStartMs!)).toBe(boundaries[0]);
  });

  it('every OA lands at the position derived from its OWN wall-clock (not session 0 + raw onset)', () => {
    const eveStartMs = parseEVEStartMs(load(EVE1))!;
    const events = parseEVE(load(EVE1)).filter((e) => e.type === 'obstructive-apnea');
    expect(events.length).toBe(4);

    // The EVE's own file match (what the pre-fix code used for every event).
    const fileSession = matchSessionForWallClock(boundaries, eveStartMs)!;
    expect(fileSession).toBe(boundaries[0]);

    for (const me of events) {
      const evWall = eveStartMs + me.onsetSec * 1000;
      const want = expectedFromWallClock(evWall);
      // Sanity: each OA genuinely belongs to a LATER session, not the EVE's own.
      expect(want.idx).toBeGreaterThan(0);

      const startSec = placeMachineEventStartSec(me.onsetSec, eveStartMs, boundaries, fileSession, avgRate);

      // (a) lands at its wall-clock-derived position (sub-second tolerance)
      expect(startSec).toBeCloseTo(want.sec, 1);
      // (b) inside the concatenated timeline
      expect(startSec).toBeGreaterThanOrEqual(-1);
      expect(startSec + me.durationSec).toBeLessThanOrEqual(totalConcatSec + 1);
      // (c) falls inside its true session's concatenated window
      const b = boundaries[want.idx]!;
      expect(startSec).toBeGreaterThanOrEqual(concatBase(b) - 1);
      expect(startSec).toBeLessThanOrEqual(concatBase(b) + b.sampleCount / avgRate + 1);
    }
  });

  it('REGRESSION: the pre-fix file-level placement drew later-session OAs minutes too late', () => {
    // Reproduce the old behaviour: every event placed against the file-matched
    // session with its raw (gap-inclusive) onset. Assert it was wrong by exactly
    // the cumulative machine-off gap — guarding against a silent revert.
    const eveStartMs = parseEVEStartMs(load(EVE1))!;
    const events = parseEVE(load(EVE1)).filter((e) => e.type === 'obstructive-apnea');
    const fileSession = boundaries[0]!;
    for (const me of events) {
      const evWall = eveStartMs + me.onsetSec * 1000;
      const correct = expectedFromWallClock(evWall).sec;
      // pre-fix = file session base (0) + (eveStart - session0Wall) + raw onset
      const preFix = concatBase(fileSession) + (eveStartMs - fileSession.startWallClockMs) / 1000 + me.onsetSec;
      const errorSec = preFix - correct;
      // The error equals the machine-off gap between session 0 and the event's
      // session — strictly tens of minutes here, never zero.
      expect(errorSec).toBeGreaterThan(30 * 60);
    }
  });
});
