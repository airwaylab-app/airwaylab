import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { getSupabaseServiceRole } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env'
import { cancelAllPending } from '@/lib/email/sequences'
import { sendAlert, formatEmailAlertEmbed } from '@/lib/discord-webhook'

/**
 * POST /api/webhooks/resend?secret=<RESEND_WEBHOOK_SECRET>
 *
 * Receives all events from Resend and updates email_sequences + email_log.
 * Auth via secret query param (no svix dependency needed).
 *
 * Configure in Resend dashboard:
 *   Webhook URL: https://airwaylab.app/api/webhooks/resend?secret=<RESEND_WEBHOOK_SECRET>
 *   Events: all
 *
 * Events are matched by resend_id: first in email_sequences (drip emails),
 * then in email_log (transactional + admin emails). First event wins
 * (opened_at is set once, not updated on re-opens).
 */

const ResendEventSchema = z.object({
  type: z.string(), // Accept any event type -- future-proof
  created_at: z.string(),
  data: z
    .object({
      email_id: z.string(),
    })
    .passthrough(),
})

// Map Resend event types to timestamp columns (shared by both tables)
const EVENT_COLUMN_MAP: Record<string, string> = {
  'email.delivered': 'delivered_at',
  'email.opened': 'opened_at',
  'email.clicked': 'clicked_at',
}

// Events that require special handling beyond a timestamp update
const SPECIAL_EVENTS = new Set(['email.bounced', 'email.complained'])

export async function POST(request: NextRequest) {
  // Validate secret
  const secret = request.nextUrl.searchParams.get('secret')
  const expectedSecret = serverEnv.RESEND_WEBHOOK_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ResendEventSchema.safeParse(body)

  if (!parsed.success) {
    console.error('[resend-webhook] Invalid payload:', parsed.error.message)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { type, data } = parsed.data

  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Handle bounce/complaint: cancel pending emails for the user
    if (SPECIAL_EVENTS.has(type)) {
      // Check email_sequences first
      const { data: seqRow } = await supabase
        .from('email_sequences')
        .select('user_id')
        .eq('resend_id', data.email_id)
        .limit(1)
        .single()

      if (seqRow?.user_id) {
        await cancelAllPending(supabase, seqRow.user_id)

        if (type === 'email.complained') {
          await supabase
            .from('profiles')
            .update({ email_opt_in: false })
            .eq('id', seqRow.user_id)
        }

        // Discord #ops-alerts (fire-and-forget)
        void sendAlert('ops', '', [formatEmailAlertEmbed({
          event: type === 'email.complained' ? 'complaint' : 'bounce',
          email: data.email_id,
          resendId: data.email_id,
          userId: seqRow.user_id,
        })])

        console.error(
          `[resend-webhook] ${type} for user ${seqRow.user_id}, cancelled pending emails`
        )
        Sentry.captureMessage(`Email ${type}: ${data.email_id}`, {
          level: 'warning',
          tags: { route: 'resend-webhook', event_type: type },
          extra: { userId: seqRow.user_id },
        })
      }

      // Also update email_log if present (bounce tracking)
      if (type === 'email.bounced') {
        await supabase
          .from('email_log')
          .update({ bounced_at: new Date().toISOString() })
          .eq('resend_id', data.email_id)
      }

      return NextResponse.json({ received: true, tracked: true })
    }

    // Handle timestamp events (delivered, opened, clicked)
    const column = EVENT_COLUMN_MAP[type]
    if (!column) {
      return NextResponse.json({ received: true, tracked: false })
    }

    const now = new Date().toISOString()

    // Try email_sequences first (drip emails)
    const { data: seqResult } = await supabase
      .from('email_sequences')
      .update({ [column]: now })
      .eq('resend_id', data.email_id)
      .is(column, null)
      .select('id')

    // Fallback: try email_log (transactional + admin emails)
    if (!seqResult?.length) {
      const { error } = await supabase
        .from('email_log')
        .update({ [column]: now })
        .eq('resend_id', data.email_id)
        .is(column, null)

      if (error) {
        console.error(
          `[resend-webhook] Failed to update ${column} for ${data.email_id}:`,
          error.message
        )
        Sentry.captureException(error, {
          tags: { route: 'resend-webhook', event_type: type },
        })
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true, tracked: true })
  } catch (err) {
    console.error('[resend-webhook] Error:', err)
    Sentry.captureException(err, { tags: { route: 'resend-webhook' } })
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
