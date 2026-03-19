// ============================================================
// AirwayLab — Data Contribution Client
// Submits anonymised analysis results in chunks.
// No night count cap — large datasets are chunked automatically.
// ============================================================

import type { NightResult } from './types';

const CHUNK_SIZE = 1000;

interface ContributionResult {
  ok: boolean;
  totalSent: number;
  contributionId: string;
}

/**
 * Contribute anonymised night data to the community dataset.
 * Automatically chunks large datasets into multiple requests
 * sharing a single contributionId for grouping.
 */
export async function contributeNights(
  nights: NightResult[],
  onProgress?: (sent: number, total: number) => void,
  existingContributionId?: string
): Promise<ContributionResult> {
  const contributionId = existingContributionId ?? crypto.randomUUID();
  let totalSent = 0;

  for (let i = 0; i < nights.length; i += CHUNK_SIZE) {
    const chunk = nights.slice(i, i + CHUNK_SIZE);
    const res = await fetch('/api/contribute-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nights: chunk, contributionId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(
        `Contribution failed (batch ${Math.floor(i / CHUNK_SIZE) + 1}): ${body.error || res.status}`
      );
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
