import { describe, it, expect } from 'vitest';
import { isTransientServerError, getPartialFailureLevel, filterUploadableFiles, classifyUploadError, parseRetryAfterMs } from '@/lib/storage/upload-orchestrator';

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

describe('getPartialFailureLevel', () => {
  it('returns error when all files failed (uploaded === 0)', () => {
    expect(getPartialFailureLevel(0, 3)).toBe('error');
  });

  it('returns error when failed > 5 even if some uploaded', () => {
    expect(getPartialFailureLevel(10, 6)).toBe('error');
    expect(getPartialFailureLevel(100, 20)).toBe('error');
  });

  it('returns warning when failed <= 5 and some uploaded', () => {
    expect(getPartialFailureLevel(10, 5)).toBe('warning');
    expect(getPartialFailureLevel(50, 1)).toBe('warning');
    expect(getPartialFailureLevel(10, 3)).toBe('warning');
  });

  it('returns error at the boundary (failed === 6)', () => {
    expect(getPartialFailureLevel(10, 6)).toBe('error');
  });

  it('returns warning at the boundary (failed === 5)', () => {
    expect(getPartialFailureLevel(10, 5)).toBe('warning');
  });

  it('returns error when uploaded === 0 and failed === 0', () => {
    // Edge case: no files processed at all
    expect(getPartialFailureLevel(0, 0)).toBe('error');
  });
});

describe('filterUploadableFiles', () => {
  it('excludes files with size === 0 from uploadable list', () => {
    const empty = new File([], 'CSL.edf');
    const real = new File(['data'], 'STR.edf');
    const { uploadable, emptyCount } = filterUploadableFiles([empty, real]);
    expect(uploadable).toHaveLength(1);
    expect(uploadable[0]).toBe(real);
    expect(emptyCount).toBe(1);
  });

  it('returns all files when none are empty', () => {
    const f1 = new File(['a'], 'DATALOG.edf');
    const f2 = new File(['b'], 'STR.edf');
    const { uploadable, emptyCount } = filterUploadableFiles([f1, f2]);
    expect(uploadable).toHaveLength(2);
    expect(emptyCount).toBe(0);
  });

  it('returns empty uploadable list when all files are 0-byte', () => {
    const e1 = new File([], 'CSL.edf');
    const e2 = new File([], 'STR.edf');
    const { uploadable, emptyCount } = filterUploadableFiles([e1, e2]);
    expect(uploadable).toHaveLength(0);
    expect(emptyCount).toBe(2);
  });

  it('returns empty lists for empty input', () => {
    const { uploadable, emptyCount } = filterUploadableFiles([]);
    expect(uploadable).toHaveLength(0);
    expect(emptyCount).toBe(0);
  });

  it('counts multiple empty files accurately', () => {
    const files = [
      new File([], 'a.edf'),
      new File(['x'], 'b.edf'),
      new File([], 'c.edf'),
      new File(['y'], 'd.edf'),
      new File([], 'e.edf'),
    ];
    const { uploadable, emptyCount } = filterUploadableFiles(files);
    expect(uploadable).toHaveLength(2);
    expect(emptyCount).toBe(3);
  });
});

describe('classifyUploadError', () => {
  it('classifies auth errors from preflight 401', () => {
    expect(classifyUploadError('Cloud sync requires an active session. Please sign in again.')).toBe('auth');
  });

  it('classifies auth errors from preflight 403', () => {
    expect(classifyUploadError('Cloud sync is not available. Please sign in again.')).toBe('auth');
  });

  it('classifies auth errors from checkExisting 401', () => {
    expect(classifyUploadError('Cloud sync requires an active session. Please sign in again.')).toBe('auth');
  });

  it('classifies consent errors (not enabled)', () => {
    expect(classifyUploadError('Cloud sync is not enabled. Enable it from your dashboard to back up your files.')).toBe('consent');
  });

  it('classifies consent errors (not available without sign-in language)', () => {
    expect(classifyUploadError('Cloud sync is not available on your current plan.')).toBe('consent');
  });

  it('classifies hash worker errors', () => {
    expect(classifyUploadError('Hash failed for file 3: out of memory')).toBe('hash_worker');
    expect(classifyUploadError('Hash worker failed')).toBe('hash_worker');
  });

  it('classifies network errors', () => {
    expect(classifyUploadError('Failed to fetch')).toBe('network');
    expect(classifyUploadError('NetworkError when attempting to fetch resource.')).toBe('network');
    expect(classifyUploadError('Network timeout')).toBe('network');
  });

  it('classifies consent-fix POST failures as consent', () => {
    expect(classifyUploadError('Could not enable cloud storage. Please try again or check Account Settings.')).toBe('consent');
  });

  it('returns unknown for unrecognised errors', () => {
    expect(classifyUploadError('Unexpected error')).toBe('unknown');
    expect(classifyUploadError('')).toBe('unknown');
  });

  it('is case-insensitive for all categories', () => {
    expect(classifyUploadError('CLOUD SYNC REQUIRES AN ACTIVE SESSION. PLEASE SIGN IN AGAIN.')).toBe('auth');
    expect(classifyUploadError('HASH FAILED for file 1: error')).toBe('hash_worker');
    expect(classifyUploadError('FAILED TO FETCH')).toBe('network');
  });
});

describe('parseRetryAfterMs', () => {
  it('parses delta-seconds into milliseconds', () => {
    expect(parseRetryAfterMs('5')).toBe(5000);
    expect(parseRetryAfterMs('0')).toBe(0);
    expect(parseRetryAfterMs('120')).toBe(120000);
  });

  it('returns undefined for a missing or empty header', () => {
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs('')).toBeUndefined();
  });

  it('returns undefined for an unparseable value', () => {
    expect(parseRetryAfterMs('soon')).toBeUndefined();
  });

  it('clamps negative deltas to zero', () => {
    expect(parseRetryAfterMs('-10')).toBe(0);
  });

  it('parses an HTTP-date into a non-negative delay', () => {
    const ms = parseRetryAfterMs(new Date(Date.now() + 30_000).toUTCString());
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThanOrEqual(31_000);
  });
});
