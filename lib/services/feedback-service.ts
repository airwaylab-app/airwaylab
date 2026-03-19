import { ResultAsync, okAsync } from 'neverthrow'
import * as Sentry from '@sentry/nextjs'
import type { AppError } from '@/lib/errors'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env'
import { supabaseInsert } from './supabase-helpers'

// ── Types ────────────────────────────────────────────────────

export interface FeedbackInput {
  message: string
  email: string | null
  type: 'feature' | 'bug' | 'support' | 'feedback'
  page: string | null
}

// ── Constants ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
  support: 'Support request',
  feedback: 'Feedback',
}

// ── Notification email (fire-and-forget) ─────────────────────

function sendNotificationEmail(fields: {
  type: string
  message: string
  email: string | null
  page: string | null
}) {
  const apiKey = serverEnv.RESEND_API_KEY
  if (!apiKey) return

  const label = TYPE_LABELS[fields.type] ?? 'Feedback'
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'AirwayLab <noreply@mail.airwaylab.app>',
      to: ['dev@airwaylab.app'],
      subject: `${label}: ${fields.message.slice(0, 60)}${fields.message.length > 60 ? '...' : ''}`,
      text: [
        `New ${label.toLowerCase()} on airwaylab.app`,
        '',
        `Type: ${label}`,
        `Page: ${fields.page ?? '\u2014'}`,
        `Email: ${fields.email ?? '\u2014'}`,
        '',
        `Message:`,
        fields.message,
      ].join('\n'),
    }),
  })
    .then((res) => {
      if (!res.ok) {
        res.text().then((body) => {
          console.error('[feedback] Resend error:', res.status, body)
        })
      }
    })
    .catch((err) => {
      console.error('[feedback] Notification email failed:', err)
    })
}

// ── Service function ─────────────────────────────────────────

/**
 * Persists feedback to Supabase and fires a notification email.
 *
 * This function owns the business logic; HTTP concerns (auth, CSRF,
 * rate limiting, Zod validation) stay in the API route.
 */
export function submitFeedback(
  input: FeedbackInput,
): ResultAsync<{ ok: true }, AppError> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Graceful degradation: log and succeed when Supabase is not configured
    Sentry.logger.info('[feedback] Supabase not configured', {
      type: input.type,
      messagePreview: input.message.slice(0, 100),
    })
    return okAsync({ ok: true as const })
  }

  return supabaseInsert(
    supabase.from('feedback').insert({
      message: `[${input.type}] ${input.message.trim()}`,
      email: input.email?.trim() || null,
      page: input.page,
    }),
    'feedback',
  ).map((result) => {
    // Side effects on success: notification email + Sentry breadcrumb
    sendNotificationEmail({
      type: input.type,
      message: input.message.trim(),
      email: input.email?.trim() || null,
      page: input.page,
    })

    const isFormatRequest = input.message.startsWith('Oximetry format request')
    const alertType = isFormatRequest ? 'unsupported_format' : input.type
    const alertLevel =
      isFormatRequest || input.type === 'bug' ? 'warning' : 'info'

    Sentry.captureMessage(`New ${alertType} submission`, {
      level: alertLevel,
      tags: { route: 'feedback', feedback_type: alertType },
      extra: {
        message: input.message.trim().slice(0, 500),
        page: input.page,
      },
    })

    return result
  })
}
