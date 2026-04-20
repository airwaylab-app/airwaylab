import { describe, it, expect } from 'vitest';
import { isTransientServerError, getPartialFailureLevel } from '@/lib/storage/upload-orchestrator';

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
