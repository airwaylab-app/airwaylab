import {
  runTx,
  WAVEFORM_STORE_NAME,
  OXIMETRY_STORE_NAME,
  BREATH_DATA_STORE_NAME,
  PLD_TRACES_STORE_NAME,
  DASHBOARD_SUMMARY_STORE_NAME,
} from '@/lib/idb-core';
import { clearPersistedNights } from '@/lib/persistence';

/**
 * Wipe ALL browser-local AirwayLab data on this device: the localStorage
 * dashboard summary (+ file manifest) AND every IndexedDB store (waveforms,
 * oximetry traces, breath data, PLD traces, dashboard summary).
 *
 * This is the non-destructive way to free local space and clear a
 * "Storage limit reached" message. It does NOT touch the user's account
 * or any server-side data — re-uploading the SD card restores everything.
 *
 * Best-effort across layers: a failure clearing localStorage never blocks
 * the IndexedDB clear (which holds the bulk of the local footprint).
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    clearPersistedNights();
  } catch {
    // Non-fatal — IndexedDB below holds the bulk of the space.
  }

  // Clear every store in a single transaction (one DB, one connection).
  await runTx(
    [
      WAVEFORM_STORE_NAME,
      OXIMETRY_STORE_NAME,
      BREATH_DATA_STORE_NAME,
      PLD_TRACES_STORE_NAME,
      DASHBOARD_SUMMARY_STORE_NAME,
    ],
    'readwrite',
    (tx) => [
      tx.objectStore(WAVEFORM_STORE_NAME).clear(),
      tx.objectStore(OXIMETRY_STORE_NAME).clear(),
      tx.objectStore(BREATH_DATA_STORE_NAME).clear(),
      tx.objectStore(PLD_TRACES_STORE_NAME).clear(),
      tx.objectStore(DASHBOARD_SUMMARY_STORE_NAME).clear(),
    ],
  );
}
