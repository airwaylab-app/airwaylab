import type { Insight } from './insights';
import type { NightResult } from './types';

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
): Promise<Insight[] | null> {
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
    if (!data.insights || !Array.isArray(data.insights)) return null;

    return data.insights as Insight[];
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
