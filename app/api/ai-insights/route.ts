import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import type { Insight } from '@/lib/insights';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { aiRateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

const AI_MONTHLY_LIMIT = 3;

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
- ACTIONABILITY: For every warning or actionable insight, include specific areas to investigate (e.g. "try adjusting EPR from 2 to 3", "consider side sleeping", "reduce afternoon caffeine"). Frame as "areas to investigate with your clinician" not as medical advice.

Rules:
- Always include "discuss with your clinician" or similar language in actionable insights
- Never claim to be a medical device or provide a diagnosis
- Be specific — reference actual metric values and settings from the data
- Prioritise actionable findings over general observations
- Generate at least one "actionable" type insight with concrete investigation suggestions
- Do not repeat what the rule-based system would already catch (simple threshold checks)

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
});

type RequestBody = z.infer<typeof RequestBodySchema>;

function buildUserPrompt(body: RequestBody): string {
  const { nights, selectedNightIndex, therapyChangeDate, nightNotes } = body;
  const selected = nights[selectedNightIndex];
  const previous = selectedNightIndex < nights.length - 1 ? nights[selectedNightIndex + 1] : null;

  const context: Record<string, unknown> = {
    selectedNight: {
      date: selected.dateStr,
      durationHours: selected.durationHours,
      sessionCount: selected.sessionCount,
      settings: selected.settings,
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
    if (nightNotes.note) activeNotes.note = nightNotes.note;
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

  // Rate limiting (C3)
  const ip = getRateLimitKey(request);
  if (aiRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Auth check — require signed-in user
  const supabase = getSupabaseServer();
  if (!supabase) {
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

  if (userTier === 'community') {
    const adminClient = getSupabaseServiceRole();
    if (adminClient) {
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
  }

  // Validate Anthropic API key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  // Parse and validate request body with Zod (M4)
  let body: RequestBody;
  try {
    const raw = await request.json();
    const parsed = RequestBodySchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[ai-insights] 400 Zod validation failed:', parsed.error.issues[0]?.message);
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    console.warn('[ai-insights] 400 invalid request body (JSON parse failed)');
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Cross-field validation: selectedNightIndex must be within bounds
  if (body.selectedNightIndex >= body.nights.length) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey, maxRetries: 3 });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Parse insights from JSON response
    let insights: Insight[];
    try {
      insights = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    // Validate insight shape
    if (!Array.isArray(insights)) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    // Ensure all insights have valid types and required fields
    const validTypes = new Set(['positive', 'warning', 'actionable', 'info']);
    const validCategories = new Set(['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend']);

    insights = insights.filter(
      (i) =>
        i &&
        typeof i.id === 'string' &&
        validTypes.has(i.type) &&
        typeof i.title === 'string' &&
        typeof i.body === 'string' &&
        validCategories.has(i.category)
    );

    // Increment server-side AI usage counter atomically via RPC
    const adminClient = getSupabaseServiceRole();
    let remainingCredits: number | undefined;
    if (adminClient) {
      const month = getCurrentMonth();
      await adminClient.rpc('increment_ai_usage', {
        p_user_id: user.id,
        p_month: month,
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

    return NextResponse.json({
      insights,
      source: 'ai',
      ...(remainingCredits !== undefined && { remainingCredits }),
    });
  } catch (err) {
    // Distinguish rate limit errors from other failures
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

    Sentry.captureException(err, { tags: { route: 'ai-insights' } });
    console.error('[ai-insights] Error:', err);
    return NextResponse.json(
      { error: 'AI service error' },
      { status: 502 }
    );
  }
}
