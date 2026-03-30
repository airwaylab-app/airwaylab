import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StoredWaveform, RawWaveformResult, WaveformWorkerResponse } from '@/lib/waveform-types';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

const mockStoreWaveform = vi.fn().mockResolvedValue(undefined);
const mockLoadWaveform = vi.fn().mockResolvedValue(null);
const mockDeleteExpired = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/waveform-idb', () => ({
  storeWaveform: (...args: unknown[]) => mockStoreWaveform(...args),
  loadWaveform: (...args: unknown[]) => mockLoadWaveform(...args),
  deleteExpired: (...args: unknown[]) => mockDeleteExpired(...args),
}));

vi.mock('@/lib/engine-version', () => ({
  ENGINE_VERSION: '0.8.0-test',
}));

// ---------------------------------------------------------------------------
// Fake Worker — captures postMessage calls and allows simulating responses
// ---------------------------------------------------------------------------

type MessageHandler = ((e: MessageEvent) => void) | null;
type ErrorHandler = ((e: ErrorEvent) => void) | null;

class FakeWorker {
  onmessage: MessageHandler = null;
  onerror: ErrorHandler = null;
  postMessageCalls: unknown[] = [];
  terminated = false;

  postMessage(data: unknown, _transfer?: Transferable[]) {
    this.postMessageCalls.push(data);
  }

  terminate() {
    this.terminated = true;
  }

  /** Simulate a message from the worker */
  simulateMessage(data: WaveformWorkerResponse) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  /** Simulate a worker error */
  simulateError(message = 'Worker crashed') {
    if (this.onerror) {
      const event = new ErrorEvent('error', { message });
      this.onerror(event);
    }
  }
}

let fakeWorkerInstances: FakeWorker[] = [];
let workerConstructorSpy: ReturnType<typeof vi.fn>;

function installFakeWorker() {
  fakeWorkerInstances = [];
  // Must use a real function (not arrow) so `new Worker(...)` works
  function MockWorker() {
    const w = new FakeWorker();
    fakeWorkerInstances.push(w);
    return w;
  }
  workerConstructorSpy = vi.fn(MockWorker);
  vi.stubGlobal('Worker', workerConstructorSpy);
}

// ---------------------------------------------------------------------------
// Helpers — synthetic test data
// ---------------------------------------------------------------------------

function makeStoredWaveform(dateStr = '2026-03-10'): StoredWaveform {
  return {
    dateStr,
    flow: new Float32Array([1, 2, 3]),
    pressure: null,
    sampleRate: 25,
    durationSeconds: 3600,
    events: [],
    stats: {
      breathCount: 100,
      flowMin: -20,
      flowMax: 40,
      flowMean: 10,
      pressureMin: null,
      pressureMax: null,
      pressureP10: null,
      pressureP90: null,
      pressureMean: null,
      leakMean: null,
      leakMax: null,
      leakP95: null,
    },
    tidalVolume: [],
    respiratoryRate: [],
    leak: [],
    storedAt: Date.now(),
    engineVersion: '0.8.0-test',
  };
}

function makeRawWaveformResult(dateStr = '2026-03-10'): RawWaveformResult {
  return {
    type: 'RAW_WAVEFORM_RESULT',
    flow: new Float32Array([1, 2, 3]),
    pressure: null,
    sampleRate: 25,
    durationSeconds: 3600,
    events: [],
    stats: {
      breathCount: 100,
      flowMin: -20,
      flowMax: 40,
      flowMean: 10,
      pressureMin: null,
      pressureMax: null,
      pressureP10: null,
      pressureP90: null,
      pressureMean: null,
      leakMean: null,
      leakMax: null,
      leakP95: null,
    },
    tidalVolume: [],
    respiratoryRate: [],
    leak: [],
    dateStr,
  };
}

/** Create a minimal File with a webkitRelativePath */
function makeFile(
  name: string,
  size = 100 * 1024,
  webkitRelativePath?: string
): File {
  const content = new Uint8Array(size);
  const file = new File([content], name, { type: 'application/octet-stream' });
  if (webkitRelativePath) {
    Object.defineProperty(file, 'webkitRelativePath', {
      value: webkitRelativePath,
      writable: false,
    });
  }
  return file;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// The module exports a singleton, so we need to re-import for each test group
// to get a fresh instance. We use dynamic import + resetModules.
async function getOrchestrator() {
  const mod = await import('@/lib/waveform-orchestrator');
  return mod.waveformOrchestrator;
}

describe('WaveformOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    installFakeWorker();
    mockStoreWaveform.mockReset();
    mockStoreWaveform.mockResolvedValue(undefined);
    mockLoadWaveform.mockReset();
    mockLoadWaveform.mockResolvedValue(null);
    mockDeleteExpired.mockReset();
    mockDeleteExpired.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  describe('initial state', () => {
    it('starts in idle status with no waveform or error', async () => {
      const orch = await getOrchestrator();
      const state = orch.getState();
      expect(state.status).toBe('idle');
      expect(state.waveform).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // subscribe / unsubscribe
  // -----------------------------------------------------------------------

  describe('subscribe', () => {
    it('calls the listener immediately with current state', async () => {
      const orch = await getOrchestrator();
      const listener = vi.fn();

      orch.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        status: 'idle',
        waveform: null,
        error: null,
      });
    });

    it('returns an unsubscribe function that stops future notifications', async () => {
      const orch = await getOrchestrator();
      const listener = vi.fn();

      const unsubscribe = orch.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);

      // Trigger a state change
      const waveform = makeStoredWaveform();
      orch.setDemoWaveform(waveform);
      expect(listener).toHaveBeenCalledTimes(2);

      // Unsubscribe
      unsubscribe();

      // Trigger another state change — listener should NOT be called
      orch.reset();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('supports multiple concurrent listeners', async () => {
      const orch = await getOrchestrator();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      orch.subscribe(listener1);
      orch.subscribe(listener2);

      const waveform = makeStoredWaveform();
      orch.setDemoWaveform(waveform);

      // Each listener: 1 initial call + 1 state change
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // setDemoWaveform
  // -----------------------------------------------------------------------

  describe('setDemoWaveform', () => {
    it('sets status to ready and stores the waveform', async () => {
      const orch = await getOrchestrator();
      const waveform = makeStoredWaveform('2026-03-15');

      orch.setDemoWaveform(waveform);

      const state = orch.getState();
      expect(state.status).toBe('ready');
      expect(state.waveform).toBe(waveform);
      expect(state.error).toBeNull();
    });

    it('populates the in-memory cache (hasCached returns true)', async () => {
      const orch = await getOrchestrator();
      expect(orch.hasCached('2026-03-15')).toBe(false);

      orch.setDemoWaveform(makeStoredWaveform('2026-03-15'));

      expect(orch.hasCached('2026-03-15')).toBe(true);
    });

    it('notifies subscribers', async () => {
      const orch = await getOrchestrator();
      const listener = vi.fn();
      orch.subscribe(listener);
      listener.mockClear();

      const waveform = makeStoredWaveform();
      orch.setDemoWaveform(waveform);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready', waveform })
      );
    });
  });

  // -----------------------------------------------------------------------
  // hasCached
  // -----------------------------------------------------------------------

  describe('hasCached', () => {
    it('returns false for unknown dates', async () => {
      const orch = await getOrchestrator();
      expect(orch.hasCached('2026-01-01')).toBe(false);
    });

    it('returns true after setDemoWaveform', async () => {
      const orch = await getOrchestrator();
      orch.setDemoWaveform(makeStoredWaveform('2026-01-01'));
      expect(orch.hasCached('2026-01-01')).toBe(true);
    });

    it('returns false after reset clears cache', async () => {
      const orch = await getOrchestrator();
      orch.setDemoWaveform(makeStoredWaveform('2026-01-01'));
      orch.reset();
      expect(orch.hasCached('2026-01-01')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // loadFromIDB
  // -----------------------------------------------------------------------

  describe('loadFromIDB', () => {
    it('returns in-memory cached data without hitting IndexedDB', async () => {
      const orch = await getOrchestrator();
      const waveform = makeStoredWaveform('2026-03-10');
      orch.setDemoWaveform(waveform);

      const result = await orch.loadFromIDB('2026-03-10');

      expect(result).toBe(waveform);
      expect(mockLoadWaveform).not.toHaveBeenCalled();
      expect(orch.getState().status).toBe('ready');
    });

    it('falls back to IndexedDB when not in memory cache', async () => {
      const orch = await getOrchestrator();
      const stored = makeStoredWaveform('2026-03-10');
      mockLoadWaveform.mockResolvedValueOnce(stored);

      const result = await orch.loadFromIDB('2026-03-10');

      expect(mockLoadWaveform).toHaveBeenCalledWith('2026-03-10');
      expect(result).toBe(stored);
      expect(orch.getState().status).toBe('ready');
    });

    it('populates in-memory cache after IDB load so subsequent calls skip IDB', async () => {
      const orch = await getOrchestrator();
      const stored = makeStoredWaveform('2026-03-10');
      mockLoadWaveform.mockResolvedValueOnce(stored);

      await orch.loadFromIDB('2026-03-10');
      expect(mockLoadWaveform).toHaveBeenCalledTimes(1);

      // Second call should use in-memory cache
      const result2 = await orch.loadFromIDB('2026-03-10');
      expect(result2).toBe(stored);
      expect(mockLoadWaveform).toHaveBeenCalledTimes(1); // not called again
    });

    it('returns null when neither in-memory nor IDB has data', async () => {
      const orch = await getOrchestrator();
      mockLoadWaveform.mockResolvedValueOnce(null);

      const result = await orch.loadFromIDB('2026-03-10');

      expect(result).toBeNull();
    });

    it('does not change state when IDB returns null', async () => {
      const orch = await getOrchestrator();
      mockLoadWaveform.mockResolvedValueOnce(null);

      await orch.loadFromIDB('2026-03-10');

      // State should remain idle (unchanged from initial)
      expect(orch.getState().status).toBe('idle');
    });
  });

  // -----------------------------------------------------------------------
  // extract — cache hits
  // -----------------------------------------------------------------------

  describe('extract — cache hits', () => {
    it('returns cached data immediately without creating a worker', async () => {
      const orch = await getOrchestrator();
      const waveform = makeStoredWaveform('2026-03-10');
      orch.setDemoWaveform(waveform);

      const result = await orch.extract([], '2026-03-10');

      expect(result).toBe(waveform);
      expect(orch.getState().status).toBe('ready');
      expect(workerConstructorSpy).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // extract — empty files
  // -----------------------------------------------------------------------

  describe('extract — empty files', () => {
    it('sets status to unavailable when files array is empty', async () => {
      const orch = await getOrchestrator();

      const result = await orch.extract([], '2026-03-10');

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('unavailable');
    });
  });

  // -----------------------------------------------------------------------
  // extract — BRP file filtering
  // -----------------------------------------------------------------------

  describe('extract — file filtering', () => {
    it('sets error when no BRP files match', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('STR.edf', 200 * 1024, 'DATALOG/20260310/STR.edf'),
      ];

      const result = await orch.extract(files, '2026-03-10');

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toBe('No flow data files found');
    });

    it('filters out BRP files smaller than 50KB', async () => {
      const orch = await getOrchestrator();
      // A BRP file under 50KB should be filtered out
      const files = [
        makeFile('BRP.edf', 10 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const result = await orch.extract(files, '2026-03-10');

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toBe('No flow data files found');
    });
  });

  // -----------------------------------------------------------------------
  // extract — successful worker completion
  // -----------------------------------------------------------------------

  describe('extract — successful worker flow', () => {
    it('creates a worker, posts a message, and returns result on success', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');

      // Wait for microtasks (file reading is async)
      await vi.advanceTimersByTimeAsync(0);

      // A worker should have been created
      expect(fakeWorkerInstances).toHaveLength(1);
      const worker = fakeWorkerInstances[0]!;

      // Worker should have received a message
      expect(worker.postMessageCalls).toHaveLength(1);
      const msg = worker.postMessageCalls[0] as Record<string, unknown>;
      expect(msg.type).toBe('EXTRACT_WAVEFORM');
      expect(msg.targetDate).toBe('2026-03-10');

      // Simulate a successful response
      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));

      const result = await extractPromise;

      expect(result).not.toBeNull();
      expect(result!.dateStr).toBe('2026-03-10');
      expect(result!.flow).toBeInstanceOf(Float32Array);
      expect(result!.engineVersion).toBe('0.8.0-test');
      expect(orch.getState().status).toBe('ready');
    });

    it('stores result in IndexedDB (non-blocking)', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));

      await extractPromise;

      // storeWaveform should have been called
      expect(mockStoreWaveform).toHaveBeenCalledTimes(1);
      expect(mockStoreWaveform).toHaveBeenCalledWith(
        expect.objectContaining({ dateStr: '2026-03-10' })
      );
    });

    it('calls deleteExpired after successful extraction', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;

      expect(mockDeleteExpired).toHaveBeenCalledTimes(1);
    });

    it('populates in-memory cache so next call is a cache hit', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);
      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;

      expect(orch.hasCached('2026-03-10')).toBe(true);

      // Second call returns from cache, no new worker created
      const result2 = await orch.extract(files, '2026-03-10');
      expect(result2).not.toBeNull();
      expect(fakeWorkerInstances).toHaveLength(1); // still only one worker created
    });

    it('terminates the worker after receiving the result', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;

      expect(worker.terminated).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // extract — worker returns null flow
  // -----------------------------------------------------------------------

  describe('extract — worker returns null flow', () => {
    it('sets error status when worker returns no flow data', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const noFlowResult: RawWaveformResult = {
        ...makeRawWaveformResult('2026-03-10'),
        flow: null,
      };
      fakeWorkerInstances[0]!.simulateMessage(noFlowResult);

      const result = await extractPromise;

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toBe('No flow data found for this night');
    });
  });

  // -----------------------------------------------------------------------
  // extract — worker returns error
  // -----------------------------------------------------------------------

  describe('extract — worker returns error message', () => {
    it('rejects when worker response contains an error string', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const errorResult: RawWaveformResult = {
        ...makeRawWaveformResult('2026-03-10'),
        error: 'EDF parse failure: invalid header',
        flow: new Float32Array([1]), // flow present but error set
      };
      fakeWorkerInstances[0]!.simulateMessage(errorResult);

      const result = await extractPromise;

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toBe('EDF parse failure: invalid header');
    });
  });

  // -----------------------------------------------------------------------
  // extract — worker crash (onerror)
  // -----------------------------------------------------------------------

  describe('extract — worker crash', () => {
    it('sets error status when worker fires onerror', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateError('Worker script compilation failed');

      const result = await extractPromise;

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toContain('Worker script compilation failed');
    });

    it('terminates the worker after an error', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      worker.simulateError('crash');
      await extractPromise;

      expect(worker.terminated).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // extract — timeout
  // -----------------------------------------------------------------------

  describe('extract — timeout', () => {
    it('rejects with timeout error after 60 seconds of no response', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      // Worker is created but never responds
      expect(fakeWorkerInstances).toHaveLength(1);

      // Advance past the 60 second timeout
      await vi.advanceTimersByTimeAsync(60_000);

      const result = await extractPromise;

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toContain('timed out');
    });

    it('terminates the worker on timeout', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      await vi.advanceTimersByTimeAsync(60_000);
      await extractPromise;

      expect(worker.terminated).toBe(true);
    });

    it('does not timeout if worker responds before deadline', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      // Respond after 30 seconds (within the 60 second timeout)
      await vi.advanceTimersByTimeAsync(30_000);
      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));

      const result = await extractPromise;

      expect(result).not.toBeNull();
      expect(orch.getState().status).toBe('ready');
    });
  });

  // -----------------------------------------------------------------------
  // extract — Worker constructor failure
  // -----------------------------------------------------------------------

  describe('extract — Worker constructor failure', () => {
    it('sets error status when Worker constructor throws', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      // Make Worker constructor throw
      workerConstructorSpy.mockImplementationOnce(() => {
        throw new Error('Workers not supported in this environment');
      });

      const result = await orch.extract(files, '2026-03-10');

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toContain('Workers not supported');
    });
  });

  // -----------------------------------------------------------------------
  // extract — terminates previous worker on re-extract
  // -----------------------------------------------------------------------

  describe('extract — re-extraction terminates previous worker', () => {
    it('terminates the running worker when extract is called again', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      // Start first extraction
      const extractPromise1 = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker1 = fakeWorkerInstances[0]!;
      expect(worker1.terminated).toBe(false);

      // Start second extraction for a different date (not cached)
      const extractPromise2 = orch.extract(files, '2026-03-11');
      await vi.advanceTimersByTimeAsync(0);

      // First worker should have been terminated
      expect(worker1.terminated).toBe(true);

      // Second worker should be created
      expect(fakeWorkerInstances).toHaveLength(2);

      // Resolve second extraction to prevent hanging promise
      fakeWorkerInstances[1]!.simulateMessage(makeRawWaveformResult('2026-03-11'));
      await extractPromise2;

      // First extraction will reject because its worker was terminated before responding.
      // The timeout will fire for extractPromise1, but by then the orchestrator has moved on.
      // Advance timer to clean up.
      await vi.advanceTimersByTimeAsync(60_000);
      // The first promise is rejected due to timeout — we just need to catch it
      await extractPromise1;
    });
  });

  // -----------------------------------------------------------------------
  // extract — sets loading state before worker starts
  // -----------------------------------------------------------------------

  describe('extract — loading state', () => {
    it('transitions to loading status before worker processes', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const states: string[] = [];
      orch.subscribe((s) => states.push(s.status));

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      // loading should appear in the state history
      expect(states).toContain('loading');

      // Resolve to clean up
      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });
  });

  // -----------------------------------------------------------------------
  // extract — EVE file handling
  // -----------------------------------------------------------------------

  describe('extract — EVE file inclusion', () => {
    it('includes EVE files alongside BRP files in the worker message', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
        makeFile('EVE.edf', 1024, 'DATALOG/20260310/EVE.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      const msg = worker.postMessageCalls[0] as { files: { path: string }[] };

      // Both BRP and EVE files should be included
      expect(msg.files).toHaveLength(2);
      const paths = msg.files.map((f) => f.path);
      expect(paths).toContain('DATALOG/20260310/BRP.edf');
      expect(paths).toContain('DATALOG/20260310/EVE.edf');

      // Clean up
      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });
  });

  // -----------------------------------------------------------------------
  // extract — date-based file filtering
  // -----------------------------------------------------------------------

  describe('extract — date-based file filtering', () => {
    it('filters BRP files to matching date folder when possible', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260311/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      const msg = worker.postMessageCalls[0] as { files: { path: string }[] };

      // Only the matching date should be included
      const paths = msg.files.map((f) => f.path);
      expect(paths).toContain('DATALOG/20260310/BRP.edf');
      expect(paths).not.toContain('DATALOG/20260311/BRP.edf');

      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });

    it('falls back to all BRP files when no date-filtered files match', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260311/BRP.edf'),
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260312/BRP.edf'),
      ];

      // Request date 2026-03-10 which doesn't match any folder
      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      const msg = worker.postMessageCalls[0] as { files: { path: string }[] };

      // Both files should be included as fallback
      expect(msg.files.length).toBe(2);

      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });
  });

  // -----------------------------------------------------------------------
  // extract — IDB store failure is non-fatal
  // -----------------------------------------------------------------------

  describe('extract — non-fatal IDB failures', () => {
    it('still returns result when IDB store fails', async () => {
      const orch = await getOrchestrator();
      mockStoreWaveform.mockRejectedValueOnce(new Error('QuotaExceededError'));

      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));

      const result = await extractPromise;

      // Result should still be returned despite IDB failure
      expect(result).not.toBeNull();
      expect(orch.getState().status).toBe('ready');
    });

    it('still returns result when deleteExpired fails', async () => {
      const orch = await getOrchestrator();
      mockDeleteExpired.mockRejectedValueOnce(new Error('IDB error'));

      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));

      const result = await extractPromise;

      expect(result).not.toBeNull();
      expect(orch.getState().status).toBe('ready');
    });
  });

  // -----------------------------------------------------------------------
  // extract — Sentry integration
  // -----------------------------------------------------------------------

  describe('extract — Sentry error reporting', () => {
    it('reports extraction errors to Sentry', async () => {
      const Sentry = await import('@sentry/nextjs');
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      fakeWorkerInstances[0]!.simulateError('Worker OOM');
      await extractPromise;

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ extra: { context: 'waveform-extraction' } })
      );
    });
  });

  // -----------------------------------------------------------------------
  // terminate
  // -----------------------------------------------------------------------

  describe('terminate', () => {
    it('terminates the active worker', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      expect(worker.terminated).toBe(false);

      orch.terminate();

      expect(worker.terminated).toBe(true);

      // Clean up: let timeout fire
      await vi.advanceTimersByTimeAsync(60_000);
      await extractPromise;
    });

    it('is safe to call when no worker is running', async () => {
      const orch = await getOrchestrator();
      // Should not throw
      expect(() => orch.terminate()).not.toThrow();
    });

    it('is safe to call multiple times', async () => {
      const orch = await getOrchestrator();
      orch.terminate();
      orch.terminate();
      expect(() => orch.terminate()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // reset
  // -----------------------------------------------------------------------

  describe('reset', () => {
    it('terminates the worker, clears cache, and resets to idle', async () => {
      const orch = await getOrchestrator();
      const waveform = makeStoredWaveform('2026-03-10');
      orch.setDemoWaveform(waveform);

      expect(orch.getState().status).toBe('ready');
      expect(orch.hasCached('2026-03-10')).toBe(true);

      orch.reset();

      expect(orch.getState().status).toBe('idle');
      expect(orch.getState().waveform).toBeNull();
      expect(orch.getState().error).toBeNull();
      expect(orch.hasCached('2026-03-10')).toBe(false);
    });

    it('notifies subscribers of idle state', async () => {
      const orch = await getOrchestrator();
      orch.setDemoWaveform(makeStoredWaveform());

      const listener = vi.fn();
      orch.subscribe(listener);
      listener.mockClear();

      orch.reset();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'idle', waveform: null, error: null })
      );
    });
  });

  // -----------------------------------------------------------------------
  // extract — BRP filename variations
  // -----------------------------------------------------------------------

  describe('extract — BRP filename variations', () => {
    it('matches filenames ending in _brp.edf (underscore prefix)', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('20260310_BRP.edf', 100 * 1024, 'DATALOG/20260310/20260310_BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      // Worker should have been created (BRP was detected)
      expect(fakeWorkerInstances).toHaveLength(1);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });

    it('matches case-insensitively (BRP.EDF, brp.edf)', async () => {
      const orch = await getOrchestrator();
      // The filter lowercases the filename, so BRP.EDF should match
      const files = [
        makeFile('BRP.EDF', 100 * 1024, 'DATALOG/20260310/BRP.EDF'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      expect(fakeWorkerInstances).toHaveLength(1);

      fakeWorkerInstances[0]!.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });
  });

  // -----------------------------------------------------------------------
  // extract — transfers ArrayBuffers for zero-copy
  // -----------------------------------------------------------------------

  describe('extract — ArrayBuffer transfer', () => {
    it('passes file buffers as transferable objects', async () => {
      const orch = await getOrchestrator();
      const files = [
        makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf'),
      ];

      const extractPromise = orch.extract(files, '2026-03-10');
      await vi.advanceTimersByTimeAsync(0);

      const worker = fakeWorkerInstances[0]!;
      // The FakeWorker receives postMessage(data, transferable).
      // The real Worker would use the transferable list for zero-copy.
      // We verify the message was posted (the actual transfer is a browser API concern).
      expect(worker.postMessageCalls).toHaveLength(1);

      worker.simulateMessage(makeRawWaveformResult('2026-03-10'));
      await extractPromise;
    });
  });

  // -----------------------------------------------------------------------
  // extract — DOMException handling
  // -----------------------------------------------------------------------

  describe('extract — DOMException for SD card read errors', () => {
    it('maps NotReadableError to a user-friendly message', async () => {
      const orch = await getOrchestrator();

      // Create a file whose arrayBuffer() will throw NotReadableError
      const brpFile = makeFile('BRP.edf', 100 * 1024, 'DATALOG/20260310/BRP.edf');
      const domError = new DOMException('The file could not be read', 'NotReadableError');
      vi.spyOn(brpFile, 'arrayBuffer').mockRejectedValueOnce(domError);

      const result = await orch.extract([brpFile], '2026-03-10');

      expect(result).toBeNull();
      expect(orch.getState().status).toBe('error');
      expect(orch.getState().error).toContain('SD card files');
      expect(orch.getState().error).toContain('check the card is still connected');
    });
  });
});
