// ============================================================
// AirwayLab — clearAllLocalData unit tests
// Verifies the non-destructive "Clear browser storage" remedy wipes BOTH
// the localStorage dashboard summary and every IndexedDB store, and that a
// localStorage failure never blocks the IndexedDB clear (which holds the
// bulk of the local footprint).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const clearSpy = vi.fn();
  const objectStore = vi.fn(() => ({ clear: clearSpy }));
  const runTxMock = vi.fn((_stores: unknown, _mode: unknown, fn: (tx: unknown) => unknown) => {
    fn({ objectStore });
    return Promise.resolve();
  });
  const clearPersistedNights = vi.fn();
  return { clearSpy, objectStore, runTxMock, clearPersistedNights };
});

vi.mock('@/lib/idb-core', () => ({
  runTx: h.runTxMock,
  WAVEFORM_STORE_NAME: 'waveforms',
  OXIMETRY_STORE_NAME: 'oximetry-traces',
  BREATH_DATA_STORE_NAME: 'breath-data',
  PLD_TRACES_STORE_NAME: 'pld-traces',
  DASHBOARD_SUMMARY_STORE_NAME: 'dashboard-summary',
}));

vi.mock('@/lib/persistence', () => ({
  clearPersistedNights: h.clearPersistedNights,
}));

import { clearAllLocalData } from '@/lib/clear-local-data';

describe('clearAllLocalData', () => {
  beforeEach(() => {
    h.clearSpy.mockClear();
    h.objectStore.mockClear();
    h.runTxMock.mockClear();
    h.clearPersistedNights.mockReset();
  });

  it('clears the localStorage summary and every IndexedDB store', async () => {
    await clearAllLocalData();

    expect(h.clearPersistedNights).toHaveBeenCalledTimes(1);
    expect(h.runTxMock).toHaveBeenCalledTimes(1);
    expect(h.runTxMock.mock.calls[0]![0]).toEqual([
      'waveforms',
      'oximetry-traces',
      'breath-data',
      'pld-traces',
      'dashboard-summary',
    ]);
    expect(h.runTxMock.mock.calls[0]![1]).toBe('readwrite');
    expect(h.clearSpy).toHaveBeenCalledTimes(5);
  });

  it('still clears IndexedDB when the localStorage clear throws', async () => {
    h.clearPersistedNights.mockImplementationOnce(() => {
      throw new Error('localStorage unavailable');
    });

    await expect(clearAllLocalData()).resolves.toBeUndefined();
    expect(h.runTxMock).toHaveBeenCalledTimes(1);
    expect(h.clearSpy).toHaveBeenCalledTimes(5);
  });
});
