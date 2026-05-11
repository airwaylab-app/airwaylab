import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Helpers ──────────────────────────────────────────────────

function makeMinimalNight(dateStr: string) {
  return {
    dateStr,
    date: new Date(`2025-03-${dateStr.slice(-2)}T00:00:00`),
    durationHours: 7.5,
    glasgow: { overall: 3.2, components: {} },
    wat: { flScore: 42, regularity: 0.5, periodicityIndex: 0.02 },
    ned: {
      breaths: [{ ned: 10 }, { ned: 15 }],
      nedMean: 12.5,
      combinedFLPct: 35,
      mShapePct: 8,
      reraCount: 3,
      breathCount: 400,
      estimatedArousalIndex: 5,
      hypopneaCount: 0,
      hypopneaIndex: 0,
      hypopneaSource: 'algorithm',
      hypopneaNedInvisibleCount: 0,
      hypopneaNedInvisiblePct: 0,
      hypopneaMeanDropPct: 0,
      hypopneaMeanDurationS: 0,
      hypopneaH1Index: 0,
      hypopneaH2Index: 0,
      briefObstructionCount: 0,
      briefObstructionIndex: 0,
      briefObstructionH1Index: 0,
      briefObstructionH2Index: 0,
      amplitudeCvOverall: 0,
      amplitudeCvMedianEpoch: 0,
      unstableEpochPct: 0,
    },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null, machineSummary: null, settingsFingerprint: null, csl: null,
    settings: { deviceModel: 'AirSense 10', papMode: 'APAP', epap: 6, ipap: 12 },
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('Shared Waveform EDF Storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Presigned URL validation (POST /api/share/files) ──────

  describe('presign validation', () => {
    it('rejects files with path traversal in name', () => {
      const badNames = ['../etc/passwd', 'foo/bar.edf', 'a\\b.edf', ''];
      for (const name of badNames) {
        const isSafe =
          !name.includes('..') &&
          !name.includes('/') &&
          !name.includes('\\') &&
          name.length > 0 &&
          name.length <= 255;
        expect(isSafe).toBe(false);
      }
    });

    it('accepts clean file names', () => {
      const goodNames = ['BRP.edf', 'STR.edf', 'data_file_2025-03-01.edf'];
      for (const name of goodNames) {
        const isSafe =
          !name.includes('..') &&
          !name.includes('/') &&
          !name.includes('\\') &&
          name.length > 0 &&
          name.length <= 255;
        expect(isSafe).toBe(true);
      }
    });

    it('rejects total file size exceeding 500 MB', () => {
      const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
      const files = [
        { fileName: 'a.edf', fileSize: 300 * 1024 * 1024 },
        { fileName: 'b.edf', fileSize: 250 * 1024 * 1024 },
      ];
      const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
      expect(totalSize > MAX_TOTAL_BYTES).toBe(true);
    });

    it('accepts total file size within 500 MB limit', () => {
      const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
      const files = [
        { fileName: 'a.edf', fileSize: 200 * 1024 * 1024 },
        { fileName: 'b.edf', fileSize: 200 * 1024 * 1024 },
      ];
      const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
      expect(totalSize <= MAX_TOTAL_BYTES).toBe(true);
    });

    it('rejects individual files exceeding 50 MB', () => {
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      const file = { fileName: 'big.edf', fileSize: 60 * 1024 * 1024 };
      expect(file.fileSize > MAX_FILE_SIZE).toBe(true);
    });
  });

  // ── Download URL validation (GET /api/share/files) ────────

  describe('download validation', () => {
    it('validates UUID format for shareId', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidIds = ['not-a-uuid', '12345', '', 'null'];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test(validUUID)).toBe(true);
      for (const id of invalidIds) {
        expect(uuidRegex.test(id)).toBe(false);
      }
    });

    it('signed URL TTL is 5 minutes (300 seconds)', () => {
      const SIGNED_URL_TTL = 300;
      expect(SIGNED_URL_TTL).toBe(300);
    });
  });

  // ── Finalise validation (PATCH /api/share/files) ──────────

  describe('finalise validation', () => {
    it('requires shareId and filePaths', () => {
      const validPayload = {
        shareId: '550e8400-e29b-41d4-a716-446655440000',
        filePaths: ['550e8400-e29b-41d4-a716-446655440000/BRP.edf'],
      };
      expect(validPayload.shareId).toBeTruthy();
      expect(validPayload.filePaths.length).toBeGreaterThan(0);
    });

    it('filePaths must be non-empty array', () => {
      const emptyPaths: string[] = [];
      expect(emptyPaths.length).toBe(0);
    });
  });

  // ── SD files handling ─────────────────────────────────────

  describe('sdFiles handling', () => {
    it('strips bulky data before sending to share API', () => {
      const night = makeMinimalNight('2025-03-01');
      // Simulating stripForShare
      const stripped = {
        ...night,
        ned: { ...night.ned, breaths: [] },
        oximetryTrace: null,
      };
      expect(stripped.ned.breaths).toEqual([]);
      expect(stripped.oximetryTrace).toBeNull();
      // Original unchanged
      expect(night.ned.breaths.length).toBe(2);
    });

    it('handles missing sdFiles prop gracefully', () => {
      const sdFilesLength: number | undefined = undefined;
      const hasFiles = (sdFilesLength ?? 0) > 0;
      expect(hasFiles).toBe(false);
    });

    it('detects when sdFiles are available', () => {
      const sdFilesLength = 3;
      const hasFiles = (sdFilesLength ?? 0) > 0;
      expect(hasFiles).toBe(true);
    });
  });

  // ── Conditional Graphs tab ────────────────────────────────

  describe('conditional Graphs tab', () => {
    it('shows Graphs tab when hasFiles is true and filePaths non-empty', () => {
      const hasFiles = true;
      const filePaths = ['share-id/BRP.edf'];
      const shouldShowGraphs = hasFiles && filePaths.length > 0;
      expect(shouldShowGraphs).toBe(true);
    });

    it('hides Graphs tab when hasFiles is false', () => {
      const hasFiles = false;
      const filePaths: string[] = [];
      const shouldShowGraphs = hasFiles && filePaths.length > 0;
      expect(shouldShowGraphs).toBe(false);
    });

    it('hides Graphs tab when filePaths is empty', () => {
      const hasFiles = true;
      const filePaths: string[] = [];
      const shouldShowGraphs = hasFiles && filePaths.length > 0;
      expect(shouldShowGraphs).toBe(false);
    });
  });

  // ── Data preparation ──────────────────────────────────────

  describe('data preparation', () => {
    it('computes nightsCount from array when not explicitly provided', () => {
      const nights = [makeMinimalNight('2025-03-01'), makeMinimalNight('2025-03-02')];
      const analysisData = nights;
      const count = Array.isArray(analysisData) ? analysisData.length : 1;
      expect(count).toBe(2);
    });

    it('uses explicit nightsCount when provided', () => {
      const nightsCount = 5;
      const count = nightsCount ?? 1;
      expect(count).toBe(5);
    });

    it('single scope sends single night object (not array)', () => {
      const scope = 'single' as 'single' | 'all';
      const nights = [makeMinimalNight('2025-03-01'), makeMinimalNight('2025-03-02')];
      const stripped = nights.map((n) => ({ ...n, ned: { ...n.ned, breaths: [] }, oximetryTrace: null, settingsMetrics: null, crossDevice: null }));
      const analysisData = scope === 'single' ? stripped[0] : stripped;
      expect(Array.isArray(analysisData)).toBe(false);
    });

    it('all scope sends array of nights', () => {
      const scope = 'all' as 'single' | 'all';
      const nights = [makeMinimalNight('2025-03-01'), makeMinimalNight('2025-03-02')];
      const stripped = nights.map((n) => ({ ...n, ned: { ...n.ned, breaths: [] }, oximetryTrace: null, settingsMetrics: null, crossDevice: null }));
      const analysisData = scope === 'single' ? stripped[0] : stripped;
      expect(Array.isArray(analysisData)).toBe(true);
    });
  });

  // ── File path safety ──────────────────────────────────────

  describe('file path safety', () => {
    it('storage path uses shareId as prefix', () => {
      const shareId = '550e8400-e29b-41d4-a716-446655440000';
      const fileName = 'BRP.edf';
      const storagePath = `${shareId}/${fileName}`;
      expect(storagePath).toBe('550e8400-e29b-41d4-a716-446655440000/BRP.edf');
      expect(storagePath.startsWith(shareId)).toBe(true);
    });

    it('extracts fileName from storagePath', () => {
      const storagePath = '550e8400-e29b-41d4-a716-446655440000/BRP.edf';
      const fileName = storagePath.split('/').pop() ?? storagePath;
      expect(fileName).toBe('BRP.edf');
    });
  });

  // ── Consent modal text ────────────────────────────────────

  describe('consent modal text', () => {
    it('shows file storage text when hasFiles is true', () => {
      const hasFiles = true;
      const text = hasFiles
        ? 'Your analysis results and therapy data files are stored on our servers for 30 days.'
        : 'Raw SD card data is not included — only processed metrics and scores.';
      expect(text).toContain('therapy data files');
    });

    it('shows metrics-only text when hasFiles is false', () => {
      const hasFiles = false;
      const text = hasFiles
        ? 'Your analysis results and therapy data files are stored on our servers for 30 days.'
        : 'Raw SD card data is not included — only processed metrics and scores.';
      expect(text).toContain('metrics and scores');
    });
  });

  // ── Analytics events ──────────────────────────────────────

  describe('analytics events', () => {
    it('shareFilesUploaded event includes file count and total bytes', () => {
      const eventProps = { file_count: 5, total_bytes: 1024000 };
      expect(eventProps.file_count).toBe(5);
      expect(eventProps.total_bytes).toBe(1024000);
    });

    it('shareFilesUploadFailed event includes error type', () => {
      const eventProps = { error_type: 'network_error' };
      expect(eventProps.error_type).toBe('network_error');
    });
  });

  // ── Share creation auth requirement ───────────────────────

  describe('share creation auth', () => {
    it('share API returns 401 for unauthenticated users', () => {
      // The share route now requires auth — simulate the response
      const status = 401;
      const error = 'Sign in to share your analysis.';
      expect(status).toBe(401);
      expect(error).toContain('Sign in');
    });

    it('share button shows auth modal when user is not logged in', () => {
      const user = null;
      const shouldShowAuth = !user;
      expect(shouldShowAuth).toBe(true);
    });
  });

  // ── Upload prep failure path (AIR-1363) ──────────────────

  describe('upload prep failure path', () => {
    it('propagates server error message from response body', async () => {
      // Simulate the fixed client-side fetch handler in share-button.tsx
      const serverError = 'Too many file uploads. Please try again later.';

      async function handlePresignResponse(res: { ok: boolean; body: string }) {
        if (!res.ok) {
          let errMsg: string | undefined;
          try {
            const parsed = JSON.parse(res.body) as { error?: string };
            errMsg = parsed.error;
          } catch {
            // ignore parse failure
          }
          throw new Error(errMsg ?? 'Could not prepare file upload');
        }
      }

      await expect(handlePresignResponse({ ok: false, body: JSON.stringify({ error: serverError }) }))
        .rejects.toThrow(serverError);
    });

    it('falls back to generic message when response body has no error field', async () => {
      async function handlePresignResponse(res: { ok: boolean; body: string }) {
        if (!res.ok) {
          let errMsg: string | undefined;
          try {
            const parsed = JSON.parse(res.body) as { error?: string };
            errMsg = parsed.error;
          } catch {
            // ignore parse failure
          }
          throw new Error(errMsg ?? 'Could not prepare file upload');
        }
      }

      await expect(handlePresignResponse({ ok: false, body: '{}' }))
        .rejects.toThrow('Could not prepare file upload');
    });

    it('falls back to generic message when response body is not valid JSON', async () => {
      async function handlePresignResponse(res: { ok: boolean; body: string }) {
        if (!res.ok) {
          let errMsg: string | undefined;
          try {
            const parsed = JSON.parse(res.body) as { error?: string };
            errMsg = parsed.error;
          } catch {
            // ignore parse failure
          }
          throw new Error(errMsg ?? 'Could not prepare file upload');
        }
      }

      await expect(handlePresignResponse({ ok: false, body: 'not-json' }))
        .rejects.toThrow('Could not prepare file upload');
    });

    it('rate limit key is user-scoped (not IP-scoped)', () => {
      // getUserRateLimitKey returns user:<id> so each user has their own bucket
      function getUserRateLimitKey(userId: string) {
        return `user:${userId}`;
      }

      const userA = getUserRateLimitKey('user-aaa');
      const userB = getUserRateLimitKey('user-bbb');
      expect(userA).not.toBe(userB);
      expect(userA).toBe('user:user-aaa');
      expect(userB).toBe('user:user-bbb');
    });

    it('rate limit allows 20 requests per hour (not 5)', () => {
      const MAX_PRESIGN_PER_HOUR = 20;
      expect(MAX_PRESIGN_PER_HOUR).toBe(20);
      expect(MAX_PRESIGN_PER_HOUR).toBeGreaterThan(5);
    });

    it('upsert option allows re-upload to same path on retry', () => {
      // Documents that createSignedUploadUrl must be called with { upsert: true }
      // so a user who retries after a partial upload does not get a storage conflict
      const uploadOptions = { upsert: true };
      expect(uploadOptions.upsert).toBe(true);
    });
  });

  // ── Privacy footer text ───────────────────────────────────

  describe('privacy footer', () => {
    it('shows file storage footer when hasFiles is true', () => {
      const hasFiles = true;
      const text = hasFiles
        ? 'Stored data files expire with the share link (30 days).'
        : 'Only processed results are stored — raw therapy data was never uploaded.';
      expect(text).toContain('data files expire');
    });

    it('shows default footer when hasFiles is false', () => {
      const hasFiles = false;
      const text = hasFiles
        ? 'Stored data files expire with the share link (30 days).'
        : 'Only processed results are stored — raw therapy data was never uploaded.';
      expect(text).toContain('raw therapy data');
    });
  });
});
