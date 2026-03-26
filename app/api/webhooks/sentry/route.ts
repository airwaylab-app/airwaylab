import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendOpsAlert } from '@/lib/discord-webhook'

/**
 * POST /api/webhooks/sentry?secret=<SENTRY_WEBHOOK_SECRET>
 *
 * Receives Sentry alert webhooks and forwards them to Discord #ops-alerts
 * as formatted embeds. Replaces Sentry's native Discord integration
 * (which requires Team plan).
 *
 * Configure in Sentry:
 *   Alert Rules > Actions > "Send a notification via a service"
 *   Service: WebhookPlugin (legacy) or use "Send a notification to a service"
 *   URL: https://airwaylab.app/api/webhooks/sentry?secret=<SENTRY_WEBHOOK_SECRET>
 */

const COLORS = {
  error: 0xef4444,
  warning: 0xf59e0b,
  info: 0x3b82f6,
  default: 0x6b7280,
} as const

// Sentry webhook payload is loosely typed — validate just what we need
const SentryWebhookSchema = z.object({
  action: z.string().optional(),
  data: z.object({
    issue: z.object({
      id: z.string(),
      title: z.string(),
      culprit: z.string().optional(),
      level: z.string().optional(),
      metadata: z.object({
        type: z.string().optional(),
        value: z.string().optional(),
      }).optional(),
      count: z.union([z.string(), z.number()]).optional(),
      firstSeen: z.string().optional(),
      shortId: z.string().optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough()

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const expected = process.env.SENTRY_WEBHOOK_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SentryWebhookSchema.safeParse(body)
  if (!parsed.success) {
    // Accept the webhook but skip Discord — unknown format
    console.error('[sentry-webhook] Unknown payload shape, skipping Discord')
    return NextResponse.json({ ok: true, forwarded: false })
  }

  const { data } = parsed.data
  const issue = data.issue
  const level = (issue.level ?? 'error') as keyof typeof COLORS
  const color = COLORS[level] ?? COLORS.default
  const count = issue.count ? ` (${issue.count}x)` : ''

  const embed = {
    title: `${issue.shortId ?? issue.id}: ${issue.title}`,
    description: issue.metadata?.value
      ? `\`${issue.metadata.type ?? 'Error'}: ${issue.metadata.value}\``
      : undefined,
    color,
    fields: [
      ...(issue.culprit ? [{ name: 'Location', value: `\`${issue.culprit}\``, inline: true }] : []),
      { name: 'Level', value: level.toUpperCase(), inline: true },
      { name: 'Events', value: String(issue.count ?? 1) + count, inline: true },
    ],
    footer: { text: 'Sentry — airwaylab' },
    timestamp: issue.firstSeen ?? new Date().toISOString(),
  }

  const issueUrl = `https://airwaylab.sentry.io/issues/${issue.id}/`
  const sent = await sendOpsAlert(`[View in Sentry](${issueUrl})`, [embed])

  return NextResponse.json({ ok: true, forwarded: sent })
}
