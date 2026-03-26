import { ResultAsync, okAsync } from 'neverthrow'
import * as Sentry from '@sentry/nextjs'
import type { AppError } from '@/lib/errors'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { supabaseInsert } from './supabase-helpers'
import { sendEmail } from '@/lib/email/send'
import { sendAlert, formatUserSignalEmbed } from '@/lib/discord-webhook'

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
    const label = TYPE_LABELS[input.type] ?? 'Feedback'

    // Admin notification (fire-and-forget)
    void sendEmail({
      to: 'dev@airwaylab.app',
      subject: `${label}: ${input.message.slice(0, 60)}${input.message.length > 60 ? '...' : ''}`,
      text: [
        `New ${label.toLowerCase()} on airwaylab.app`,
        '',
        `Type: ${label}`,
        `Page: ${input.page ?? '\u2014'}`,
        `Email: ${input.email?.trim() ?? '\u2014'}`,
        '',
        'Message:',
        input.message.trim(),
      ].join('\n'),
      metadata: { emailType: 'admin_feedback' },
    })

    // Discord notification (fire-and-forget)
    void sendAlert('user-signals', '', [formatUserSignalEmbed({
      type: input.message.startsWith('Oximetry format request') ? 'unsupported_device' : 'feedback',
      category: label,
      message: input.message.trim(),
      email: input.email?.trim() ?? undefined,
    })])

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
