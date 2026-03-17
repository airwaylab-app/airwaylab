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
 * Returns true on success, false on failure (logged, not thrown).
 */
export async function sendEmail({ to, subject, html, unsubscribeUrl }: SendEmailParams): Promise<boolean> {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[email-send] RESEND_API_KEY not configured');
    return false;
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
      return false;
    }

    return true;
  } catch (err) {
    console.error('[email-send] Failed to send email:', err);
    return false;
  }
}
