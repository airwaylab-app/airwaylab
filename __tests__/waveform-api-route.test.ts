import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ENGINE_VERSION } from '@/lib/engine-version';

// ── Mocks (module-scope so vi.mock hoisting can access them) ──

const mockUpload = vi.fn();
const mockInsert = vi.fn();
const mockRemove = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
      }),
    },
    from: () => ({
      insert: mockInsert,
    }),
  })),
}));

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}));

vi.mock('@/lib/rate-limit', () => {
  class MockRateLimiter {
    isLimited() { return false; }
  }
  return {
    RateLimiter: MockRateLimiter,
    getRateLimitKey: vi.fn(() => '127.0.0.1'),
    getUserRateLimitKey: vi.fn((id: string) => `user:${id}`),
  };
});

// ── Helpers ──────────────────────────────────────────────────

function makeRequest(overrides: Partial<{
  body: ArrayBuffer;
  headers: Record<string, string>;
}> = {}) {
  const flowData = new Float32Array([1.0, 2.0, 3.0]);
  const body = overrides.body ?? flowData.buffer;

  const baseHeaders: Record<string, string> = {
    'content-type': 'application/octet-stream',
    'content-encoding': 'gzip',
    'x-night-date': '2025-01-15',
    'x-contribution-id': 'test-contribution-id',
    'x-engine-version': ENGINE_VERSION,
    'x-sampling-rate': '25',
    'x-duration-seconds': '28800',
    'x-sample-count': '720000',
    'x-device-model': 'AirSense 10',
    'x-pap-mode': 'APAP',
    'x-analysis-results': JSON.stringify({ glasgow: { overall: 2.1 } }),
    'x-consent-confirmed': 'true',
    ...overrides.headers,
  };

  const headers = new Headers(baseHeaders);

  return new Request('https://airwaylab.app/api/contribute-waveforms', {
    method: 'POST',
    headers,
    body,
  });
}

// ── Tests ────────────────────────────────────────────────────

describe('contribute-waveforms API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
  });

  it('accepts valid waveform upload and stores to Supabase', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const request = makeRequest();
    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);

    // Verify storage upload was called
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const uploadArgs = mockUpload.mock.calls[0];
    expect(uploadArgs![0]).toBe('test-contribution-id/2025-01-15.flow.gz');

    // Verify DB insert was called with correct metadata
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertData = mockInsert.mock.calls[0]![0];
    expect(insertData.contribution_id).toBe('test-contribution-id');
    expect(insertData.night_date).toBe('2025-01-15');
    expect(insertData.engine_version).toBe(ENGINE_VERSION);
    expect(insertData.sampling_rate).toBe(25);
    expect(insertData.device_model).toBe('AirSense 10');
    expect(insertData.pap_mode).toBe('APAP');
    expect(insertData.storage_path).toBe('test-contribution-id/2025-01-15.flow.gz');
  });

  it('uses .bin extension when not compressed', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const headers = new Headers({
      'content-type': 'application/octet-stream',
      'x-night-date': '2025-01-15',
      'x-contribution-id': 'test-contribution-id',
      'x-engine-version': ENGINE_VERSION,
      'x-sampling-rate': '25',
      'x-duration-seconds': '28800',
      'x-sample-count': '720000',
      'x-device-model': 'AirSense 10',
      'x-pap-mode': 'APAP',
      'x-analysis-results': JSON.stringify({ glasgow: { overall: 2.1 } }),
    'x-consent-confirmed': 'true',
      // No content-encoding header → not compressed
    });

    const request = new Request('https://airwaylab.app/api/contribute-waveforms', {
      method: 'POST',
      headers,
      body: new Float32Array([1, 2, 3]).buffer,
    });

    await POST(request as never);

    const uploadPath = mockUpload.mock.calls[0]?.[0];
    expect(uploadPath).toBe('test-contribution-id/2025-01-15.flow.bin');
  });

  it('rejects request with missing required headers', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    // Without consent header -> 403
    const noConsent = new Request('https://airwaylab.app/api/contribute-waveforms', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: new Uint8Array([1, 2, 3]),
    });
    const consentResponse = await POST(noConsent as never);
    expect(consentResponse.status).toBe(403);

    // With consent but missing other headers -> 400
    const noHeaders = new Request('https://airwaylab.app/api/contribute-waveforms', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-consent-confirmed': 'true' },
      body: new Uint8Array([1, 2, 3]),
    });
    const headerResponse = await POST(noHeaders as never);
    expect(headerResponse.status).toBe(400);
  });

  it('rejects request with invalid date format', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const request = makeRequest({
      headers: { 'x-night-date': '15-01-2025' },
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });

  it('rejects empty body', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const request = makeRequest({ body: new ArrayBuffer(0) });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });

  it('rejects oversized payload via content-length header', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const request = makeRequest({
      headers: { 'content-length': String(6 * 1024 * 1024) },
    });
    const response = await POST(request as never);
    expect(response.status).toBe(413);
  });

  it('handles duplicate upload idempotently', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    mockUpload.mockResolvedValue({
      error: { message: 'The resource already exists' },
    });

    const request = makeRequest();
    const response = await POST(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.duplicate).toBe(true);

    // Should NOT insert DB row for duplicate
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('cleans up storage on DB insert failure', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    mockInsert.mockResolvedValue({
      error: { message: 'unique constraint violated' },
    });

    const request = makeRequest();
    const response = await POST(request as never);

    expect(response.status).toBe(500);

    // Should have attempted to clean up the orphaned storage file
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove.mock.calls[0]![0]).toEqual(['test-contribution-id/2025-01-15.flow.gz']);
  });

  it('rejects invalid JSON in analysis results header', async () => {
    const { POST } = await import('@/app/api/contribute-waveforms/route');

    const request = makeRequest({
      headers: { 'x-analysis-results': 'not-json' },
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });
});
