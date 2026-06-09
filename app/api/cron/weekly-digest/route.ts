import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { COLORS } from '@/lib/discord-webhook'
import { DISCUSSION_TOPICS, USAGE_TIPS, getISOWeekNumber } from './community-topics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/weekly-digest
 *
 * Runs weekly via Vercel Cron (Sunday 18:00 UTC). Posts the weekly community
 * discussion topic + usage tip to #general via DISCORD_GENERAL_WEBHOOK_URL.
 *
 * Admin usage + data metrics (subs, feedback, contributions, deletions) now
 * live in the daily /api/cron/discord-strategy-digest — the single source of
 * truth. This route is community content only.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const week = getISOWeekNumber()
    const topic = DISCUSSION_TOPICS[week % DISCUSSION_TOPICS.length]!
    const tip = USAGE_TIPS[week % USAGE_TIPS.length]!

    const generalWebhookUrl = process.env.DISCORD_GENERAL_WEBHOOK_URL
    if (!generalWebhookUrl) {
      Sentry.captureMessage(
        '[cron/weekly-digest] DISCORD_GENERAL_WEBHOOK_URL not configured — weekly community post skipped',
        'warning',
      )
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_webhook' })
    }

    // Discussion topic
    await fetch(generalWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `:speech_balloon: Weekly Discussion: ${topic.title}`,
          description: topic.prompt,
          color: COLORS.teal,
          footer: { text: 'Share your experience — discuss with your clinician before making changes.' },
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => { /* fail-open: community content, non-critical */ })

    // Usage tip
    await fetch(generalWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: ':bulb: Tip of the Week',
          description: tip,
          color: COLORS.blue,
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => { /* fail-open: community content, non-critical */ })

    console.error(`[cron/weekly-digest] posted community topic=${topic.title}`)

    return NextResponse.json({ ok: true, topic: topic.title })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-weekly-digest' } })
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 })
  }
}
