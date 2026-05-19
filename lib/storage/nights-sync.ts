import type { NightResult } from '@/lib/types';

const BATCH_SIZE = 50;

type SyncResult = { synced: number; skipped: number; failed: number };

function stripBulkData(night: NightResult): Record<string, unknown> {
  const { breaths: _breaths, reras: _reras, ...nedSummary } = night.ned;
  const { oximetryTrace: _oximetryTrace, ...rest } = night as NightResult & { oximetryTrace?: unknown };
  return {
    ...rest,
    ned: nedSummary,
    oximetry: night.oximetry ?? null,
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
