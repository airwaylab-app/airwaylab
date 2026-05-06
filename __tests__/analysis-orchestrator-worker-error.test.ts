import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry before importing the orchestrator
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock persistence modules (required by analysis-orchestrator)
vi.mock('@/lib/persistence', () => ({
  loadPersistedResults: vi.fn(() => null),
  persistResults: vi.fn(() => ({ reason: null })),
  persistNightsIncremental: vi.fn(),
}));

vi.mock('@/lib/file-manifest', () => ({
  extractNightDate: vi.fn(() => null),
  buildManifest: vi.fn(() => ({})),
  saveManifest: vi.fn(),
  loadManifest: vi.fn(() => null),
  diffAgainstManifest: vi.fn(() => ({ unchanged: [], changedNights: new Set(), changedFiles: [] })),
}));

vi.mock('@/lib/oximetry-trace-idb', () => ({
  storeOximetryTrace: vi.fn(),
  loadOximetryTrace: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/breath-data-idb', () => ({
  storeBreathData: vi.fn(),
  loadBreathData: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/pld-trace-idb', () => ({
  storePLDTrace: vi.fn(),
  loadPLDTrace: vi.fn(() => Promise.resolve(null)),
}));

// Build a Worker constructor mock that throws synchronously on new Worker()
function makeThrowingWorkerCtor(err: Error) {
  // Must use function keyword so it can be called as a constructor (new)
  return function MockWorker() {
    throw err;
  } as unknown as typeof Worker;
}

// Build a Worker constructor mock that returns a controllable instance
// and exposes a way to fire onerror after construction
function makeOnerrorWorkerCtor() {
  let onerrorHandler: ((e: ErrorEvent) => void) | null = null;

  const instance = {
    onmessage: null as unknown,
    onerror: null as unknown,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };

  const Ctor = function MockWorker() {
    return new Proxy(instance, {
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        if (prop === 'onerror') {
          onerrorHandler = value as (e: ErrorEvent) => void;
        }
        return true;
      },
    });
  } as unknown as typeof Worker;

  const fireOnerror = (evt: ErrorEvent) => {
    if (onerrorHandler) onerrorHandler(evt);
  };

  return { Ctor, fireOnerror };
}

// Make a synthetic ErrorEvent — jsdom's ErrorEvent may not expose all fields
function makeErrorEvent(message: string, filename: string, lineno: number, colno: number): ErrorEvent {
  const evt = new ErrorEvent('error', { message, filename, lineno, colno });
  return evt;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('analysis-orchestrator worker error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache so each test gets a fresh orchestrator singleton
    vi.resetModules();
  });

  // ── runWorker — new Worker() throws synchronously ─────────────────────────

  describe('runWorker — Worker constructor throws', () => {
    it('rejects with the fallback message', async () => {
      const constructError = new Error('Worker init failed');
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(constructError));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      await expect(
        (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
          .runWorker([])
      ).rejects.toThrow('Analysis worker failed to load. Try refreshing the page.');

      vi.unstubAllGlobals();
    });

    it('calls Sentry.captureException with analysis-worker-init context', async () => {
      const constructError = new Error('Worker init failed');
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(constructError));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      try {
        await (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
          .runWorker([]);
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        constructError,
        expect.objectContaining({
          extra: expect.objectContaining({
            context: 'analysis-worker-init',
          }),
        })
      );

      vi.unstubAllGlobals();
    });
  });

  // ── runWorker — worker.onerror fires ─────────────────────────────────────

  describe('runWorker — worker.onerror fires', () => {
    it('rejects with the fallback message when onerror fires with empty message', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const promise = (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      // Fire onerror with empty message after a tick
      await Promise.resolve();
      fireOnerror(makeErrorEvent('', '', 0, 0));

      await expect(promise).rejects.toThrow(
        'Analysis worker failed to load. Try refreshing the page.'
      );

      vi.unstubAllGlobals();
    });

    it('rejects with the error detail when onerror fires with message and filename', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const promise = (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('SyntaxError: Unexpected token', 'analysis-worker.js', 42, 7));

      await expect(promise).rejects.toThrow(
        'SyntaxError: Unexpected token at analysis-worker.js:42:7'
      );

      vi.unstubAllGlobals();
    });

    it('calls Sentry.captureException with analysis-worker-onerror context', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      const promise = (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('Script load failed', 'analysis-worker.js', 1, 1));

      try {
        await promise;
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            context: 'analysis-worker-onerror',
          }),
        })
      );

      vi.unstubAllGlobals();
    });

    it('includes filename, lineno, colno in Sentry extra when onerror fires', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      const promise = (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('Load error', 'analysis-worker.js', 10, 5));

      try {
        await promise;
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            context: 'analysis-worker-onerror',
            filename: 'analysis-worker.js',
            lineno: 10,
            colno: 5,
          }),
        })
      );

      vi.unstubAllGlobals();
    });
  });

  // ── runOximetryWorker — new Worker() throws synchronously ─────────────────

  describe('runOximetryWorker — Worker constructor throws', () => {
    it('rejects with the oximetry fallback message', async () => {
      const constructError = new Error('Worker init failed');
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(constructError));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      await expect(
        (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
          .runOximetryWorker([])
      ).rejects.toThrow('Oximetry worker failed to load. Try refreshing the page.');

      vi.unstubAllGlobals();
    });

    it('calls Sentry.captureException with oximetry-worker-init context', async () => {
      const constructError = new Error('Worker init failed');
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(constructError));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      try {
        await (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
          .runOximetryWorker([]);
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        constructError,
        expect.objectContaining({
          extra: expect.objectContaining({
            context: 'oximetry-worker-init',
          }),
        })
      );

      vi.unstubAllGlobals();
    });
  });

  // ── runOximetryWorker — worker.onerror fires ──────────────────────────────

  describe('runOximetryWorker — worker.onerror fires', () => {
    it('rejects with the fallback message when onerror fires with empty message', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const promise = (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
        .runOximetryWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('', '', 0, 0));

      await expect(promise).rejects.toThrow(
        'Oximetry worker failed to load. Try refreshing the page.'
      );

      vi.unstubAllGlobals();
    });

    it('rejects with the error detail when onerror fires with message and filename', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const promise = (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
        .runOximetryWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('Network error', 'analysis-worker.js', 10, 5));

      await expect(promise).rejects.toThrow(
        'Network error at analysis-worker.js:10:5'
      );

      vi.unstubAllGlobals();
    });

    it('calls Sentry.captureException with oximetry-worker-onerror context', async () => {
      const { Ctor, fireOnerror } = makeOnerrorWorkerCtor();
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      const promise = (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
        .runOximetryWorker([]);

      await Promise.resolve();
      fireOnerror(makeErrorEvent('Parse error', 'analysis-worker.js', 5, 3));

      try {
        await promise;
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          extra: expect.objectContaining({
            context: 'oximetry-worker-onerror',
            filename: 'analysis-worker.js',
            lineno: 5,
            colno: 3,
          }),
        })
      );

      vi.unstubAllGlobals();
    });
  });
});
