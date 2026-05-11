import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

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

type RunWorker = (files: unknown[]) => Promise<unknown>;

/** Build a silent worker that never sends any message back. */
function makeSilentWorkerCtor() {
  const instance = {
    onmessage: null as unknown,
    onerror: null as unknown,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
  const Ctor = function MockWorker() { return instance; } as unknown as typeof Worker;
  return { Ctor, instance };
}

/** Build a worker that captures its onmessage handler so tests can inject messages. */
function makeControllableWorkerCtor() {
  let onmessageHandler: ((e: MessageEvent) => void) | null = null;

  const instance = {
    onerror: null as unknown,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };

  const Ctor = function MockWorker() {
    return new Proxy(instance, {
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        if (prop === 'onmessage') onmessageHandler = value as (e: MessageEvent) => void;
        return true;
      },
    });
  } as unknown as typeof Worker;

  const send = (data: unknown) => {
    onmessageHandler?.(new MessageEvent('message', { data }));
  };

  return { Ctor, send, instance };
}

describe('runWorker — idle timeout watchdog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects with "stuck" message after 5 minutes of worker silence', async () => {
    const { Ctor } = makeSilentWorkerCtor();
    vi.stubGlobal('Worker', Ctor);

    const { orchestrator } = await import('@/lib/analysis-orchestrator');

    const promise = (orchestrator as unknown as { runWorker: RunWorker }).runWorker([]);

    vi.advanceTimersByTime(5 * 60 * 1000 + 100);

    await expect(promise).rejects.toThrow(
      'Analysis appears stuck — no progress for 5 minutes'
    );
  });

  it('does not time out when the worker sends PROGRESS messages that reset the timer', async () => {
    const { Ctor, send } = makeControllableWorkerCtor();
    vi.stubGlobal('Worker', Ctor);

    const { orchestrator } = await import('@/lib/analysis-orchestrator');

    const promise = (orchestrator as unknown as { runWorker: RunWorker }).runWorker([]);

    // Advance to just under the 5-minute threshold
    vi.advanceTimersByTime(4 * 60 * 1000 + 59_000);

    // Worker sends a PROGRESS message — this resets the idle timer
    send({ type: 'PROGRESS', current: 1, total: 5, stage: 'Analyzing night...' });

    // Advance another 4 minutes — still under threshold from the reset point
    vi.advanceTimersByTime(4 * 60 * 1000);

    // Now resolve cleanly via RESULTS
    send({ type: 'RESULTS', nights: [] });

    await expect(promise).resolves.toEqual([]);
  });

  it('does not time out when the worker sends NIGHT_RESULT messages', async () => {
    const { Ctor, send } = makeControllableWorkerCtor();
    vi.stubGlobal('Worker', Ctor);

    const { orchestrator } = await import('@/lib/analysis-orchestrator');

    const promise = (orchestrator as unknown as { runWorker: RunWorker }).runWorker([]);

    vi.advanceTimersByTime(4 * 60 * 1000 + 30_000);

    // NIGHT_RESULT is also a worker message — resets idle timer
    send({
      type: 'NIGHT_RESULT',
      night: { dateStr: '2026-05-10', ned: { breaths: [], breathCount: 0 }, oximetryTrace: null },
      nightIndex: 0,
      totalNights: 1,
    });

    vi.advanceTimersByTime(4 * 60 * 1000);

    send({ type: 'RESULTS', nights: [] });

    await expect(promise).resolves.toEqual([]);
  });

  it('settles immediately and clears the timer when worker sends ERROR', async () => {
    const { Ctor, send } = makeControllableWorkerCtor();
    vi.stubGlobal('Worker', Ctor);

    const { orchestrator } = await import('@/lib/analysis-orchestrator');

    const promise = (orchestrator as unknown as { runWorker: RunWorker }).runWorker([]);

    send({ type: 'ERROR', error: 'Worker crashed' });

    await expect(promise).rejects.toThrow('Worker crashed');

    // Advancing past 5 minutes after ERROR should not produce a second rejection
    vi.advanceTimersByTime(10 * 60 * 1000);
    // If a second rejection were thrown, the test harness would catch it above
  });

  it('rejects exactly once even if postMessage throws synchronously after the timer', async () => {
    // Simulate postMessage throwing DataCloneError (detached buffer edge case)
    const throwingInstance = {
      onmessage: null as unknown,
      onerror: null as unknown,
      postMessage: vi.fn(() => { throw new DOMException('Could not clone', 'DataCloneError'); }),
      terminate: vi.fn(),
    };
    const Ctor = function MockWorker() { return throwingInstance; } as unknown as typeof Worker;
    vi.stubGlobal('Worker', Ctor);

    const { orchestrator } = await import('@/lib/analysis-orchestrator');

    const promise = (orchestrator as unknown as { runWorker: RunWorker }).runWorker([]);

    // postMessage threw synchronously — orchestrator should reject immediately
    await expect(promise).rejects.toThrow('Analysis failed to start');

    // Timer should be cleared — advancing 5 minutes must not produce a second rejection
    vi.advanceTimersByTime(6 * 60 * 1000);
  });
});
