// ============================================================
// AirwayLab — dashboard summary IndexedDB store
// Single-record store ('current') holding the bulk-stripped NightResult JSON
// that powers the dashboard. Migrated off localStorage (lib/persistence.ts) to
// remove the ~4 MB browser cap that surfaced to users as "Storage limit reached".
// The blob is the SAME JSON string localStorage held, so all validation /
// version / migration logic in persistence.ts is unchanged — only the backing
// store moves here (IndexedDB has GB-scale quota).
// ============================================================

import { runTx, DASHBOARD_SUMMARY_STORE_NAME } from './idb-core';

const SUMMARY_ID = 'current';

interface SummaryRecord {
  id: string;
  json: string;
  savedAt: number;
}

/** Write (overwrite) the single summary record. Rejects with a typed QuotaError
 *  on quota pressure (see idb-core runTx) so the caller can fall back. */
export async function saveSummaryRecord(json: string, savedAt: number): Promise<void> {
  await runTx(DASHBOARD_SUMMARY_STORE_NAME, 'readwrite', (tx) =>
    tx.objectStore(DASHBOARD_SUMMARY_STORE_NAME).put({ id: SUMMARY_ID, json, savedAt } as SummaryRecord),
  );
}

/** Read the summary record, or null if absent / malformed. */
export async function readSummaryRecord(): Promise<{ json: string; savedAt: number } | null> {
  const rec = await runTx<SummaryRecord | undefined>(
    DASHBOARD_SUMMARY_STORE_NAME,
    'readonly',
    (tx) => tx.objectStore(DASHBOARD_SUMMARY_STORE_NAME).get(SUMMARY_ID),
  );
  if (!rec || typeof rec.json !== 'string') return null;
  return { json: rec.json, savedAt: typeof rec.savedAt === 'number' ? rec.savedAt : 0 };
}

/** Delete the summary record. */
export async function clearSummaryRecord(): Promise<void> {
  await runTx(DASHBOARD_SUMMARY_STORE_NAME, 'readwrite', (tx) =>
    tx.objectStore(DASHBOARD_SUMMARY_STORE_NAME).delete(SUMMARY_ID),
  );
}
