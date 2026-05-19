import { ResultAsync, okAsync } from 'neverthrow'
import type { AppError } from '@/lib/errors'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { supabaseQuery } from './supabase-helpers'
import { sendEmail } from '@/lib/email/send'
import { sendAlert, formatUserSignalEmbed } from '@/lib/discord-webhook'
import { payingUserContactAckEmail } from '@/lib/email/transactional'
import { checkAndUpdateDedup } from '@/app/api/device-diagnostic/_dedup'
import * as Sentry from '@sentry/nextjs'

// ── Types ────────────────────────────────────────────────────

export interface FeedbackInput {
  message: string
  email: string | null
  type: 'feature' | 'bug' | 'support' | 'feedback'
  page: string | null
  user_id?: string | null
  contact_ok?: boolean
  metadata?: Record<string, unknown> | null
}

// ── Constants ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
  support: 'Support request',
  feedback: 'Feedback',
}

// ── Helpers ──────────────────────────────────────────────────

async function maybeSendContactAck(
  input: FeedbackInput,
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<void> {
  if (!input.email) return

  const meta = (input.metadata ?? {}) as Record<string, unknown>
  const category = typeof meta.category === 'string' ? meta.category : undefined
  const isBillingCategory = category === 'billing'

  let isPayingUser = false
  if (!isBillingCategory) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', input.email)
      .single()

    if (profile) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', profile.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()
      isPayingUser = !!sub
    }
  }

  if (!isBillingCategory && !isPayingUser) return

  const now = new Date()
  const { shouldFire } = await checkAndUpdateDedup(
    supabase,
    `contact_ack:${input.email}`,
    now,
    30 * 60 * 1000,
  )
  if (!shouldFire) return

  const name = typeof meta.display_name === 'string' ? meta.display_name : null
  const template = payingUserContactAckEmail(name)
  await sendEmail({
    to: input.email,
    ...template,
    metadata: { emailType: 'contact_ack_paying' },
  })
}

// ── Service function ─────────────────────────────────────────

/**
 * Persists feedback to Supabase and fires notifications.
 *
 * Notification routing (every type fans out to all three trails):
 * - Email (dev@airwaylab.app) + Discord (#user-signals, admin-only) for ALL types
 * - Bug reports additionally @mention the admin in Discord
 * The feedback row id is stamped into both trails so triage can reconcile the
 * GitHub issue it opens against the Supabase source of truth.
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
    console.error('[feedback] Supabase not configured', {
      type: input.type,
      messagePreview: input.message.slice(0, 100),
    })
    return okAsync({ ok: true as const })
  }

  return supabaseQuery<{ id: string }>(
    supabase.from('feedback').insert({
      message: `[${input.type}] ${input.message.trim()}`,
      email: input.email?.trim() || null,
      page: input.page,
      user_id: input.user_id ?? null,
      contact_ok: input.contact_ok ?? false,
      type: input.type,
      metadata: input.metadata ?? null,
    }).select('id').single(),
    'feedback',
  ).map((row) => {
    const feedbackId = row.id
    const label = TYPE_LABELS[input.type] ?? 'Feedback'
    const meta = (input.metadata ?? {}) as Record<string, unknown>

    // Admin email for EVERY feedback type (internal inbox, full context incl. PHI)
    void sendEmail({
      to: 'dev@airwaylab.app',
      subject: `${label}: ${input.message.slice(0, 60)}${input.message.length > 60 ? '...' : ''}`,
      text: [
        `New ${label.toLowerCase()} on airwaylab.app`,
        '',
        `Feedback ID: ${feedbackId}`,
        `Type: ${label}`,
        `Page: ${input.page ?? '\u2014'}`,
        `Email: ${input.email?.trim() ?? '\u2014'}`,
        `Contact OK: ${input.contact_ok ? 'Yes' : 'No'}`,
        `User ID: ${input.user_id ?? '\u2014'}`,
        `Tier: ${meta.user_tier ?? '\u2014'}`,
        `Display name: ${meta.display_name ?? '\u2014'}`,
        '',
        'Message:',
        input.message.trim(),
        '',
        '\u2500\u2500 Context \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
        `App version: ${meta.app_version ?? '\u2014'}`,
        `Browser: ${typeof meta.user_agent === 'string' ? meta.user_agent.slice(0, 120) : '\u2014'}`,
        `Screen: ${meta.screen_width ?? '?'}x${meta.screen_height ?? '?'} (viewport: ${meta.viewport_width ?? '?'}x${meta.viewport_height ?? '?'})`,
        `Timezone: ${meta.timezone ?? '\u2014'}`,
        `Has analysis: ${meta.has_analysis_results === true ? 'Yes' : meta.has_analysis_results === false ? 'No' : '\u2014'}`,
      ].join('\n'),
      metadata: { emailType: 'admin_feedback' },
    })

    // Discord notification for all feedback types
    // Personal mention for bugs so admin gets pinged
    const adminUserId = process.env.DISCORD_ADMIN_USER_ID
    const discordContent = input.type === 'bug' && adminUserId
      ? `<@${adminUserId}> Bug report submitted`
      : ''

    void sendAlert('user-signals', discordContent, [formatUserSignalEmbed({
      type: input.message.startsWith('Oximetry format request') ? 'unsupported_device' : 'feedback',
      category: label,
      message: input.message.trim(),
      email: input.email?.trim() ?? undefined,
      feedbackId,
    })])

    void maybeSendContactAck(input, supabase).catch((err) => {
      Sentry.captureException(err, { tags: { fn: 'maybeSendContactAck' } })
    })

    return { ok: true as const }
  })
}
