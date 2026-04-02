/**
 * Admin endpoint to send broadcast emails to all opted-in users.
 *
 * Protected by X-Admin-Secret header (ADMIN_API_KEY env var).
 * Idempotent: checks email_log for existing broadcasts of the same template.
 * Supports dry-run mode (default) and A/B subject testing.
 *
 * Usage:
 *   # Dry run (returns count + sample, sends nothing)
 *   curl -X POST https://airwaylab.app/api/admin/broadcast \
 *     -H "x-admin-secret: $ADMIN_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"templateId": "march_2026_update"}'
 *
 *   # Live send
 *   curl -X POST https://airwaylab.app/api/admin/broadcast \
 *     -H "x-admin-secret: $ADMIN_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"templateId": "march_2026_update", "dryRun": false}'
 */

import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseServiceRole } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token'
import { BROADCAST_TEMPLATES, type BroadcastSubjectVariant } from '@/lib/email/broadcast'
import { sendAlert, formatBroadcastEmbed } from '@/lib/discord-webhook'

const ADMIN_SECRET = process.env.ADMIN_API_KEY
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 1000

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { templateId?: string; dryRun?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { templateId, dryRun = true } = body
  if (!templateId) {
    return NextResponse.json(
      { error: 'templateId required', available: Object.keys(BROADCAST_TEMPLATES) },
      { status: 400 }
    )
  }

  const template = BROADCAST_TEMPLATES[templateId]
  if (!template) {
    return NextResponse.json(
      { error: `Unknown template: ${templateId}`, available: Object.keys(BROADCAST_TEMPLATES) },
      { status: 400 }
    )
  }

  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Fetch all opted-in users with email
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email_opt_in', true)
      .not('email', 'is', null)

    if (fetchError) {
      console.error('[broadcast] Failed to fetch users:', fetchError)
      Sentry.captureException(fetchError, { tags: { route: 'admin-broadcast', action: 'fetch-users' } })
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: 'No opted-in users found' })
    }

    // Idempotency: skip users who already received this broadcast
    const emailType = `broadcast_${templateId}`
    const { data: alreadySent } = await supabase
      .from('email_log')
      .select('to_email')
      .eq('email_type', emailType)

    const alreadySentEmails = new Set(
      (alreadySent ?? []).map(r => r.to_email)
    )

    const toSend = users.filter(u => !alreadySentEmails.has(u.email))
    const skipped = users.length - toSend.length

    // Dry run: return count + sample email, send nothing
    if (dryRun) {
      const sampleUnsubscribeUrl = 'https://airwaylab.app/api/email/unsubscribe?token=SAMPLE'
      const sampleA = template.getTemplate(sampleUnsubscribeUrl, 'A')
      const sampleB = template.getTemplate(sampleUnsubscribeUrl, 'B')

      return NextResponse.json({
        dryRun: true,
        templateId,
        total_opted_in: users.length,
        already_sent: skipped,
        would_send: toSend.length,
        subject_A: sampleA.subject,
        subject_B: sampleB.subject,
        sample_html_A: sampleA.html,
      })
    }

    // Live send: A/B split on subject line (50/50)
    let sent = 0
    const errors: string[] = []

    for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
      const batch = toSend.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (user) => {
          try {
            const variant: BroadcastSubjectVariant = (i + batch.indexOf(user)) % 2 === 0 ? 'A' : 'B'
            const unsubscribeUrl = getUnsubscribeUrl(user.id)
            const { subject, html } = template.getTemplate(unsubscribeUrl, variant)

            await sendEmail({
              to: user.email,
              subject,
              html,
              replyTo: 'dev@airwaylab.app',
              unsubscribeUrl,
              metadata: {
                emailType: emailType,
                userId: user.id,
              },
            })
            sent++
          } catch (err) {
            const msg = `Failed to send to ${user.email}: ${err}`
            console.error(`[broadcast] ${msg}`)
            errors.push(msg)
          }
        })
      )

      if (i + BATCH_SIZE < toSend.length) {
        await sleep(BATCH_DELAY_MS)
      }
    }

    if (errors.length > 0) {
      Sentry.captureMessage(`Broadcast ${templateId}: some emails failed`, {
        level: 'warning',
        extra: { errors, sent, skipped },
      })
    }

    // Discord #ops-alerts (fire-and-forget)
    void sendAlert('ops', '', [formatBroadcastEmbed({
      templateId: templateId,
      sent,
      skipped,
      errors: errors.length,
      totalOptedIn: users.length,
    })])

    return NextResponse.json({
      dryRun: false,
      templateId,
      sent,
      skipped,
      errors: errors.length,
      total_opted_in: users.length,
    })
  } catch (err) {
    console.error('[broadcast] Unexpected error:', err)
    Sentry.captureException(err, { tags: { action: 'broadcast', templateId } })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
