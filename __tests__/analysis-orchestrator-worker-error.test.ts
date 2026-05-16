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

// Make a synthetic ErrorEvent — jsdom's ErrorEvent may not expose all fields
function makeErrorEvent(message: string, filename: string, lineno: number, colno: number): ErrorEvent {
  const evt = new ErrorEvent('error', { message, filename, lineno, colno });
  return evt;
}

// Build a Worker constructor mock that can handle multiple sequential constructions.
// Each call to new Worker() returns the next configured instance.
// instanceConfigs describes how each instance behaves:
//   'onerror-empty': fires onerror with empty message/filename (load failure)
//   'onerror-runtime': fires onerror with filename/lineno (runtime error)
//   { type: 'results', nights: [] }: sends a RESULTS message
//   { type: 'oximetry_results', ... }: sends OXIMETRY_RESULTS message
type InstanceConfig =
  | 'onerror-empty'
  | 'onerror-runtime'
  | { type: 'results'; nights: unknown[] }
  | { type: 'oximetry_results'; oximetryByDate: Record<string, unknown>; oximetryTraceByDate: Record<string, unknown> };

function makeSequentialWorkerCtor(instanceConfigs: InstanceConfig[]) {
  let callCount = 0;
  const onmessageHandlers: Array<((e: MessageEvent) => void) | null> = [];
  const onerrorHandlers: Array<((e: ErrorEvent) => void) | null> = [];
  const instances: Array<{ postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }> = [];

  const Ctor = function MockWorker() {
    const idx = callCount++;
    const instance = {
      onmessage: null as unknown,
      onerror: null as unknown,
      postMessage: vi.fn((_msg: unknown) => {
        // After postMessage, schedule the configured response
        const config = instanceConfigs[idx];
        if (!config) return;
        if (config === 'onerror-empty') {
          const handler = onerrorHandlers[idx];
          if (handler) handler(makeErrorEvent('', '', 0, 0));
        } else if (config === 'onerror-runtime') {
          const handler = onerrorHandlers[idx];
          if (handler) handler(makeErrorEvent('SyntaxError: Unexpected token', 'analysis-worker.js', 42, 7));
        } else if (config.type === 'results') {
          const handler = onmessageHandlers[idx];
          if (handler) handler(new MessageEvent('message', { data: { type: 'RESULTS', nights: config.nights } }));
        } else if (config.type === 'oximetry_results') {
          const handler = onmessageHandlers[idx];
          if (handler) handler(new MessageEvent('message', { data: { type: 'OXIMETRY_RESULTS', oximetryByDate: config.oximetryByDate, oximetryTraceByDate: config.oximetryTraceByDate } }));
        }
      }),
      terminate: vi.fn(),
    };
    instances.push(instance);
    onmessageHandlers.push(null);
    onerrorHandlers.push(null);
    return new Proxy(instance, {
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        if (prop === 'onmessage') onmessageHandlers[idx] = value as (e: MessageEvent) => void;
        if (prop === 'onerror') onerrorHandlers[idx] = value as (e: ErrorEvent) => void;
        return true;
      },
    });
  } as unknown as typeof Worker;

  return { Ctor, getCallCount: () => callCount, instances };
}

// Legacy single-instance helpers kept for backward compatibility with existing tests
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
    it('rejects with the fallback message when both attempts fail with empty onerror', async () => {
      // Empty onerror = load failure → retries once → second also fails → rejects
      const { Ctor } = makeSequentialWorkerCtor(['onerror-empty', 'onerror-empty']);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      await expect(
        (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
          .runWorker([])
      ).rejects.toThrow('Analysis worker failed to load. Try refreshing the page.');

      vi.unstubAllGlobals();
    });

    it('rejects with the error detail when onerror fires with message and filename (no retry)', async () => {
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

    it('does NOT call Sentry.captureException on the first load failure (only adds a breadcrumb)', async () => {
      // First attempt fails silently (opaque load failure), second succeeds
      const { Ctor } = makeSequentialWorkerCtor([
        'onerror-empty',
        { type: 'results', nights: [] },
      ]);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      const result = await (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      expect(result).toEqual([]);
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('retrying') })
      );

      vi.unstubAllGlobals();
    });

    it('resolves on retry when the second worker load succeeds', async () => {
      const { Ctor } = makeSequentialWorkerCtor([
        'onerror-empty',
        { type: 'results', nights: [] },
      ]);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const result = await (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
        .runWorker([]);

      expect(result).toEqual([]);

      vi.unstubAllGlobals();
    });

    it('reports attempt: 2 and workerLoadAttempt tag to Sentry when retry also fails', async () => {
      const { Ctor } = makeSequentialWorkerCtor(['onerror-empty', 'onerror-empty']);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      try {
        await (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
          .runWorker([]);
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ workerLoadAttempt: '2' }),
          extra: expect.objectContaining({ attempt: 2, isLoadFailure: true }),
        })
      );

      vi.unstubAllGlobals();
    });

    it('does not retry a runtime error (has filename) — reports immediately', async () => {
      // Runtime error has filename — should NOT trigger retry
      const { Ctor, getCallCount } = makeSequentialWorkerCtor(['onerror-runtime']);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      try {
        await (orchestrator as unknown as { runWorker: (files: unknown[]) => Promise<unknown> })
          .runWorker([]);
      } catch {
        // expected
      }

      // Only one Worker instance should have been created (no retry)
      expect(getCallCount()).toBe(1);
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ workerErrorType: 'runtime_error' }),
          extra: expect.objectContaining({ attempt: 1, isLoadFailure: false }),
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
    it('rejects with the fallback message when both attempts fail with empty onerror', async () => {
      const { Ctor } = makeSequentialWorkerCtor(['onerror-empty', 'onerror-empty']);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      await expect(
        (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
          .runOximetryWorker([])
      ).rejects.toThrow('Oximetry worker failed to load. Try refreshing the page.');

      vi.unstubAllGlobals();
    });

    it('rejects with the error detail when onerror fires with message and filename (no retry)', async () => {
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

    it('resolves on retry when the second oximetry worker load succeeds', async () => {
      const { Ctor } = makeSequentialWorkerCtor([
        'onerror-empty',
        { type: 'oximetry_results', oximetryByDate: {}, oximetryTraceByDate: {} },
      ]);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const result = await (orchestrator as unknown as {
        runOximetryWorker: (csvs: string[]) => Promise<{ oximetryByDate: Record<string, unknown> }>
      }).runOximetryWorker([]);

      expect(result.oximetryByDate).toEqual({});

      vi.unstubAllGlobals();
    });

    it('does not retry an oximetry runtime error — reports immediately', async () => {
      const { Ctor, getCallCount } = makeSequentialWorkerCtor(['onerror-runtime']);
      vi.stubGlobal('Worker', Ctor);

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      try {
        await (orchestrator as unknown as { runOximetryWorker: (csvs: string[]) => Promise<unknown> })
          .runOximetryWorker([]);
      } catch {
        // expected
      }

      expect(getCallCount()).toBe(1);
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ workerErrorType: 'runtime_error' }),
          extra: expect.objectContaining({ isLoadFailure: false }),
        })
      );

      vi.unstubAllGlobals();
    });
  });

  // ── analyze — NotReadableError during file read ───────────────────────────

  describe('analyze — NotReadableError during file read', () => {
    it('sets error state with user-friendly message when arrayBuffer() throws NotReadableError', async () => {
      // Stub Worker so it never gets called — the error is thrown before the worker
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(new Error('should not reach worker')));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');

      const notReadable = new DOMException('The requested file could not be read', 'NotReadableError');
      const mockFile = {
        name: 'BRP.edf',
        size: 100 * 1024,
        webkitRelativePath: 'DATALOG/20240101/BRP.edf',
        arrayBuffer: () => Promise.reject(notReadable),
        text: () => Promise.reject(notReadable),
        lastModified: Date.now(),
        type: '',
        slice: () => new Blob(),
        stream: () => { throw new Error('not implemented'); },
      } as unknown as File;

      try {
        await orchestrator.analyze([mockFile]);
      } catch {
        // analyze re-throws; we inspect state below
      }

      const state = orchestrator.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe(
        'File could not be read — please re-select your SD card files and try again'
      );

      vi.unstubAllGlobals();
    });

    it('still calls Sentry.captureException for NotReadableError', async () => {
      vi.stubGlobal('Worker', makeThrowingWorkerCtor(new Error('should not reach worker')));

      const { orchestrator } = await import('@/lib/analysis-orchestrator');
      const Sentry = await import('@sentry/nextjs');

      const notReadable = new DOMException('The requested file could not be read', 'NotReadableError');
      const mockFile = {
        name: 'BRP.edf',
        size: 100 * 1024,
        webkitRelativePath: 'DATALOG/20240101/BRP.edf',
        arrayBuffer: () => Promise.reject(notReadable),
        text: () => Promise.reject(notReadable),
        lastModified: Date.now(),
        type: '',
        slice: () => new Blob(),
        stream: () => { throw new Error('not implemented'); },
      } as unknown as File;

      try {
        await orchestrator.analyze([mockFile]);
      } catch {
        // expected
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(
        notReadable,
        expect.objectContaining({ extra: expect.objectContaining({ context: 'analysis-worker' }) })
      );

      vi.unstubAllGlobals();
    });
  });
});
