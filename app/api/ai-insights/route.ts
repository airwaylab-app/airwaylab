import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { Insight } from '@/lib/insights';
import type { NightResult } from '@/lib/types';

export const runtime = 'edge';

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
- Therapy settings context (pressure support, EPR, mode) in relation to findings
- Oximetry-flow correlations when oximetry data is present

Rules:
- Always include "discuss with your clinician" or similar language in actionable insights
- Never claim to be a medical device or provide a diagnosis
- Be specific — reference actual metric values from the data
- Prioritise actionable findings over general observations
- Do not repeat what the rule-based system would already catch (simple threshold checks)

Respond ONLY with a JSON array of Insight objects. No markdown, no explanation, just the array.`;

interface RequestBody {
  nights: NightResult[];
  selectedNightIndex: number;
  therapyChangeDate: string | null;
}

function buildUserPrompt(body: RequestBody): string {
  const { nights, selectedNightIndex, therapyChangeDate } = body;
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

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.AI_INSIGHTS_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate Anthropic API key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    console.warn('[ai-insights] 400 invalid request body (JSON parse failed)');
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Basic validation
  if (
    !body.nights ||
    !Array.isArray(body.nights) ||
    body.nights.length === 0 ||
    body.nights.length > 365 ||
    typeof body.selectedNightIndex !== 'number' ||
    body.selectedNightIndex < 0 ||
    body.selectedNightIndex >= body.nights.length
  ) {
    console.warn(`[ai-insights] 400 invalid request data: nights=${Array.isArray(body.nights) ? body.nights.length : 'not array'}, index=${body.selectedNightIndex}`);
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: anthropicKey });

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

    return NextResponse.json({ insights, source: 'ai' });
  } catch (err) {
    console.error('[ai-insights] Error:', err);
    return NextResponse.json(
      { error: 'AI service error' },
      { status: 502 }
    );
  }
}
