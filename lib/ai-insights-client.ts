import * as Sentry from '@sentry/nextjs';
import type { Insight } from './insights';
import type { NightResult, NightNotes } from './types';

interface AIInsightsResult {
  insights: Insight[];
  /** Server-side remaining credits for community tier. Undefined if not available. */
  remainingCredits?: number;
  /** Whether per-breath deep analysis was used */
  isDeep?: boolean;
  /** True when AI response was truncated and only partial insights were recovered */
  truncated?: boolean;
}

/**
 * Strip NightResult down to only fields that buildUserPrompt() reads.
 * Removes oximetryTrace (~800KB/night), per-breath arrays, and unused modules.
 * Used for the selected night and the previous night (full context needed).
 */
function stripNightForAIPayload(night: NightResult): Record<string, unknown> {
  const { breaths: _breaths, reras: _reras, ...nedSummary } = night.ned;
  return {
    dateStr: night.dateStr,
    durationHours: night.durationHours,
    sessionCount: night.sessionCount,
    settings: night.settings,
    glasgow: night.glasgow,
    wat: night.wat,
    ned: nedSummary,
    oximetry: night.oximetry,
    machineSummary: night.machineSummary ?? undefined,
    settingsFingerprint: night.settingsFingerprint ?? undefined,
    // Explicitly excluded: oximetryTrace, settingsMetrics, crossDevice, csl, pldSummary, date
  };
}

/**
 * Strip a trend night down to the three scalar fields that buildUserPrompt()
 * actually reads from trend data (glasgowValues, nedMeanValues, flScoreValues).
 * Eliminates oximetry, settings, and per-breath data from nights that are only
 * used for trend context — prevents 413 payload-size errors for users with
 * many nights of oximetry data.
 */
export function stripTrendNightForAIPayload(night: NightResult): Record<string, unknown> {
  return {
    dateStr: night.dateStr,
    glasgow: { overall: night.glasgow.overall },
    ned: { nedMean: night.ned.nedMean },
    wat: { flScore: night.wat.flScore },
  };
}

/** Per-breath summary format stored in Supabase Storage */
interface BreathSummary {
  ned: number;
  fi: number;
  mShape: boolean;
  tPeakTi: number;
  qPeak: number;
  duration: number;
}

interface PerBreathSummary {
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
 * Extract a user-facing error message from a non-OK API response.
 */
async function extractApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body.error && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // Could not parse error body
  }
  return `AI service error (${res.status})`;
}

/**
 * Fetches AI-powered insights from the API route.
 * Auth is session-based (cookies) — no API key needed.
 * Throws on failure with a user-facing error message.
 */
/**
 * Trim the nights array to only what the server needs:
 * selected night, previous night, and up to 7 recent nights for trends.
 * Returns { trimmedNights, adjustedIndex, keyIndices }.
 *
 * keyIndices contains the positions within trimmedNights that require full
 * stripping (selected + previous). All other positions are trend-only and
 * can be stripped down to scalar summary fields to keep the payload small.
 */
function trimNightsForPayload(
  nights: NightResult[],
  selectedNightIndex: number
): { trimmedNights: NightResult[]; adjustedIndex: number; keyIndices: Set<number> } {
  const needed = new Set<number>();

  // Selected night
  needed.add(selectedNightIndex);

  // Previous night (next index in sorted-desc array)
  if (selectedNightIndex + 1 < nights.length) {
    needed.add(selectedNightIndex + 1);
  }

  // Up to 7 most recent (server uses nights.slice(0, 7) for trends)
  for (let i = 0; i < Math.min(7, nights.length); i++) {
    needed.add(i);
  }

  const sortedIndices = Array.from(needed).sort((a, b) => a - b);
  const trimmedNights = sortedIndices.map((i) => nights[i]!);
  const adjustedIndex = sortedIndices.indexOf(selectedNightIndex);

  // Track which positions in trimmedNights need full detail (selected + previous)
  const keyOriginalIndices = new Set([selectedNightIndex]);
  if (selectedNightIndex + 1 < nights.length) keyOriginalIndices.add(selectedNightIndex + 1);
  const keyIndices = new Set(
    sortedIndices.reduce<number[]>((acc, orig, pos) => {
      if (keyOriginalIndices.has(orig)) acc.push(pos);
      return acc;
    }, [])
  );

  return { trimmedNights, adjustedIndex, keyIndices };
}

export async function fetchAIInsights(
  nights: NightResult[],
  selectedNightIndex: number,
  therapyChangeDate: string | null,
  signal?: AbortSignal,
  nightNotes?: NightNotes
): Promise<AIInsightsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const { trimmedNights, adjustedIndex, keyIndices } = trimNightsForPayload(nights, selectedNightIndex);
  // Key nights (selected + previous) get full stripping; trend-only nights get scalar-only
  // stripping to prevent 413 payload size errors (AIR-691)
  const strippedNights = trimmedNights.map((night, i) =>
    keyIndices.has(i) ? stripNightForAIPayload(night) : stripTrendNightForAIPayload(night)
  );

  try {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        nights: strippedNights,
        selectedNightIndex: adjustedIndex,
        therapyChangeDate,
        nightNotes,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorMessage = await extractApiError(res);
      console.error(`[ai-insights] API error ${res.status}: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const validInsights = validateInsights(data);
    if (!validInsights) {
      console.error('[ai-insights] Invalid response format');
      Sentry.captureMessage('AI insights: empty or malformed response after 200', {
        level: 'warning',
        tags: { checkpoint: 'ai_insights_empty', mode: 'standard' },
        extra: { hasInsightsKey: 'insights' in (data as Record<string, unknown>), rawLength: JSON.stringify(data).length },
      });
      throw new Error('AI returned an invalid response. Please try again.');
    }

    return {
      insights: validInsights,
      remainingCredits: typeof data.remainingCredits === 'number' ? data.remainingCredits : undefined,
      isDeep: data.isDeep === true,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) {
        throw err; // External abort (unmount / re-generate)
      }
      console.error('[ai-insights] Request timed out after 55s');
      throw new Error('AI analysis timed out. Please try again.');
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.error('[ai-insights] Network error (standard mode)');
      throw new Error('Could not reach the AI service. Check your internet connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Fetches deep AI insights for paid users — includes per-breath summary data.
 * Longer timeout (30s) since the prompt is larger.
 * Throws on failure with a user-facing error message.
 */
export async function fetchDeepAIInsights(
  nights: NightResult[],
  selectedNightIndex: number,
  therapyChangeDate: string | null,
  signal?: AbortSignal,
  nightNotes?: NightNotes,
  perBreathSummary?: PerBreathSummary
): Promise<AIInsightsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  const { trimmedNights, adjustedIndex, keyIndices } = trimNightsForPayload(nights, selectedNightIndex);
  // Key nights (selected + previous) get full stripping; trend-only nights get scalar-only
  // stripping to prevent 413 payload size errors (AIR-691)
  const strippedNights = trimmedNights.map((night, i) =>
    keyIndices.has(i) ? stripNightForAIPayload(night) : stripTrendNightForAIPayload(night)
  );

  // Client-side truncation: cap per-breath data to prevent 413 errors (FB-27)
  const trimmedBreaths = perBreathSummary && perBreathSummary.breaths.length > 1000
    ? { ...perBreathSummary, breaths: perBreathSummary.breaths.slice(0, 1000) }
    : perBreathSummary;

  try {
    const res = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        nights: strippedNights,
        selectedNightIndex: adjustedIndex,
        therapyChangeDate,
        nightNotes,
        deep: true,
        perBreathSummary: trimmedBreaths,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorMessage = await extractApiError(res);
      console.error(`[ai-insights] API error ${res.status}: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const validInsights = validateInsights(data);
    if (!validInsights) {
      console.error('[ai-insights] Invalid response format');
      Sentry.captureMessage('AI insights: empty or malformed response after 200', {
        level: 'warning',
        tags: { checkpoint: 'ai_insights_empty', mode: 'deep' },
        extra: { hasInsightsKey: 'insights' in (data as Record<string, unknown>), rawLength: JSON.stringify(data).length },
      });
      throw new Error('AI returned an invalid response. Please try again.');
    }

    return {
      insights: validInsights,
      remainingCredits: typeof data.remainingCredits === 'number' ? data.remainingCredits : undefined,
      isDeep: data.isDeep === true,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) {
        throw err; // External abort (unmount / re-generate)
      }
      console.error('[ai-insights] Request timed out after 65s');
      throw new Error('AI analysis timed out. Please try again.');
    }
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      console.error('[ai-insights] Network error (deep mode)');
      throw new Error('Could not reach the AI service. Check your internet connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
