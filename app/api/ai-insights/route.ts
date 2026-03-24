import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import type { Insight } from '@/lib/insights';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { aiRateLimiter, aiPremiumRateLimiter, getUserRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { salvageTruncatedJSON } from './salvage';
import { sanitizePromptInput } from '@/lib/prompt-sanitize';
import { cancelSequence } from '@/lib/email/sequences';

const AI_MONTHLY_LIMIT = 3;

const DEEP_SYSTEM_PROMPT_EXTENSION = `

When per-breath summary data is provided, analyse:
- RERA clustering: identify runs of 3+ breaths with progressive NED increase
- Breath shape distribution: what percentage are M-shaped vs flat-topped vs normal?
- Temporal patterns: do FL episodes cluster in H1 vs H2? Are there periodic clusters?
- Progressive FL: sequences where NED increases steadily over 5+ breaths
- Recovery patterns: how quickly do metrics normalise after FL episodes?

Reference specific breath indices when discussing patterns (e.g., "Breaths 47-62 show...").
Mark all deep-analysis insights with category prefixed by the engine name for clarity.`;

const PREMIUM_INSIGHT_EXTENSION = `

Generate 6 to 10 clinical insights for this analysis. As a premium analysis, be thorough — cover all engines with specific findings.

In addition to the standard categories, you may use these categories for premium-depth analysis:
- "correlation": Cross-engine correlations (e.g. Glasgow flat-top + high NED suggests steady-state FL; WAT periodicity + oximetry ODI coupling suggests central component)
- "temporal": Time-based patterns (e.g. progressive FL worsening across H1→H2, periodic clustering at specific intervals, REM-associated breath shape changes, positional transitions visible in H1/H2 splits)

Prioritise correlation and temporal insights — these are the analysis patterns that go beyond what rule-based systems detect.`;

// Model selection based on user tier
const MODEL_COMMUNITY = 'claude-haiku-4-5-20251001';
const MODEL_PREMIUM = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a sleep medicine data analyst specialising in PAP flow limitation analysis. You analyse NightResult data from AirwayLab, a tool that processes ResMed PAP (CPAP/BiPAP/ASV) SD card data.

Your task is to generate 3–6 clinical insights in JSON format. Each insight must follow this exact schema:
{
  "id": string (unique, prefixed with "ai-"),
  "type": "positive" | "warning" | "actionable" | "info",
  "title": string (≤12 words),
  "body": string (1–2 sentences),
  "category": "glasgow" | "wat" | "ned" | "oximetry" | "therapy" | "trend"
}

Focus on:
- Cross-engine correlations the rule-based system misses (e.g. Glasgow flat-top high while NED shows low M-shape suggests steady-state flow limitation rather than oscillatory obstruction)
- Patterns between WAT regularity/periodicity and Glasgow component breakdown
- H1 vs H2 shifts across engines (positional or REM-related patterns)
- Therapy settings context: analyse ALL machine settings provided (pressure, EPR, ramp, humidity, mask type, trigger/cycle sensitivity, comfort features). Identify specific settings that may be contributing to findings and suggest concrete adjustments to investigate.
- Oximetry-flow correlations when oximetry data is present
- Flow limitation as a primary symptom driver: research (Mann et al. 2024, Gold et al. 2003) shows IFL predicts sleepiness independently of arousals via limbic/HPA axis stress response. Frame flow limitation metrics (Glasgow, FL Score, NED) as potentially closer to the primary driver of symptoms than arousal-based metrics. A low arousal index does not mean flow limitation is insignificant.
- When user-reported night context is provided (caffeine, alcohol, congestion, sleep position, stress, exercise): correlate these factors with the analysis findings. For example, afternoon caffeine + high disruptions, nasal congestion + elevated FL, back sleeping + H2 worsening, etc.
- When oximetry data shows high T<94% with low ODI3, flag this as likely tonic respiratory depression (e.g., from alcohol or medication) rather than obstructive events — different mechanism, different response.
- ACTIONABILITY: For every warning or actionable insight, include specific areas to investigate (e.g. "review sleep position patterns", "consider side sleeping", "reduce afternoon caffeine"). Frame as "areas to investigate with your clinician" not as medical advice.

Rules:
- Describe what the data shows — patterns, correlations, and observations. Do NOT recommend specific therapy or pressure changes based on metrics alone. Metrics are useful for verifying whether changes worked, but the visual picture (flow waveforms, apnea events, pressure traces, and breath forms together) is needed to guide adjustments. Frame insights as "what the data shows" rather than "what to change".
- Always include "discuss with your clinician" or similar language in actionable insights
- Never claim to be a medical device or provide a diagnosis
- Be specific — reference actual metric values and settings from the data
- Prioritise actionable findings over general observations
- Generate at least one "actionable" type insight with concrete investigation suggestions
- Do not repeat what the rule-based system would already catch (simple threshold checks)
- Never recommend pressure increases as a blanket solution. In S-mode (spontaneous breathing), glottic narrowing is NOT the limiting factor (Parreira 1996b, Oppersma 2018). The real risk of higher PS is ventilatory instability: increased tidal volume lowers PaCO2 below the apnea threshold, causing central events. Frame therapy discussion in terms of timing and synchrony (cycling, rise time, trigger sensitivity) rather than pressure magnitude. Brief obstructions (1-2 breath events) typically do not respond to EPAP changes.
- Keep body text to 1 sentence (max ~30 words). Be data-dense, not verbose.
- If running low on space, finish the current insight and close the array. Fewer complete insights are better than many truncated ones.

Respond ONLY with a JSON array of Insight objects. No markdown, no explanation, just the array.`;

// Zod schema for night notes
const NightNotesSchema = z.object({
  caffeine: z.enum(['none', 'before-noon', 'afternoon', 'evening']).nullable(),
  alcohol: z.enum(['none', '1-2', '3+']).nullable(),
  congestion: z.enum(['none', 'mild', 'severe']).nullable(),
  position: z.enum(['back', 'side', 'stomach', 'mixed']).nullable(),
  stress: z.enum(['low', 'moderate', 'high']).nullable(),
  exercise: z.enum(['none', 'light', 'intense']).nullable(),
  note: z.string().max(200).optional(),
  symptomRating: z.number().int().min(1).max(5).nullable().optional(),
}).optional();

// Zod schema for per-breath summary (deep mode)
const BreathSummarySchema = z.object({
  ned: z.number(),
  fi: z.number(),
  mShape: z.boolean(),
  tPeakTi: z.number(),
  qPeak: z.number(),
  duration: z.number(),
});

const PerBreathSummarySchema = z.object({
  breaths: z.array(BreathSummarySchema).max(10000),
  breathCount: z.number().int(),
  sampleRate: z.number(),
}).optional();

// Zod schema for request validation (M4)
const RequestBodySchema = z.object({
  nights: z.array(z.object({
    dateStr: z.string(),
    durationHours: z.number(),
    sessionCount: z.number(),
    settings: z.object({}).passthrough(),
    glasgow: z.object({ overall: z.number() }).passthrough(),
    wat: z.object({ flScore: z.number() }).passthrough(),
    ned: z.object({ nedMean: z.number() }).passthrough(),
    oximetry: z.object({}).passthrough().nullable().optional(),
  }).passthrough()).min(1).max(1095),
  selectedNightIndex: z.number().int().min(0),
  therapyChangeDate: z.string().nullable(),
  nightNotes: NightNotesSchema,
  deep: z.boolean().optional(),
  perBreathSummary: PerBreathSummarySchema,
});

type RequestBody = z.infer<typeof RequestBodySchema>;

function buildUserPrompt(body: RequestBody): string {
  const { nights, selectedNightIndex, therapyChangeDate, nightNotes } = body;
  const selected = nights[selectedNightIndex]!;
  const previous = selectedNightIndex < nights.length - 1 ? nights[selectedNightIndex + 1] : null;

  // When settings weren't extracted, tell the model instead of sending zeros
  const settingsContext = (selected.settings as Record<string, unknown>)?.settingsSource === 'unavailable'
    ? { note: 'Device settings could not be extracted from this SD card. Do not reference pressure values or prescribed settings.' }
    : selected.settings;

  const context: Record<string, unknown> = {
    selectedNight: {
      date: selected.dateStr,
      durationHours: selected.durationHours,
      sessionCount: selected.sessionCount,
      settings: settingsContext,
      glasgow: selected.glasgow,
      wat: selected.wat,
      ned: selected.ned,
      oximetry: selected.oximetry,
    },
    nightCount: nights.length,
    therapyChangeDate,
  };

  // Include user-reported night context if available
  if (nightNotes) {
    const activeNotes: Record<string, string> = {};
    if (nightNotes.caffeine) activeNotes.caffeine = nightNotes.caffeine;
    if (nightNotes.alcohol) activeNotes.alcohol = nightNotes.alcohol;
    if (nightNotes.congestion) activeNotes.congestion = nightNotes.congestion;
    if (nightNotes.position) activeNotes.position = nightNotes.position;
    if (nightNotes.stress) activeNotes.stress = nightNotes.stress;
    if (nightNotes.exercise) activeNotes.exercise = nightNotes.exercise;
    if (nightNotes.note) {
      const sanitized = sanitizePromptInput(nightNotes.note);
      if (!sanitized.flagged) {
        activeNotes.note = sanitized.text;
      }
    }
    if (Object.keys(activeNotes).length > 0) {
      context.userReportedContext = activeNotes;
    }
  }

  if (previous) {
    context.previousNight = {
      date: previous.dateStr,
      glasgow: previous.glasgow,
      wat: previous.wat,
      ned: previous.ned,
      oximetry: previous.oximetry,
    };
  }

  // Add trend summary if multiple nights
  if (nights.length >= 3) {
    const recent = nights.slice(0, Math.min(7, nights.length));
    context.trendSummary = {
      glasgowValues: recent.map((n) => ({ date: n.dateStr, overall: n.glasgow.overall })),
      nedMeanValues: recent.map((n) => ({ date: n.dateStr, nedMean: n.ned.nedMean })),
      flScoreValues: recent.map((n) => ({ date: n.dateStr, flScore: n.wat.flScore })),
    };
  }

  // Include per-breath summary for deep mode
  if (body.deep && body.perBreathSummary) {
    const pbs = body.perBreathSummary;
    context.perBreathSummary = {
      breathCount: pbs.breathCount,
      sampleRate: pbs.sampleRate,
      // Include up to 3000 breaths (truncate to stay within token limits)
      breaths: pbs.breaths.slice(0, 3000),
    };
  }

  return JSON.stringify(context, null, 2);
}

/**
 * Get the current month key in YYYY-MM format.
 */
function getCurrentMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function POST(request: NextRequest) {
  // L8: CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Auth check — require signed-in user
  const supabase = await getSupabaseServer();
  if (!supabase) {
    Sentry.captureMessage('AI insights: Supabase not configured', { level: 'error', tags: { route: 'ai-insights', error_type: 'config' } });
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Server-side AI usage enforcement (C2)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'community';

  // Rate limiting by user ID — paid users get 3x the limit (C3)
  const isPaidTierForRateLimit = userTier === 'supporter' || userTier === 'champion';
  const rateLimiter = isPaidTierForRateLimit ? aiPremiumRateLimiter : aiRateLimiter;
  if (await rateLimiter.isLimited(getUserRateLimitKey(user.id))) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  if (userTier === 'community') {
    const adminClient = getSupabaseServiceRole();
    if (!adminClient) {
      // Hard fail: without service role, we cannot enforce usage limits.
      // Allowing through would give community users unlimited free AI.
      console.error('[ai-insights] Service role not configured — cannot enforce community usage limit');
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const month = getCurrentMonth();
    const { data: usage } = await adminClient
      .from('ai_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('month', month)
      .maybeSingle();

    const currentCount = usage?.count ?? 0;
    if (currentCount >= AI_MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: 'Monthly AI analysis limit reached. Support AirwayLab for unlimited access.' },
        { status: 403 }
      );
    }
  }

  // Validate Anthropic API key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    Sentry.captureMessage('AI insights: ANTHROPIC_API_KEY not configured', { level: 'error', tags: { route: 'ai-insights', error_type: 'config' } });
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  // Parse and validate request body with Zod (M4)
  let body: RequestBody;
  try {
    const raw = await request.json();
    const parsed = RequestBodySchema.safeParse(raw);
    if (!parsed.success) {
      const zodIssue = parsed.error.issues[0];
      const detail = zodIssue ? `${zodIssue.path.join('.')}: ${zodIssue.message}` : 'unknown';
      console.error('[ai-insights] Zod validation failed:', detail);
      Sentry.captureMessage(`AI insights: Zod validation failed — ${detail}`, {
        level: 'warning',
        tags: { route: 'ai-insights', error_type: 'validation' },
        extra: { issues: parsed.error.issues.slice(0, 5), nightCount: Array.isArray(raw?.nights) ? raw.nights.length : 0 },
      });
      return NextResponse.json({ error: `Invalid request data: ${detail}` }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    console.error('[ai-insights] JSON parse failed on request body');
    Sentry.captureMessage('AI insights: request body JSON parse failed', {
      level: 'warning',
      tags: { route: 'ai-insights', error_type: 'validation' },
    });
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Cross-field validation: selectedNightIndex must be within bounds
  if (body.selectedNightIndex >= body.nights.length) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    // Enrich system prompt with aggregate symptom stats if available
    let systemPrompt = SYSTEM_PROMPT;
    const adminForStats = getSupabaseServiceRole();
    if (adminForStats) {
      try {
        const { data: aggStats } = await adminForStats.rpc('get_symptom_aggregate_stats');
        if (aggStats && aggStats.total_ratings >= 100) {
          systemPrompt += `\n\nCommunity context (${aggStats.total_ratings} self-reported sleep quality ratings across all users):\n- Average rating: ${Number(aggStats.avg_rating).toFixed(1)}/5\n- Users with IFL Risk >45% who rated sleep as Poor/Terrible: ${aggStats.high_ifl_poor_pct ?? 0}%\n- Users with IFL Risk <20% who rated sleep as Good/Great: ${aggStats.low_ifl_good_pct ?? 0}%\nUse this context to frame whether this user's experience is typical or atypical relative to the community.`;
        }
      } catch {
        // Non-critical — proceed without aggregate stats
      }
    }

    const isPaidTier = userTier === 'supporter' || userTier === 'champion';
    const isDeepRequest = body.deep === true && body.perBreathSummary && isPaidTier;

    // Extend system prompt for deep mode (per-breath analysis)
    if (isDeepRequest) {
      systemPrompt += DEEP_SYSTEM_PROMPT_EXTENSION;
    }

    // Extend system prompt for premium insight depth (more insights, new categories)
    if (isPaidTier) {
      systemPrompt += PREMIUM_INSIGHT_EXTENSION;
    }

    const client = new Anthropic({ apiKey: anthropicKey, maxRetries: 3 });

    // Premium users get Sonnet for higher quality analysis; community gets Haiku
    const model = isPaidTier ? MODEL_PREMIUM : MODEL_COMMUNITY;
    // Premium users get higher token budget: 4096 for deep, 4096 for standard premium, 1024 for community
    const maxTokens = isPaidTier ? 4096 : 1024;

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(body),
        },
      ],
    });

    // Extract text response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      const blockTypes = message.content.map((b) => b.type).join(', ');
      Sentry.captureMessage('AI insights: no text block in response', {
        level: 'error',
        tags: { route: 'ai-insights', error_type: 'ai_response' },
        extra: { blockTypes, stopReason: message.stop_reason },
      });
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Parse insights from JSON response
    let insights: Insight[];
    let truncated = false;
    try {
      // Strip markdown code fences and extract JSON array
      let jsonText = textBlock.text.trim();
      // Remove ```json ... ``` or ``` ... ``` wrappers
      const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch?.[1]) {
        jsonText = fenceMatch[1].trim();
      }
      // If model included preamble text, extract the JSON array
      const arrayStart = jsonText.indexOf('[');
      const arrayEnd = jsonText.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        jsonText = jsonText.slice(arrayStart, arrayEnd + 1);
      }
      insights = JSON.parse(jsonText);
    } catch {
      // If response was truncated by max_tokens, try to salvage complete objects
      if (message.stop_reason === 'max_tokens') {
        const salvaged = salvageTruncatedJSON<Insight>(textBlock.text);
        if (salvaged.length > 0) {
          insights = salvaged;
          truncated = true;
          Sentry.captureMessage('AI insights: truncated response salvaged', {
            level: 'warning',
            tags: { route: 'ai-insights', error_type: 'ai_truncated' },
            extra: { totalExtracted: salvaged.length, stopReason: 'max_tokens' },
          });
        } else {
          Sentry.captureMessage('AI insights: truncated response unsalvageable', {
            level: 'error',
            tags: { route: 'ai-insights', error_type: 'ai_response' },
            extra: { responsePreview: textBlock.text.slice(0, 500), stopReason: 'max_tokens' },
          });
          return NextResponse.json({ error: 'AI response was too short to generate insights. Please try again.' }, { status: 502 });
        }
      } else {
        Sentry.captureMessage('AI insights: JSON parse failed on AI response', {
          level: 'error',
          tags: { route: 'ai-insights', error_type: 'ai_response' },
          extra: { responsePreview: textBlock.text.slice(0, 500), stopReason: message.stop_reason },
        });
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
      }
    }

    // Validate insight shape
    if (!Array.isArray(insights)) {
      Sentry.captureMessage('AI insights: response is not an array', {
        level: 'error',
        tags: { route: 'ai-insights', error_type: 'ai_response' },
        extra: { responseType: typeof insights, responsePreview: JSON.stringify(insights).slice(0, 500) },
      });
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    // Ensure all insights have valid types and required fields
    const validTypes = new Set(['positive', 'warning', 'actionable', 'info']);
    const validCategories = new Set(['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend', 'correlation', 'temporal']);

    insights = insights.filter(
      (i) =>
        i &&
        typeof i.id === 'string' &&
        validTypes.has(i.type) &&
        typeof i.title === 'string' &&
        typeof i.body === 'string' &&
        validCategories.has(i.category)
    );

    // Increment server-side AI usage counter atomically via RPC (with token tracking)
    const inputTokens = message.usage?.input_tokens ?? 0;
    const outputTokens = message.usage?.output_tokens ?? 0;
    const adminClient = getSupabaseServiceRole();
    let remainingCredits: number | undefined;
    if (adminClient) {
      const month = getCurrentMonth();
      await adminClient.rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_month: month,
        p_input_tokens: inputTokens,
        p_output_tokens: outputTokens,
      });

      // Read back the updated count to return accurate remaining credits
      if (userTier === 'community') {
        const { data: updatedUsage } = await adminClient
          .from('ai_usage')
          .select('count')
          .eq('user_id', user.id)
          .eq('month', month)
          .maybeSingle();
        remainingCredits = Math.max(0, AI_MONTHLY_LIMIT - (updatedUsage?.count ?? 0));
      }
    }

    // User discovered AI insights -- cancel the education email about it
    if (adminClient) {
      void cancelSequence(adminClient, user.id, 'feature_education')
        .catch(() => {}); // Non-blocking
    }

    return NextResponse.json({
      insights,
      source: 'ai',
      isDeep: !!isDeepRequest,
      ...(truncated && { truncated: true }),
      ...(remainingCredits !== undefined && { remainingCredits }),
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'rate_limit' },
        level: 'warning',
      });
      console.error('[ai-insights] Rate limit exceeded after retries');
      return NextResponse.json(
        { error: 'AI service is temporarily busy. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'auth' },
        level: 'error',
      });
      console.error('[ai-insights] Auth/permission error:', err instanceof Anthropic.AuthenticationError ? 'authentication' : 'permission');
      return NextResponse.json(
        { error: 'AI service configuration error. Please try again later.' },
        { status: 503 }
      );
    }

    // APIConnectionTimeoutError extends APIConnectionError — check subclass first
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'connection_timeout' },
        level: 'warning',
      });
      console.error('[ai-insights] Connection timeout');
      return NextResponse.json(
        { error: 'AI service timed out. Please try again.' },
        { status: 504 }
      );
    }

    if (err instanceof Anthropic.APIConnectionError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'connection' },
        level: 'warning',
      });
      console.error('[ai-insights] Connection error');
      return NextResponse.json(
        { error: 'Could not connect to AI service. Please try again.' },
        { status: 502 }
      );
    }

    if (err instanceof Anthropic.NotFoundError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'not_found' },
        level: 'error',
      });
      console.error('[ai-insights] Model not found');
      return NextResponse.json(
        { error: 'AI model unavailable. Please try again later.' },
        { status: 502 }
      );
    }

    if (err instanceof Anthropic.BadRequestError) {
      const isBillingError = err.message?.includes('credit balance');
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: isBillingError ? 'billing' : 'bad_request' },
        level: isBillingError ? 'fatal' : 'error',
      });
      if (isBillingError) {
        console.error('[ai-insights] Anthropic credit balance exhausted');
        return NextResponse.json(
          { error: 'AI service is temporarily unavailable. Our team has been notified and is working on it.' },
          { status: 503 }
        );
      }
      console.error('[ai-insights] Bad request');
      return NextResponse.json(
        { error: 'Failed to process analysis data. Please try again.' },
        { status: 502 }
      );
    }

    if (err instanceof Anthropic.InternalServerError) {
      Sentry.captureException(err, {
        tags: { route: 'ai-insights', error_type: 'server_error' },
        level: 'warning',
      });
      console.error('[ai-insights] Anthropic internal server error');
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again in a few minutes.' },
        { status: 502 }
      );
    }

    Sentry.captureException(err, { tags: { route: 'ai-insights' } });
    console.error('[ai-insights] Error:', err);
    return NextResponse.json(
      { error: 'AI service error' },
      { status: 502 }
    );
  }
}
