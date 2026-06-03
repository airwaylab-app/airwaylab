import type { NightResult } from '@/lib/types';

const BATCH_SIZE = 50;

/**
 * Restore Date objects on nights that came through JSON serialization.
 * JSON.parse converts Date → ISO string; this reverses that for the two
 * Date fields on NightResult (date, sessionStartTime).
 */
function restoreDateFields(nights: NightResult[]): NightResult[] {
  for (const night of nights) {
    if (night.date && !(night.date instanceof Date)) {
      night.date = new Date(night.date as unknown as string);
    }
    if (night.sessionStartTime !== undefined && !(night.sessionStartTime instanceof Date)) {
      night.sessionStartTime = new Date(night.sessionStartTime as unknown as string);
    }
  }
  return nights;
}

/**
 * Fetches the user's stored nights from the cloud (GET /api/nights).
 * Throws on non-OK response so callers can treat it as non-fatal.
 */
export async function fetchNightsFromCloud(): Promise<NightResult[]> {
  const res = await fetch('/api/nights', {
    method: 'GET',
    credentials: 'same-origin',
  });

  if (!res.ok) {
    throw new Error(`[nights-sync] cloud fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as { nights?: NightResult[] };
  return restoreDateFields(data.nights ?? []);
}

type SyncResult = { synced: number; skipped: number; failed: number };

function stripBulkData(night: NightResult): Record<string, unknown> {
  const { breaths: _breaths, reras: _reras, ...nedSummary } = night.ned;
  const { oximetryTrace: _oximetryTrace, ...rest } = night as NightResult & { oximetryTrace?: unknown };
  const csl = night.csl as Record<string, unknown> | null | undefined;
  return {
    ...rest,
    ned: nedSummary,
    oximetry: night.oximetry ?? null,
    csl: csl ? { ...csl, episodes: [] } : (csl ?? null),
  };
}

/**
 * Syncs analysis results to the user's cloud account.
 * Batches in chunks of 50, strips bulk data before sending.
 * Non-fatal: failed batches increment `failed` but do not throw.
 */
export async function syncAnalysisToCloud(nights: NightResult[]): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, failed: 0 };

  const stripped = nights.map(stripBulkData);

  for (let i = 0; i < stripped.length; i += BATCH_SIZE) {
    const batch = stripped.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch('/api/nights/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ nights: batch }),
      });

      if (!res.ok) {
        console.error('[nights-sync] batch failed', { status: res.status, batchStart: i });
        result.failed += batch.length;
        continue;
      }

      const data = (await res.json()) as { synced?: number; skipped?: number };
      result.synced += data.synced ?? 0;
      result.skipped += data.skipped ?? 0;
    } catch (err) {
      console.error('[nights-sync] batch error', { batchStart: i, err });
      result.failed += batch.length;
    }
  }

  return result;
}
