/**
 * Email sending via Resend API with automatic logging to email_log.
 *
 * All emails in the app should go through this function so that
 * delivery is tracked via the Resend webhook -> email_log pipeline.
 */

import { serverEnv } from '@/lib/env'
import { getSupabaseServiceRole } from '@/lib/supabase/server'

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
        subject,
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
      console.error('[email-send] email_log insert failed:', error.message)
    }
  } catch (err) {
    console.error('[email-send] email_log insert error:', err)
  }
}
