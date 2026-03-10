import type { Insight } from './insights';
import type { NightResult } from './types';

export interface AIInsightsResult {
  insights: Insight[];
  /** Server-side remaining credits for community tier. Undefined if not available. */
  remainingCredits?: number;
}

/**
 * Fetches AI-powered insights from the API route.
 * Auth is session-based (cookies) — no API key needed.
 * Returns null on any failure — the UI falls back to rule-based insights.
 */
export async function fetchAIInsights(
  nights: NightResult[],
  selectedNightIndex: number,
  therapyChangeDate: string | null,
  signal?: AbortSignal
): Promise<AIInsightsResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  // Wire external signal to internal controller
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        nights,
        selectedNightIndex,
        therapyChangeDate,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data !== 'object' || !Array.isArray(data.insights)) return null;

    // Validate each insight has required fields
    const validInsights = (data.insights as unknown[]).filter(
      (i): i is Insight =>
        !!i &&
        typeof i === 'object' &&
        typeof (i as Record<string, unknown>).id === 'string' &&
        typeof (i as Record<string, unknown>).type === 'string' &&
        typeof (i as Record<string, unknown>).title === 'string'
    );

    if (validInsights.length === 0) return null;

    return {
      insights: validInsights,
      remainingCredits: typeof data.remainingCredits === 'number' ? data.remainingCredits : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
