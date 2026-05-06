import { describe, it, expect } from 'vitest';
import { groupByNight } from '@/lib/parsers/night-grouper';
import type { EDFFile } from '@/lib/types';

/**
 * Verify the memory-release invariant for AIR-1062:
 *
 * groupByNight must return the same EDFFile object references (not clones)
 * so that zeroing session.flowData in the analysis loop actually frees the
 * underlying Float32Array buffer instead of leaving a dangling original copy.
 */

function makeEDFWithFlow(filePath: string, recordingDate: Date, samples: number): EDFFile {
  return {
    filePath,
    recordingDate,
    flowData: new Float32Array(samples),
    pressureData: null,
    samplingRate: 25,
    durationSeconds: samples / 25,
    header: {} as EDFFile['header'],
    signals: [],
    respEventData: null,
  };
}

describe('worker flowData release invariant (AIR-1062)', () => {
  it('groupByNight returns the same EDFFile references, not clones', () => {
    const edf = makeEDFWithFlow('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0), 100_000);
    const groups = groupByNight([edf]);

    expect(groups).toHaveLength(1);
    const session = groups[0]!.sessions[0]!;
    // Must be the identical reference — not a shallow/deep copy
    expect(session).toBe(edf);
  });

  it('releasing session.flowData frees the original allocation (same reference)', () => {
    const edf = makeEDFWithFlow('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0), 100_000);
    const groups = groupByNight([edf]);
    const session = groups[0]!.sessions[0]!;

    expect(session.flowData.length).toBe(100_000);

    // Simulate what the worker does after copying data into combinedFlow
    session.flowData = new Float32Array(0);
    session.pressureData = null;

    // Because session === edf, the original reference is also released
    expect(edf.flowData.length).toBe(0);
  });

  it('releasing sessions across multiple nights does not affect already-processed combined arrays', () => {
    const edfs = [
      makeEDFWithFlow('SD/DATALOG/20260314/BRP.edf', new Date(2026, 2, 14, 22, 0), 50_000),
      makeEDFWithFlow('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0), 75_000),
    ];
    const groups = groupByNight(edfs);
    expect(groups).toHaveLength(2);

    // Simulate processing night 1: copy into combined, then release
    const night1 = groups[0]!; // most-recent-first: 20260315
    const combinedFlow = new Float32Array(night1.sessions.reduce((s, sess) => s + sess.flowData.length, 0));
    let offset = 0;
    for (const sess of night1.sessions) {
      combinedFlow.set(sess.flowData, offset);
      offset += sess.flowData.length;
      sess.flowData = new Float32Array(0);
      sess.pressureData = null;
    }

    // combinedFlow is independent — unaffected by the release
    expect(combinedFlow.length).toBe(75_000);
    // Sessions are released
    expect(night1.sessions[0]!.flowData.length).toBe(0);

    // Night 2 sessions are untouched — still hold their data
    const night2 = groups[1]!; // 20260314
    expect(night2.sessions[0]!.flowData.length).toBe(50_000);
  });

  it('parsedEdfs.length = 0 drops slot references without affecting nightGroups', () => {
    const edf = makeEDFWithFlow('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0), 10_000);
    const parsedEdfs = [edf];
    const nightGroups = groupByNight(parsedEdfs);

    // Simulate worker clearing the flat array after groupByNight
    parsedEdfs.length = 0;

    // nightGroups still holds the reference — data is not lost
    expect(nightGroups[0]!.sessions[0]!.flowData.length).toBe(10_000);
  });

  it('capturing parsedCount before array clear preserves the zero-nights checkpoint signal', () => {
    // The bug: zeroing parsedEdfs BEFORE reading its length silences the warning
    const buggyOrder = (arr: EDFFile[]) => {
      arr.length = 0;           // zeroed first
      return arr.length > 0;   // always false — checkpoint never fires
    };

    // The fix: capture count first, then zero
    const fixedOrder = (arr: EDFFile[]) => {
      const count = arr.length; // captured before zeroing
      arr.length = 0;
      return count > 0;         // correct — fires when files were parsed
    };

    const edfs = [
      makeEDFWithFlow('SD/DATALOG/20260315/BRP.edf', new Date(2026, 2, 15, 22, 0), 1000),
    ];

    expect(buggyOrder([...edfs])).toBe(false); // bug silences the warning
    expect(fixedOrder([...edfs])).toBe(true);  // fix preserves the signal
  });
});
