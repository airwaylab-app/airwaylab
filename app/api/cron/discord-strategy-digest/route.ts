import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { COLORS } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/discord-strategy-digest
 *
 * Runs daily at 09:00 CET (08:00 UTC). The single usage + data digest:
 * aggregates the past 24h (subscriptions, non-bug feedback, provider interest,
 * data contributions, account deletions) and posts one embed to #strategy-digest
 * via DISCORD_WEBHOOK_STRATEGY_DIGEST. Skips posting if there are zero events.
 *
 * Fails LOUD: a missing webhook or a failed Discord POST is reported to Sentry,
 * never swallowed — a silent digest is how this went unnoticed before.
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

  const webhookUrl = process.env.DISCORD_WEBHOOK_STRATEGY_DIGEST
  if (!webhookUrl) {
    Sentry.captureMessage(
      '[cron/discord-strategy-digest] DISCORD_WEBHOOK_STRATEGY_DIGEST not configured — usage+data digest cannot post',
      'warning',
    )
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [
      subscriptionEvents,
      feedbackResult,
      providerInterestResult,
      dataContributionsResult,
      deletionRequestsResult,
    ] = await Promise.all([
      supabase
        .from('subscription_events')
        .select('event_type')
        .gte('created_at', dayAgo),
      supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .neq('type', 'bug')
        .gte('created_at', dayAgo),
      supabase
        .from('provider_interest')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayAgo),
      supabase
        .from('data_contributions')
        .select('night_count')
        .gte('created_at', dayAgo),
      supabase
        .from('account_deletion_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayAgo),
    ])

    const subEvents = subscriptionEvents.data ?? []
    const newSubs = subEvents.filter((e) => e.event_type === 'created').length
    const cancellations = subEvents.filter((e) => e.event_type === 'cancelled').length
    const nonBugFeedback = feedbackResult.count ?? 0
    const providerInterest = providerInterestResult.count ?? 0
    const contributions = dataContributionsResult.data ?? []
    const totalNights = contributions.reduce((sum, c) => sum + (c.night_count ?? 0), 0)
    const deletionRequests = deletionRequestsResult.count ?? 0

    const totalEvents =
      newSubs + cancellations + nonBugFeedback + providerInterest + contributions.length + deletionRequests

    if (totalEvents === 0) {
      console.error('[cron/discord-strategy-digest] no events in last 24h — skipping Discord push')
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_events' })
    }

    const netSubs = newSubs - cancellations
    const color = netSubs > 0 ? COLORS.green : netSubs < 0 ? COLORS.red : COLORS.blue

    const fields = [
      { name: 'New Subscriptions', value: String(newSubs), inline: true },
      { name: 'Cancellations', value: String(cancellations), inline: true },
      { name: 'Net', value: `${netSubs >= 0 ? '+' : ''}${netSubs}`, inline: true },
      { name: 'Feedback (non-bug)', value: String(nonBugFeedback), inline: true },
      { name: 'Data Contributions', value: `${contributions.length} (${totalNights} nights)`, inline: true },
      { name: 'Provider Interest', value: String(providerInterest), inline: true },
      { name: 'Deletion Requests', value: String(deletionRequests), inline: true },
    ]

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: ':bar_chart: Daily Usage & Data Digest',
          description: `24h ending ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
          color,
          fields,
          footer: { text: 'Daily usage & data cron' },
          timestamp: new Date().toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      Sentry.captureMessage(
        `[cron/discord-strategy-digest] Discord POST failed (${res.status})`,
        'warning',
      )
    }

    console.error(
      `[cron/discord-strategy-digest] newSubs=${newSubs} cancellations=${cancellations} feedback=${nonBugFeedback} providerInterest=${providerInterest} contributions=${contributions.length} deletions=${deletionRequests}`,
    )

    return NextResponse.json({
      ok: true,
      newSubs,
      cancellations,
      nonBugFeedback,
      providerInterest,
      contributions: contributions.length,
      totalNights,
      deletionRequests,
      discordPosted: res.ok,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-discord-strategy-digest' } })
    return NextResponse.json({ error: 'Strategy digest failed' }, { status: 500 })
  }
}
