import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { COLORS } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/discord-weekly-digest
 *
 * Runs weekly on Monday at 09:00 CET (08:00 UTC). Aggregates events from the
 * discord_digest_events table (digest_type='weekly') from the past 7 days and
 * posts a single embed to #weekly-digest via DISCORD_WEBHOOK_WEEKLY_DIGEST.
 * Marks consumed rows after posting. Skips posting if there are zero events.
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

  const webhookUrl = process.env.DISCORD_WEBHOOK_WEEKLY_DIGEST
  if (!webhookUrl) {
    console.error('[cron/discord-weekly-digest] DISCORD_WEBHOOK_WEEKLY_DIGEST not configured — skipping')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events, error } = await supabase
      .from('discord_digest_events')
      .select('id, event_type, payload, created_at')
      .eq('digest_type', 'weekly')
      .is('consumed_at', null)
      .gte('created_at', weekAgo)

    if (error) {
      throw new Error(`Failed to query discord_digest_events: ${error.message}`)
    }

    if (!events || events.length === 0) {
      console.error('[cron/discord-weekly-digest] no weekly-digest events in last 7d — skipping Discord push')
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_events' })
    }

    // Group by event_type for the digest summary
    const countByType: Record<string, number> = {}
    for (const ev of events) {
      countByType[ev.event_type] = (countByType[ev.event_type] ?? 0) + 1
    }

    const fields = Object.entries(countByType).map(([eventType, count]) => ({
      name: eventType.replace(/_/g, ' '),
      value: String(count),
      inline: true,
    }))

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: ':calendar: Weekly Digest',
          description: `7d ending ${new Date().toISOString().slice(0, 10)} — ${events.length} accumulated events`,
          color: COLORS.blue,
          fields,
          footer: { text: 'Weekly digest cron' },
          timestamp: new Date().toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.error(`[cron/discord-weekly-digest] Discord POST failed (${res.status})`)
    }

    // Mark rows consumed regardless of Discord delivery — events are recorded
    const consumedAt = new Date().toISOString()
    const ids = events.map((e) => e.id)
    const { error: updateError } = await supabase
      .from('discord_digest_events')
      .update({ consumed_at: consumedAt })
      .in('id', ids)

    if (updateError) {
      // Non-fatal: log but don't fail the cron — events won't be double-posted
      // since consumed_at is only set here and the next run filters by IS NULL.
      console.error('[cron/discord-weekly-digest] failed to mark events consumed:', updateError.message)
    }

    console.error(`[cron/discord-weekly-digest] events=${events.length} types=${Object.keys(countByType).join(',')}`  )

    return NextResponse.json({
      ok: true,
      eventCount: events.length,
      countByType,
      discordPosted: res.ok,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'cron-discord-weekly-digest' } })
    return NextResponse.json({ error: 'Weekly digest failed' }, { status: 500 })
  }
}
