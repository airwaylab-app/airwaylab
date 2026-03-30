import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTransientServerError, uploadOrchestrator } from '@/lib/storage/upload-orchestrator';

// ── Mock dependencies ─────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/file-manifest', () => ({
  extractNightDate: vi.fn(() => '2026-03-15'),
}));

vi.mock('@/components/upload/cloud-sync-nudge', () => ({
  hasCloudSyncConsent: vi.fn(() => false),
}));

vi.mock('@/lib/storage/hash-cache', () => ({
  HashCache: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    flush: vi.fn(),
  })),
}));

// ── Helpers ──────────────────────────────────────────────────

function makeMockFile(name: string, size = 1024): File {
  const buffer = new ArrayBuffer(size);
  const file = new File([buffer], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'webkitRelativePath', { value: `DATALOG/20260315/${name}` });
  return file;
}

// ── Tests: isTransientServerError ────────────────────────────

describe('isTransientServerError', () => {
  it('identifies 502 Bad Gateway as transient', () => {
    expect(isTransientServerError('Upload failed: 502')).toBe(true);
  });

  it('identifies 503 Service Unavailable as transient', () => {
    expect(isTransientServerError('Upload failed: 503')).toBe(true);
  });

  it('identifies 504 Gateway Timeout as transient', () => {
    expect(isTransientServerError('Presign failed: 504')).toBe(true);
  });

  it('identifies 520 (Cloudflare) as transient', () => {
    expect(isTransientServerError('Upload failed: 520')).toBe(true);
  });

  it('identifies transient errors embedded in longer messages', () => {
    expect(isTransientServerError('server returned 503 temporarily')).toBe(true);
    expect(isTransientServerError('error code: 502 bad gateway')).toBe(true);
  });

  it('does not flag 200 OK as transient', () => {
    expect(isTransientServerError('Upload succeeded: 200')).toBe(false);
  });

  it('does not flag 400 Bad Request as transient', () => {
    expect(isTransientServerError('Presign failed: 400')).toBe(false);
  });

  it('does not flag 401 Unauthorized as transient', () => {
    expect(isTransientServerError('Unauthorized: 401')).toBe(false);
  });

  it('does not flag 403 Forbidden as transient', () => {
    expect(isTransientServerError('Forbidden: 403')).toBe(false);
  });

  it('does not flag 404 Not Found as transient', () => {
    expect(isTransientServerError('Not found: 404')).toBe(false);
  });

  it('does not flag 429 Rate Limited as transient', () => {
    expect(isTransientServerError('Too many requests: 429')).toBe(false);
  });

  it('does not flag 500 Internal Server Error as transient', () => {
    expect(isTransientServerError('Internal server error: 500')).toBe(false);
  });

  it('does not flag generic error messages without status codes', () => {
    expect(isTransientServerError('Network timeout')).toBe(false);
    expect(isTransientServerError('Failed to fetch')).toBe(false);
    expect(isTransientServerError('')).toBe(false);
  });

  it('does not match partial number sequences', () => {
    // 5020 should not match 502
    expect(isTransientServerError('error code 5020')).toBe(false);
    // 1503 should not match 503
    expect(isTransientServerError('request id 1503')).toBe(false);
  });
});

// ── Tests: uploadOrchestrator singleton ──────────────────────

describe('uploadOrchestrator', () => {
  beforeEach(() => {
    uploadOrchestrator.reset();
    vi.restoreAllMocks();
  });

  describe('getState / initial state', () => {
    it('starts in idle status', () => {
      const state = uploadOrchestrator.getState();
      expect(state.status).toBe('idle');
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });

    it('has zeroed progress initially', () => {
      const { progress } = uploadOrchestrator.getState();
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.bytesUploaded).toBe(0);
      expect(progress.bytesTotal).toBe(0);
      expect(progress.stage).toBe('hashing');
      expect(progress.skippedExisting).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('immediately calls listener with current state', () => {
      const listener = vi.fn();
      uploadOrchestrator.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(uploadOrchestrator.getState());
    });

    it('returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = uploadOrchestrator.subscribe(listener);
      expect(typeof unsub).toBe('function');
      unsub();
      // After unsubscribe, listener should not be called on state changes
      uploadOrchestrator.abort();
      // listener was called once on subscribe, should not be called again
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      uploadOrchestrator.subscribe(listener1);
      uploadOrchestrator.subscribe(listener2);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('abort', () => {
    it('sets status to idle with cancellation error', () => {
      uploadOrchestrator.abort();
      const state = uploadOrchestrator.getState();
      expect(state.status).toBe('idle');
      expect(state.error).toBe('Upload cancelled');
    });

    it('notifies listeners on abort', () => {
      const listener = vi.fn();
      uploadOrchestrator.subscribe(listener);
      listener.mockClear();

      uploadOrchestrator.abort();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]![0].error).toBe('Upload cancelled');
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      uploadOrchestrator.abort(); // puts error state
      uploadOrchestrator.reset();
      const state = uploadOrchestrator.getState();
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.result).toBeNull();
      expect(state.progress.current).toBe(0);
    });
  });

  describe('upload', () => {
    it('returns empty result for zero files', async () => {
      const result = await uploadOrchestrator.upload([]);
      expect(result).toEqual({ uploaded: 0, skipped: 0, failed: 0, errors: [] });
    });

    it('returns error result when preflight returns 401', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const file = makeMockFile('BRP.edf');
      const result = await uploadOrchestrator.upload([file]);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('active session');
    });

    it('returns error result when preflight returns 403', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const file = makeMockFile('BRP.edf');
      const result = await uploadOrchestrator.upload([file]);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('not available');
    });

    it('returns error when consent check says no and no localStorage consent', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ consent: false }),
      });

      const file = makeMockFile('BRP.edf');
      const result = await uploadOrchestrator.upload([file]);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('not enabled');
    });

    it('sets status to error when upload pipeline fails', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const listener = vi.fn();
      uploadOrchestrator.subscribe(listener);

      const file = makeMockFile('BRP.edf');
      await uploadOrchestrator.upload([file]);

      const finalState = uploadOrchestrator.getState();
      expect(finalState.status).toBe('error');
    });

    it('reports Sentry on non-cancelled errors', async () => {
      const Sentry = await import('@sentry/nextjs');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const file = makeMockFile('BRP.edf');
      await uploadOrchestrator.upload([file]);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'cloud_upload_failed',
        expect.objectContaining({
          level: 'error',
        }),
      );
    });
  });
});
