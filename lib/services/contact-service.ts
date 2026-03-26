import { ResultAsync, okAsync } from 'neverthrow'
import * as Sentry from '@sentry/nextjs'
import type { AppError } from '@/lib/errors'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { supabaseInsert } from './supabase-helpers'
import { sendEmail } from '@/lib/email/send'
import { contactConfirmationEmail } from '@/lib/email/transactional'
import { sendAlert, formatUserSignalEmbed } from '@/lib/discord-webhook'

// ── Types ────────────────────────────────────────────────────

export interface ContactInput {
  email: string
  message: string
  name: string | null
  category: 'general' | 'privacy' | 'billing' | 'accessibility' | 'security'
}

// ── Constants ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  privacy: 'Privacy & Data',
  billing: 'Billing',
  accessibility: 'Accessibility',
  security: 'Security',
}

// ── Service function ─────────────────────────────────────────

/**
 * Persists a contact form submission to Supabase and fires
 * an admin notification + submitter confirmation.
 *
 * HTTP concerns (CSRF, rate limiting, Zod validation) stay in the route.
 */
export function submitContactForm(
  input: ContactInput,
): ResultAsync<{ ok: true }, AppError> {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    Sentry.logger.info('[contact] Supabase not configured', {
      category: input.category,
      messagePreview: input.message.slice(0, 100),
    })
    return okAsync({ ok: true as const })
  }

  const normalizedEmail = input.email.trim().toLowerCase()

  return supabaseInsert(
    supabase.from('feedback').insert({
      message: `[contact:${input.category}] ${input.name ? `${input.name}: ` : ''}${input.message.trim()}`,
      email: normalizedEmail,
      page: '/contact',
    }),
    'feedback',
  ).map((result) => {
    const label = CATEGORY_LABELS[input.category] ?? 'General'

    // Admin notification (fire-and-forget)
    void sendEmail({
      to: 'dev@airwaylab.app',
      subject: `[${label}] ${input.message.slice(0, 60)}${input.message.length > 60 ? '...' : ''}`,
      text: [
        'New contact form submission on airwaylab.app',
        '',
        `Category: ${label}`,
        `Name: ${input.name ?? '\u2014'}`,
        `Email: ${normalizedEmail}`,
        '',
        'Message:',
        input.message.trim(),
      ].join('\n'),
      replyTo: normalizedEmail,
      metadata: { emailType: 'admin_contact' },
    })

    // Submitter confirmation (fire-and-forget)
    const confirmation = contactConfirmationEmail(input.name, input.category)
    void sendEmail({
      to: normalizedEmail,
      subject: confirmation.subject,
      html: confirmation.html,
      metadata: { emailType: 'contact_confirmation' },
    })

    // Discord notification (fire-and-forget)
    void sendAlert('user-signals', '', [formatUserSignalEmbed({
      type: 'contact',
      category: label,
      message: input.message.trim(),
      email: normalizedEmail,
      name: input.name ?? undefined,
    })])

    Sentry.captureMessage(`New contact form: ${input.category}`, {
      level: input.category === 'security' ? 'warning' : 'info',
      tags: { route: 'contact', contact_category: input.category },
      extra: {
        message: input.message.trim().slice(0, 500),
        category: input.category,
      },
    })

    return result
  })
}
