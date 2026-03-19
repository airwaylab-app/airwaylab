import { ResultAsync, okAsync } from 'neverthrow'
import * as Sentry from '@sentry/nextjs'
import type { AppError } from '@/lib/errors'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env'
import { supabaseInsert } from './supabase-helpers'

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

// ── Notification email (fire-and-forget) ─────────────────────

function sendNotificationEmail(fields: {
  category: string
  name: string | null
  email: string
  message: string
}) {
  const apiKey = serverEnv.RESEND_API_KEY
  if (!apiKey) return

  const label = CATEGORY_LABELS[fields.category] ?? 'General'
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'AirwayLab <noreply@mail.airwaylab.app>',
      to: ['dev@airwaylab.app'],
      reply_to: fields.email,
      subject: `[${label}] ${fields.message.slice(0, 60)}${fields.message.length > 60 ? '...' : ''}`,
      text: [
        `New contact form submission on airwaylab.app`,
        '',
        `Category: ${label}`,
        `Name: ${fields.name ?? '\u2014'}`,
        `Email: ${fields.email}`,
        '',
        `Message:`,
        fields.message,
      ].join('\n'),
    }),
  })
    .then((res) => {
      if (!res.ok) {
        res.text().then((body) => {
          console.error('[contact] Resend error:', res.status, body)
        })
      }
    })
    .catch((err) => {
      console.error('[contact] Notification email failed:', err)
    })
}

// ── Service function ─────────────────────────────────────────

/**
 * Persists a contact form submission to Supabase and fires a
 * notification email.
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
    // Side effects on success
    sendNotificationEmail({
      category: input.category,
      name: input.name,
      email: normalizedEmail,
      message: input.message.trim(),
    })

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
