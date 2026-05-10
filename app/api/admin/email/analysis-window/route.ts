/**
 * One-time send: analysis window history cap announcement (AIR-1087).
 *
 * Audience: community-tier users who opted in to product updates AND have
 * at least one synced night older than 14 days (i.e. affected by the window).
 * Users whose entire history falls within 14 days see no change and are excluded.
 *
 * DO NOT TRIGGER until AIR-1086 compliance review returns PASS.
 *
 * Usage (dry run — safe to call anytime):
 *   curl -X POST https://airwaylab.app/api/admin/email/analysis-window \
 *     -H "x-admin-secret: $ADMIN_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dryRun": true}'
 *
 * Live send (requires compliance clearance):
 *   curl -X POST https://airwaylab.app/api/admin/email/analysis-window \
 *     -H "x-admin-secret: $ADMIN_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dryRun": false}'
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { getSupabaseServiceRole } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token'
import { BROADCAST_TEMPLATES } from '@/lib/email/broadcast'

const TEMPLATE_ID = 'analysis_window_announcement'
const EMAIL_TYPE = `broadcast_${TEMPLATE_ID}`
const HISTORY_CUTOFF_DAYS = 14
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 1000

const RequestSchema = z.object({
  dryRun: z.boolean().default(true),
})

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get('x-admin-secret')
  const adminSecret = process.env.ADMIN_API_KEY

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = RequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    )
  }

  const { dryRun } = parsed.data

  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const template = BROADCAST_TEMPLATES[TEMPLATE_ID]
  if (!template) {
    return NextResponse.json({ error: `Template not found: ${TEMPLATE_ID}` }, { status: 500 })
  }

  try {
    // Step 1: users with at least one synced night older than the cutoff
    const cutoffDate = new Date(Date.now() - HISTORY_CUTOFF_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: nightRows, error: nightsError } = await supabase
      .from('user_nights')
      .select('user_id')
      .lt('night_date', cutoffDate)

    if (nightsError) {
      console.error('[analysis-window-email] Failed to query user_nights:', nightsError)
      Sentry.captureException(nightsError, { tags: { route: 'analysis-window-email', action: 'query-nights' } })
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    const eligibleUserIds = [...new Set((nightRows ?? []).map(r => r.user_id))]

    if (eligibleUserIds.length === 0) {
      return NextResponse.json({
        dryRun,
        audience: 0,
        already_sent: 0,
        would_send: 0,
        message: 'No users with synced nights older than 14 days.',
      })
    }

    // Step 2: community-tier users who opted in, filtered to eligible set
    const { data: users, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('tier', 'community')
      .eq('email_opt_in', true)
      .not('email', 'is', null)
      .in('id', eligibleUserIds)

    if (profilesError) {
      console.error('[analysis-window-email] Failed to query profiles:', profilesError)
      Sentry.captureException(profilesError, { tags: { route: 'analysis-window-email', action: 'query-profiles' } })
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    const audience = users ?? []

    if (audience.length === 0) {
      return NextResponse.json({
        dryRun,
        audience: 0,
        already_sent: 0,
        would_send: 0,
        message: 'No eligible community users with opt-in and qualifying history.',
      })
    }

    // Step 3: idempotency — skip addresses that already received this broadcast
    const { data: alreadySentRows } = await supabase
      .from('email_log')
      .select('to_email')
      .eq('email_type', EMAIL_TYPE)

    const alreadySentEmails = new Set((alreadySentRows ?? []).map(r => r.to_email))
    const toSend = audience.filter(u => !alreadySentEmails.has(u.email))
    const alreadySentCount = audience.length - toSend.length

    if (dryRun) {
      const sampleUnsubscribeUrl = `https://airwaylab.app/api/email/unsubscribe?token=SAMPLE`
      const { subject, html: sampleHtml } = template.getTemplate(sampleUnsubscribeUrl, 'A')
      return NextResponse.json({
        dryRun: true,
        template_id: TEMPLATE_ID,
        audience: audience.length,
        already_sent: alreadySentCount,
        would_send: toSend.length,
        subject,
        sample_html: sampleHtml,
      })
    }

    // Step 4: live send
    let sent = 0
    const errors: string[] = []

    for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
      const batch = toSend.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (user) => {
          try {
            const unsubscribeUrl = getUnsubscribeUrl(user.id)
            const { subject, html } = template.getTemplate(unsubscribeUrl, 'A')

            await sendEmail({
              to: user.email,
              subject,
              html,
              replyTo: 'dev@airwaylab.app',
              unsubscribeUrl,
              metadata: {
                emailType: EMAIL_TYPE,
                userId: user.id,
              },
            })
            sent++
          } catch (err) {
            const msg = `Failed for ${user.email}: ${err}`
            console.error(`[analysis-window-email] ${msg}`)
            errors.push(msg)
          }
        })
      )

      if (i + BATCH_SIZE < toSend.length) {
        await sleep(BATCH_DELAY_MS)
      }
    }

    if (errors.length > 0) {
      Sentry.captureMessage(`analysis_window_announcement: ${errors.length} send failures`, {
        level: 'warning',
        extra: { errors, sent, skipped: alreadySentCount },
      })
    }

    console.error('[analysis-window-email] Send complete', {
      sent,
      skipped: alreadySentCount,
      errors: errors.length,
      audience: audience.length,
    })

    return NextResponse.json({
      dryRun: false,
      template_id: TEMPLATE_ID,
      audience: audience.length,
      sent,
      skipped: alreadySentCount,
      errors: errors.length,
    })
  } catch (err) {
    console.error('[analysis-window-email] Unexpected error:', err)
    Sentry.captureException(err, { tags: { route: 'analysis-window-email' } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
