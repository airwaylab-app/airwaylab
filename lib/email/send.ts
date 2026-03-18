/**
 * Email sending via Resend API.
 * Uses raw fetch (same pattern as contact/feedback routes).
 * No @react-email dependency — templates return HTML strings directly.
 */

import { serverEnv } from '@/lib/env';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Unsubscribe URL — adds List-Unsubscribe headers for Gmail/Outlook native button */
  unsubscribeUrl?: string;
}

/**
 * Send a single email via Resend API.
 * Returns the Resend message ID on success, null on failure (logged, not thrown).
 * The message ID is used to correlate webhook events (opens, clicks, delivery).
 */
export async function sendEmail({ to, subject, html, unsubscribeUrl }: SendEmailParams): Promise<string | null> {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[email-send] RESEND_API_KEY not configured');
    return null;
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
        reply_to: 'dev@airwaylab.app',
        to: [to],
        subject,
        html,
        ...(unsubscribeUrl && {
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email-send] Resend API error ${res.status}: ${body}`);
      return null;
    }

    const data = await res.json() as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error('[email-send] Failed to send email:', err);
    return null;
  }
}
