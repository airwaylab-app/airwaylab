import type { Insight } from './insights';
import type { NightResult } from './types';

/**
 * Fetches AI-powered insights from the API route.
 * Returns null on any failure — the UI falls back to rule-based insights.
 */
export async function fetchAIInsights(
  nights: NightResult[],
  selectedNightIndex: number,
  therapyChangeDate: string | null,
  apiKey: string
): Promise<Insight[] | null> {
  const url = process.env.NEXT_PUBLIC_AI_INSIGHTS_URL;
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
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
  }
}
