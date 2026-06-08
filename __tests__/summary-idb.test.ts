// ============================================================
// AirwayLab — summary-idb unit tests
// Thin wrapper over runTx for the single-record dashboard-summary store.
// Mocks idb-core so no real IndexedDB driver is needed (jsdom ships none).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const getSpy = vi.fn();
  const putSpy = vi.fn();
  const deleteSpy = vi.fn();
  const objectStore = vi.fn(() => ({ get: getSpy, put: putSpy, delete: deleteSpy }));
  let getReturn: unknown = undefined;
  const runTxMock = vi.fn((_stores: unknown, _mode: unknown, fn: (tx: unknown) => unknown) => {
    fn({ objectStore });
    return Promise.resolve(getReturn);
  });
  return {
    getSpy,
    putSpy,
    deleteSpy,
    objectStore,
    runTxMock,
    setGetReturn: (v: unknown) => {
      getReturn = v;
    },
  };
});

vi.mock('@/lib/idb-core', () => ({
  runTx: h.runTxMock,
  DASHBOARD_SUMMARY_STORE_NAME: 'dashboard-summary',
}));

import { saveSummaryRecord, readSummaryRecord, clearSummaryRecord } from '@/lib/summary-idb';

describe('summary-idb', () => {
  beforeEach(() => {
    h.runTxMock.mockClear();
    h.putSpy.mockClear();
    h.getSpy.mockClear();
    h.deleteSpy.mockClear();
    h.setGetReturn(undefined);
  });

  it('saveSummaryRecord puts the record under id "current" (readwrite)', async () => {
    await saveSummaryRecord('{"x":1}', 42);
    expect(h.runTxMock.mock.calls[0]![0]).toBe('dashboard-summary');
    expect(h.runTxMock.mock.calls[0]![1]).toBe('readwrite');
    expect(h.putSpy).toHaveBeenCalledWith({ id: 'current', json: '{"x":1}', savedAt: 42 });
  });

  it('readSummaryRecord returns { json, savedAt } when present', async () => {
    h.setGetReturn({ id: 'current', json: '{"y":2}', savedAt: 7 });
    expect(await readSummaryRecord()).toEqual({ json: '{"y":2}', savedAt: 7 });
    expect(h.getSpy).toHaveBeenCalledWith('current');
  });

  it('readSummaryRecord returns null when absent or malformed', async () => {
    h.setGetReturn(undefined);
    expect(await readSummaryRecord()).toBeNull();
    h.setGetReturn({ id: 'current' }); // no json field
    expect(await readSummaryRecord()).toBeNull();
  });

  it('clearSummaryRecord deletes id "current"', async () => {
    await clearSummaryRecord();
    expect(h.deleteSpy).toHaveBeenCalledWith('current');
  });
});
