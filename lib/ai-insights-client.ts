import type { Insight } from './insights';
import type { NightResult, NightNotes } from './types';

export interface AIInsightsResult {
  insights: Insight[];
  /** Server-side remaining credits for community tier. Undefined if not available. */
  remainingCredits?: number;
  /** Whether per-breath deep analysis was used */
  isDeep?: boolean;
}

/** Per-breath summary format stored in Supabase Storage */
export interface BreathSummary {
  ned: number;
  fi: number;
  mShape: boolean;
  tPeakTi: number;
  qPeak: number;
  duration: number;
}

export interface PerBreathSummary {
  breaths: BreathSummary[];
  breathCount: number;
  sampleRate: number;
}

function validateInsights(data: unknown): Insight[] | null {
  if (!data || typeof data !== 'object' || !Array.isArray((data as Record<string, unknown>).insights)) return null;

  const validInsights = ((data as Record<string, unknown>).insights as unknown[]).filter(
    (i): i is Insight =>
      !!i &&
      typeof i === 'object' &&
      typeof (i as Record<string, unknown>).id === 'string' &&
      typeof (i as Record<string, unknown>).type === 'string' &&
      typeof (i as Record<string, unknown>).title === 'string'
  );

  return validInsights.length > 0 ? validInsights : null;
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
  signal?: AbortSignal,
  nightNotes?: NightNotes
): Promise<AIInsightsResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
        nightNotes,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const validInsights = validateInsights(data);
    if (!validInsights) return null;

    return {
      insights: validInsights,
      remainingCredits: typeof data.remainingCredits === 'number' ? data.remainingCredits : undefined,
      isDeep: data.isDeep === true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Fetches deep AI insights for paid users — includes per-breath summary data.
 * Longer timeout (30s) since the prompt is larger.
 */
export async function fetchDeepAIInsights(
  nights: NightResult[],
  selectedNightIndex: number,
  therapyChangeDate: string | null,
  signal?: AbortSignal,
  nightNotes?: NightNotes,
  perBreathSummary?: PerBreathSummary
): Promise<AIInsightsResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
        nightNotes,
        deep: true,
        perBreathSummary,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const validInsights = validateInsights(data);
    if (!validInsights) return null;

    return {
      insights: validInsights,
      remainingCredits: typeof data.remainingCredits === 'number' ? data.remainingCredits : undefined,
      isDeep: data.isDeep === true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
