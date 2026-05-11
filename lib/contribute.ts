// ============================================================
// AirwayLab — Data Contribution Client
// Submits anonymised analysis results in chunks.
// No night count cap — large datasets are chunked automatically.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type { NightResult, NightNotes } from './types';
import { loadNightNotes } from './night-notes';

export class ContributionRateLimitedError extends Error {
  constructor() {
    super('Contribution rate limited — try again later');
    this.name = 'ContributionRateLimitedError';
  }
}

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
// Stay well below both Vercel's 4.5 MB proxy limit and the server's 3 MB check.
// JSON is mostly ASCII for this data, so body.length ≈ byte count.
const MAX_SAFE_PAYLOAD_BYTES = 2_097_152; // 2 MB

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
 * Send a slice of stripped nights to the server, splitting recursively if the
 * serialised payload would exceed Vercel's proxy limit before reaching Next.js.
 * Throws a plain error message (no batch label — caller adds context).
 */
async function sendNightsToServer(
  nights: NightResult[],
  contextChunk: (NightContext | null)[],
  contributionId: string,
): Promise<void> {
  const hasAnyContext = contextChunk.some((c) => c !== null);
  const body = JSON.stringify({
    nights,
    contributionId,
    ...(hasAnyContext && { nightContexts: contextChunk }),
  });
  const payloadBytes = body.length; // JSON data is ASCII — length ≈ UTF-8 byte count

  // Split if the serialised payload would exceed the safe threshold. We split
  // before the request rather than retrying after 413 to avoid wasting bandwidth
  // on payloads that the Vercel proxy rejects before Next.js can handle them.
  if (payloadBytes > MAX_SAFE_PAYLOAD_BYTES && nights.length > 1) {
    Sentry.addBreadcrumb({
      category: 'payload',
      message: `contribute: splitting oversized payload (${payloadBytes} bytes, ${nights.length} nights)`,
      level: 'warning',
      data: { payloadBytes, nightCount: nights.length, limitBytes: MAX_SAFE_PAYLOAD_BYTES },
    });
    const mid = Math.ceil(nights.length / 2);
    await sendNightsToServer(nights.slice(0, mid), contextChunk.slice(0, mid), contributionId);
    await sendNightsToServer(nights.slice(mid), contextChunk.slice(mid), contributionId);
    return;
  }

  Sentry.addBreadcrumb({
    category: 'payload',
    message: `contribute: sending ${payloadBytes} bytes (${nights.length} nights)`,
    level: 'info',
    data: { payloadBytes, nightCount: nights.length },
  });

  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    const res = await fetch('/api/contribute-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (res.ok) return;

    if (res.status === 429) {
      if (attempt < RATE_LIMIT_MAX_RETRIES) {
        const delay = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      // All retries exhausted on rate limit — soft transient failure, not an error
      throw new ContributionRateLimitedError();
    }

    const text = await res.text().catch(() => '');
    let errorDetail: string;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      errorDetail = typeof parsed.error === 'string' ? parsed.error : String(res.status);
    } catch {
      // Vercel/proxy returned a non-JSON 413 (payload exceeded proxy limit before
      // reaching Next.js). Record payload size so Sentry captures full context.
      console.error('[contribute] non-JSON server response', {
        status: res.status,
        contentType: res.headers.get('content-type'),
        snippet: text.slice(0, 300),
      });
      Sentry.addBreadcrumb({
        category: 'payload',
        message: `contribute non-JSON ${res.status}: payload was ${payloadBytes} bytes (${nights.length} nights)`,
        level: 'error',
        data: { status: res.status, payloadBytes, nightCount: nights.length },
      });
      errorDetail = `HTTP ${res.status} (non-JSON)`;
    }
    throw new Error(errorDetail);
  }

  throw new ContributionRateLimitedError();
}

/**
 * Contribute anonymised night data to the community dataset.
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
    const batchNum = Math.floor(i / CHUNK_SIZE) + 1;

    try {
      await sendNightsToServer(chunk, contextChunk, contributionId);
    } catch (err) {
      // Pass rate limit errors through unwrapped so callers can detect and handle silently
      if (err instanceof ContributionRateLimitedError) throw err;
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Contribution failed (batch ${batchNum}): ${detail}`);
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
