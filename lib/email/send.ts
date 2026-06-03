/**
 * Email sending via Resend API with automatic logging to email_log.
 *
 * All emails in the app should go through this function so that
 * delivery is tracked via the Resend webhook -> email_log pipeline.
 */

import * as Sentry from '@sentry/nextjs'
import { serverEnv } from '@/lib/env'
import { getSupabaseServiceRole } from '@/lib/supabase/server'

function hashRecipient(email: string): string {
  const parts = email.split('@')
  const local = parts[0] ?? ''
  const domain = parts[1]
  const localHash = local.slice(0, 4) + '…'
  // domain is not PII — keep it for triage context
  return `${localHash}@${domain ?? 'unknown'}`
}

interface SendEmailParams {
  to: string
  subject: string
  /** HTML body (for branded templates) */
  html?: string
  /** Plain text body (for admin notifications) */
  text?: string
  /** Override reply-to (default: dev@airwaylab.app) */
  replyTo?: string
  /** Unsubscribe URL -- adds List-Unsubscribe headers for Gmail/Outlook native button */
  unsubscribeUrl?: string
  /** When provided, logs the email to the email_log table for delivery tracking */
  metadata?: {
    emailType: string
    userId?: string
  }
}

/**
 * Send a single email via Resend API.
 * Returns the Resend message ID on success, null on failure (logged, not thrown).
 * When metadata is provided, logs to email_log for Resend webhook correlation.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  unsubscribeUrl,
  metadata,
}: SendEmailParams): Promise<string | null> {
  const apiKey = serverEnv.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email-send] RESEND_API_KEY not configured')
    return null
  }

  if (!html && !text) {
    console.error('[email-send] Either html or text body is required')
    return null
  }

  // Resend rejects subjects containing newlines with HTTP 422
  const sanitizedSubject = subject.replace(/[\r\n]+/g, ' ').trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@mail.airwaylab.app>',
        reply_to: replyTo ?? 'dev@airwaylab.app',
        to: [to],
        subject: sanitizedSubject,
        ...(html && { html }),
        ...(text && { text }),
        ...(unsubscribeUrl && {
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      const err = new Error(`Resend API ${res.status}: ${errBody.slice(0, 200)}`)
      Sentry.captureException(err, {
        tags: { subsystem: 'email-send' },
        extra: { recipient_hash: hashRecipient(to), subject_pattern: sanitizedSubject.slice(0, 40), status: res.status },
      })
      console.error(`[email-send] Resend API error ${res.status}: ${errBody}`)
      return null
    }

    const data = (await res.json()) as { id?: string }
    const resendId = data.id ?? null

    // Log to email_log for delivery tracking (non-blocking)
    if (resendId && metadata) {
      void logEmail(resendId, to, subject, metadata)
    }

    return resendId
  } catch (err) {
    Sentry.captureException(err, {
      tags: { subsystem: 'email-send' },
      extra: { recipient_hash: hashRecipient(to), subject_pattern: sanitizedSubject.slice(0, 40) },
    })
    console.error('[email-send] Failed to send email:', err)
    return null
  }
}

/** Insert a row into email_log. Non-blocking -- failures are logged, not thrown. */
async function logEmail(
  resendId: string,
  toEmail: string,
  subject: string,
  metadata: { emailType: string; userId?: string },
): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole()
    if (!supabase) return

    const { error } = await supabase.from('email_log').insert({
      resend_id: resendId,
      to_email: toEmail,
      subject,
      email_type: metadata.emailType,
      user_id: metadata.userId ?? null,
    })

    if (error) {
      Sentry.captureException(new Error(error.message), {
        tags: { subsystem: 'email-log-insert' },
        extra: { email_type: metadata.emailType, resend_id: resendId },
      })
      console.error('[email-send] email_log insert failed:', error.message)
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { subsystem: 'email-log-insert' },
      extra: { email_type: metadata.emailType },
    })
    console.error('[email-send] email_log insert error:', err)
  }
}
