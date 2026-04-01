import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendAlert, COLORS } from '@/lib/discord-webhook';

export const dynamic = 'force-dynamic';

/**
 * MDR-risky patterns to scan for in AI-generated insight text.
 * Each pattern has a label for the alert and a regex to match.
 * These mirror the MDR copy guard hook patterns.
 */
const MDR_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'therapy-type recommendation', regex: /consider\s+(adjusting|decreasing|increasing|changing)/i },
  { label: 'concrete therapy suggestion', regex: /suggest\s+(concrete|specific)\s+adjustments/i },
  { label: 'efficacy claim', regex: /therapy\s+looks\s+effective|treatment\s+is\s+working/i },
  { label: 'diagnostic implication', regex: /may\s+indicate\s+\w|suggests\s+\w.*(?:obstruction|apnea|condition)/i },
  { label: 'population prediction', regex: /patterns?\s+like\s+yours\s+typically\s+respond\s+to/i },
  { label: 'urgency framing', regex: /your\s+results\s+need\s+attention/i },
  { label: 'pressure-specific guidance', regex: /discuss\s+(pressure|settings)\s+adjustments/i },
  { label: 'population outcome framing', regex: /users\s+(like\s+you|with\s+similar)\s+.*(?:report|experience|tend\s+to)/i },
];

interface MDRViolation {
  log_id: number;
  created_at: string;
  tier: string;
  pattern_label: string;
  matched_text: string;
}

/**
 * GET /api/cron/ai-monitor
 *
 * Runs daily via Vercel Cron (05:00 UTC). Scans recent AI insight
 * outputs for MDR-risky language patterns and reports quality stats.
 * Alerts to Discord #ops-alerts if violations found.
 *
 * Also cleans up log entries older than 90 days.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    // Fetch last 24h of AI insight logs
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: fetchError } = await supabase
      .from('ai_insights_log')
      .select('id, created_at, tier, insights, insight_count, input_tokens, output_tokens, truncated')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[cron/ai-monitor] Fetch error:', fetchError.message);
      Sentry.captureException(fetchError, { tags: { route: 'cron-ai-monitor' } });
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }

    const totalRequests = logs?.length ?? 0;

    // ── MDR pattern scan ──────────────────────────────────────
    const violations: MDRViolation[] = [];

    for (const log of logs ?? []) {
      const insightsArray = typeof log.insights === 'string'
        ? JSON.parse(log.insights)
        : log.insights;

      if (!Array.isArray(insightsArray)) continue;

      for (const insight of insightsArray) {
        const text = `${insight.title ?? ''} ${insight.body ?? ''} ${insight.context ?? ''}`;
        for (const { label, regex } of MDR_PATTERNS) {
          const match = text.match(regex);
          if (match) {
            violations.push({
              log_id: log.id,
              created_at: log.created_at,
              tier: log.tier,
              pattern_label: label,
              matched_text: match[0],
            });
          }
        }
      }
    }

    // ── Quality stats ─────────────────────────────────────────
    let totalInsights = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let truncatedCount = 0;
    const categoryCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};

    for (const log of logs ?? []) {
      totalInsights += log.insight_count ?? 0;
      totalInputTokens += log.input_tokens ?? 0;
      totalOutputTokens += log.output_tokens ?? 0;
      if (log.truncated) truncatedCount++;

      const insightsArray = typeof log.insights === 'string'
        ? JSON.parse(log.insights)
        : log.insights;

      if (!Array.isArray(insightsArray)) continue;
      for (const insight of insightsArray) {
        if (insight.category) categoryCount[insight.category] = (categoryCount[insight.category] ?? 0) + 1;
        if (insight.type) typeCount[insight.type] = (typeCount[insight.type] ?? 0) + 1;
      }
    }

    // ── Cleanup old entries ───────────────────────────────────
    const { data: cleanedCount } = await supabase.rpc('cleanup_ai_insights_log');

    // ── Alert if violations found ─────────────────────────────
    if (violations.length > 0) {
      const violationSummary = violations
        .slice(0, 10)
        .map((v) => `- **${v.pattern_label}**: "${v.matched_text}" (log #${v.log_id}, ${v.tier})`)
        .join('\n');

      await sendAlert('ops', '', [{
        title: ':rotating_light: MDR Language Detected in AI Outputs',
        description: `${violations.length} violation(s) found in the last 24h across ${totalRequests} AI requests.\n\n${violationSummary}${violations.length > 10 ? `\n\n...and ${violations.length - 10} more` : ''}`,
        color: COLORS.red,
        footer: { text: 'AI Output Monitor -- investigate and update system prompt if needed' },
      }]);
    }

    // ── Daily digest (only if there were requests) ────────────
    if (totalRequests > 0) {
      const topCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(', ');

      const typeBreakdown = Object.entries(typeCount)
        .sort(([, a], [, b]) => b - a)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');

      await sendAlert('ops', '', [{
        title: 'AI Insights -- Daily Digest',
        color: violations.length > 0 ? COLORS.amber : COLORS.green,
        fields: [
          { name: 'Requests', value: `${totalRequests}`, inline: true },
          { name: 'Insights generated', value: `${totalInsights}`, inline: true },
          { name: 'Truncated', value: `${truncatedCount}`, inline: true },
          { name: 'Tokens (in/out)', value: `${totalInputTokens.toLocaleString()} / ${totalOutputTokens.toLocaleString()}`, inline: true },
          { name: 'MDR violations', value: `${violations.length}`, inline: true },
          { name: 'Cleaned (90d)', value: `${cleanedCount ?? 0}`, inline: true },
          { name: 'Categories', value: topCategories || 'none', inline: false },
          { name: 'Types', value: typeBreakdown || 'none', inline: false },
        ],
        footer: { text: 'AI Output Monitor' },
      }]);
    }

    console.error(
      `[cron/ai-monitor] completed: requests=${totalRequests}, insights=${totalInsights}, violations=${violations.length}, cleaned=${cleanedCount ?? 0}`
    );

    return NextResponse.json({
      ok: true,
      requests: totalRequests,
      insights: totalInsights,
      violations: violations.length,
      cleaned: cleanedCount ?? 0,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-ai-monitor' } });
    return NextResponse.json({ error: 'Monitor failed' }, { status: 500 });
  }
}
