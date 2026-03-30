// ============================================================
// AirwayLab — Data Contribution Client
// Submits pseudonymised analysis results in chunks.
// Requires authentication — contributions are linked to user_id.
// No night count cap — large datasets are chunked automatically.
// ============================================================

import type { NightResult, NightNotes } from './types';
import { loadNightNotes } from './night-notes';

/**
 * Strip bulky per-breath/trace arrays from NightResult before contribution.
 * The server's anonymiseNight() only reads scalar summary fields, so bulk
 * data (breaths, reras, oximetryTrace, csl.episodes) is dead weight that
 * inflates the payload from ~2KB/night to tens of MB.
 *
 * IMPORTANT: Returns new objects -- does NOT mutate the originals.
 */
function stripBulkForContribution(nights: NightResult[]): NightResult[] {
  return nights.map((n) => ({
    ...n,
    ned: {
      ...n.ned,
      breaths: [],
      reras: [],
    },
    oximetryTrace: null,
    // CSL episodes array can grow large for severe Cheyne-Stokes patients.
    // Server only reads scalar csl fields (totalCSRSeconds, csrPercentage, episodeCount).
    csl: n.csl
      ? { ...n.csl, episodes: [] }
      : null,
  }));
}

const CHUNK_SIZE = 1000;
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 5000;

/** Structured night context for contribution (no free text — only enums + numeric) */
interface NightContext {
  caffeine: NightNotes['caffeine'];
  alcohol: NightNotes['alcohol'];
  congestion: NightNotes['congestion'];
  position: NightNotes['position'];
  stress: NightNotes['stress'];
  exercise: NightNotes['exercise'];
  symptomRating: NightNotes['symptomRating'];
}

/**
 * Load structured night context from localStorage for contribution.
 * Strips the free-text `note` field to prevent PII leakage.
 * Returns null if no structured data exists for the night.
 */
function loadNightContext(dateStr: string): NightContext | null {
  try {
    const notes = loadNightNotes(dateStr);
    // Only include if at least one structured field is set
    const hasData =
      notes.caffeine !== null ||
      notes.alcohol !== null ||
      notes.congestion !== null ||
      notes.position !== null ||
      notes.stress !== null ||
      notes.exercise !== null ||
      notes.symptomRating !== null;
    if (!hasData) return null;
    return {
      caffeine: notes.caffeine,
      alcohol: notes.alcohol,
      congestion: notes.congestion,
      position: notes.position,
      stress: notes.stress,
      exercise: notes.exercise,
      symptomRating: notes.symptomRating,
      // NOTE: notes.note (free text) is intentionally excluded — may contain PII
    };
  } catch {
    return null;
  }
}

interface ContributionResult {
  ok: boolean;
  totalSent: number;
  contributionId: string;
}

/**
 * Contribute pseudonymised night data to the community dataset.
 * Requires authentication — server will reject unauthenticated requests (401).
 * Automatically chunks large datasets into multiple requests
 * sharing a single contributionId for grouping.
 * Night context (structured enums from night notes) is included when available.
 */
export async function contributeNights(
  nights: NightResult[],
  onProgress?: (sent: number, total: number) => void,
  existingContributionId?: string
): Promise<ContributionResult> {
  const contributionId = existingContributionId ?? crypto.randomUUID();

  // Load night contexts for all nights (parallel array)
  const allNightContexts = nights.map((n) => loadNightContext(n.dateStr));

  let totalSent = 0;

  // Strip bulk data (breaths, reras, oximetryTrace, csl.episodes) before sending.
  // The server's anonymiseNight() only reads scalar summary fields.
  const strippedNights = stripBulkForContribution(nights);

  for (let i = 0; i < strippedNights.length; i += CHUNK_SIZE) {
    const chunk = strippedNights.slice(i, i + CHUNK_SIZE);
    const contextChunk = allNightContexts.slice(i, i + CHUNK_SIZE);
    // Only include nightContexts if at least one has data
    const hasAnyContext = contextChunk.some((c) => c !== null);
    const batchNum = Math.floor(i / CHUNK_SIZE) + 1;
    let success = false;

    for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
      const res = await fetch('/api/contribute-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          nights: chunk,
          contributionId,
          ...(hasAnyContext && { nightContexts: contextChunk }),
        }),
      });

      if (res.ok) {
        success = true;
        break;
      }

      // Not authenticated — bail immediately, don't retry
      if (res.status === 401) {
        throw new Error('Authentication required to contribute data.');
      }

      // Retry with exponential backoff on rate limit
      if (res.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
        const delay = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(
        `Contribution failed (batch ${batchNum}): ${body.error || res.status}`
      );
    }

    if (!success) {
      throw new Error(`Contribution failed (batch ${batchNum}): Rate limited after retries`);
    }

    totalSent += chunk.length;
    onProgress?.(totalSent, nights.length);
  }

  return { ok: true, totalSent, contributionId };
}

/**
 * Update localStorage with contributed date strings for dedup.
 */
export function trackContributedDates(nights: NightResult[]): void {
  try {
    const storedDates: string[] = JSON.parse(
      localStorage.getItem('airwaylab_contributed_dates') || '[]'
    );
    const dateSet = new Set(storedDates);
    for (const n of nights) dateSet.add(n.dateStr);
    const updated = Array.from(dateSet);
    localStorage.setItem('airwaylab_contributed_dates', JSON.stringify(updated));
    localStorage.setItem('airwaylab_contributed_nights', String(updated.length));
  } catch {
    // localStorage may be unavailable
  }
}
