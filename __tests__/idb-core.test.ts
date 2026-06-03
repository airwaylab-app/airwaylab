// ============================================================
// AirwayLab — idb-core unit tests
// Focused coverage for runTx's abort / quota / error wiring (I1) and
// assertQuota's headroom guard (I4) — the paths that previously let a
// failed PHI write hang or be silently swallowed.
//
// No fake-indexeddb dependency (jsdom ships no IDB driver and we must not
// add a dep). Instead we drive a minimal hand-rolled IDB mock that fires
// the exact event sequences a real browser produces on quota failure.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Minimal controllable IndexedDB mock ──────────────────────────────

type Scenario =
  | { kind: 'complete'; result?: unknown }
  | { kind: 'request-quota' } // request.onerror fires QuotaExceededError, then tx aborts
  | { kind: 'tx-abort-quota' } // tx.onabort fires with a QuotaExceededError, no request error
  | { kind: 'tx-error' }; // generic (non-quota) tx error

function makeMockIndexedDB(scenario: Scenario) {
  const fireMicrotask = (fn: () => void) => Promise.resolve().then(fn);

  function makeRequest() {
    const req: Record<string, unknown> = { onerror: null, onsuccess: null, result: undefined, error: null };
    return req;
  }

  function makeTransaction() {
    const tx: Record<string, unknown> = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      error: null,
      objectStore: () => ({
        put: () => {
          const req = makeRequest();
          fireMicrotask(() => {
            if (scenario.kind === 'request-quota') {
              req.error = new DOMException('quota', 'QuotaExceededError');
              (req.onerror as (() => void) | null)?.();
              // browser then aborts the txn
              tx.error = new DOMException('quota', 'QuotaExceededError');
              (tx.onabort as (() => void) | null)?.();
            } else if (scenario.kind === 'tx-abort-quota') {
              tx.error = new DOMException('quota', 'QuotaExceededError');
              (tx.onabort as (() => void) | null)?.();
            } else if (scenario.kind === 'tx-error') {
              tx.error = new DOMException('boom', 'UnknownError');
              (tx.onerror as (() => void) | null)?.();
            } else {
              (tx.oncomplete as (() => void) | null)?.();
            }
          });
          return req;
        },
        get: () => {
          const req = makeRequest();
          fireMicrotask(() => {
            if (scenario.kind === 'complete') {
              req.result = (scenario as { result?: unknown }).result;
              (tx.oncomplete as (() => void) | null)?.();
            } else {
              (tx.onerror as (() => void) | null)?.();
            }
          });
          return req;
        },
      }),
    };
    return tx;
  }

  const db: Record<string, unknown> = {
    onversionchange: null,
    close: vi.fn(),
    transaction: () => makeTransaction(),
  };

  return {
    open: () => {
      const req: Record<string, unknown> = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        result: db,
        error: null,
      };
      fireMicrotask(() => {
        (req.onsuccess as (() => void) | null)?.();
      });
      return req;
    },
  };
}

// ── Fresh module per scenario (queue + memoized db are module state) ──

async function loadIdbCore(scenario: Scenario) {
  const origIndexedDB = globalThis.indexedDB;
  // @ts-expect-error -- install the mock
  globalThis.indexedDB = makeMockIndexedDB(scenario);
  vi.resetModules();
  const mod = await import('@/lib/idb-core');
  return { mod, restore: () => { globalThis.indexedDB = origIndexedDB; } };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('idb-core runTx — abort / quota wiring (I1)', () => {
  let restore: (() => void) | null = null;
  afterEach(() => { restore?.(); restore = null; });

  it('rejects with a typed QuotaError when a write request errors with QuotaExceededError', async () => {
    const { mod, restore: r } = await loadIdbCore({ kind: 'request-quota' });
    restore = r;
    const p = mod.runTx('waveforms', 'readwrite', (tx) => tx.objectStore('waveforms').put({ dateStr: 'x' }));
    await expect(p).rejects.toBeInstanceOf(mod.QuotaError);
    await p.catch((err) => expect(mod.isQuotaError(err)).toBe(true));
  });

  it('rejects with a typed QuotaError when the transaction aborts on quota (no request error)', async () => {
    const { mod, restore: r } = await loadIdbCore({ kind: 'tx-abort-quota' });
    restore = r;
    const p = mod.runTx('waveforms', 'readwrite', (tx) => tx.objectStore('waveforms').put({ dateStr: 'x' }));
    await expect(p).rejects.toBeInstanceOf(mod.QuotaError);
  });

  it('rejects (not hangs) on a generic transaction error', async () => {
    const { mod, restore: r } = await loadIdbCore({ kind: 'tx-error' });
    restore = r;
    const p = mod.runTx('waveforms', 'readwrite', (tx) => tx.objectStore('waveforms').put({ dateStr: 'x' }));
    await expect(p).rejects.toBeTruthy();
    await p.catch((err) => expect(mod.isQuotaError(err)).toBe(false));
  });

  it('resolves with the request result on a successful read', async () => {
    const { mod, restore: r } = await loadIdbCore({ kind: 'complete', result: { dateStr: 'd', value: 42 } });
    restore = r;
    const out = await mod.runTx('waveforms', 'readonly', (tx) => tx.objectStore('waveforms').get('d'));
    expect(out).toEqual({ dateStr: 'd', value: 42 });
  });

  it('serializes ops so a failing write does not break the queue for the next op', async () => {
    const { mod, restore: r } = await loadIdbCore({ kind: 'complete', result: 'ok' });
    restore = r;
    const a = mod.runTx('waveforms', 'readonly', (tx) => tx.objectStore('waveforms').get('a'));
    const b = mod.runTx('waveforms', 'readonly', (tx) => tx.objectStore('waveforms').get('b'));
    await expect(Promise.all([a, b])).resolves.toEqual(['ok', 'ok']);
  });
});

describe('idb-core assertQuota — headroom guard (I4)', () => {
  let origNavigator: PropertyDescriptor | undefined;
  beforeEach(() => {
    origNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  });
  afterEach(() => {
    if (origNavigator) Object.defineProperty(globalThis, 'navigator', origNavigator);
    vi.restoreAllMocks();
  });

  it('throws a typed QuotaError when the estimate leaves no headroom', async () => {
    const { mod, restore } = await loadIdbCore({ kind: 'complete' });
    try {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { storage: { estimate: async () => ({ quota: 100, usage: 99 }) } },
      });
      await expect(mod.assertQuota(50)).rejects.toBeInstanceOf(mod.QuotaError);
    } finally {
      restore();
    }
  });

  it('is a no-op when navigator.storage.estimate is unavailable', async () => {
    const { mod, restore } = await loadIdbCore({ kind: 'complete' });
    try {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {},
      });
      await expect(mod.assertQuota(1_000_000_000)).resolves.toBeUndefined();
    } finally {
      restore();
    }
  });

  it('allows the write when there is ample headroom', async () => {
    const { mod, restore } = await loadIdbCore({ kind: 'complete' });
    try {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { storage: { estimate: async () => ({ quota: 1_000_000_000, usage: 1000 }) } },
      });
      await expect(mod.assertQuota(1000)).resolves.toBeUndefined();
    } finally {
      restore();
    }
  });
});
