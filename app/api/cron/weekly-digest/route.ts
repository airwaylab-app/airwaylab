import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendAlert, COLORS } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/weekly-digest
 *
 * Runs weekly via Vercel Cron (Sunday 18:00 UTC). Posts a summary
 * embed to #ops-alerts with key metrics from the past 7 days.
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

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel
    const [
      subscriptionEvents,
      feedbackCount,
      dataContributions,
      providerInterest,
      deletionRequests,
    ] = await Promise.all([
      supabase
        .from('subscription_events')
        .select('event_type')
        .gte('created_at', weekAgo),
      supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('data_contributions')
        .select('night_count')
        .gte('created_at', weekAgo),
      supabase
        .from('provider_interest')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('account_deletion_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
    ])

    // Aggregate subscription events
    const subEvents = subscriptionEvents.data ?? []
    const newSubs = subEvents.filter((e) => e.event_type === 'created').length
    const cancellations = subEvents.filter((e) => e.event_type === 'cancelled').length
    const netSubs = newSubs - cancellations

    // Aggregate data contributions
    const contributions = dataContributions.data ?? []
    const totalNights = contributions.reduce((sum, c) => sum + (c.night_count ?? 0), 0)

    const fields = [
      { name: 'New Subscriptions', value: String(newSubs), inline: true },
      { name: 'Cancellations', value: String(cancellations), inline: true },
      { name: 'Net', value: `${netSubs >= 0 ? '+' : ''}${netSubs}`, inline: true },
      { name: 'Feedback', value: String(feedbackCount.count ?? 0), inline: true },
      { name: 'Data Contributions', value: `${contributions.length} (${totalNights} nights)`, inline: true },
      { name: 'Provider Interest', value: String(providerInterest.count ?? 0), inline: true },
      { name: 'Deletion Requests', value: String(deletionRequests.count ?? 0), inline: true },
    ]

    const color = netSubs > 0 ? COLORS.green : netSubs < 0 ? COLORS.red : COLORS.blue

    await sendAlert('ops', '', [{
      title: ':calendar: Weekly Digest',
      description: `Week ending ${new Date().toISOString().slice(0, 10)}`,
      color,
      fields,
      footer: { text: 'Weekly cron' },
      timestamp: new Date().toISOString(),
    }])

    console.error(`[cron/weekly-digest] subs=+${newSubs}/-${cancellations}, feedback=${feedbackCount.count}, contributions=${contributions.length}`)

    return NextResponse.json({
      ok: true,
      newSubs,
      cancellations,
      feedback: feedbackCount.count,
      contributions: contributions.length,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-weekly-digest' } })
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 })
  }
}
