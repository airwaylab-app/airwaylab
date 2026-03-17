import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token';

const BASE_URL = 'https://airwaylab.app';

/**
 * One-time product announcement email for existing users.
 * Protected by ADMIN_API_KEY. Does NOT set email_opt_in.
 *
 * Usage:
 *   curl -X POST https://airwaylab.app/api/email/announce \
 *     -H "Authorization: Bearer $ADMIN_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dry_run": true}'
 *
 * Set dry_run: false to actually send.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // default to dry run

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null);

    if (error || !users) {
      console.error('[email/announce] Query failed:', error?.message);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const recipients = users.filter((u) => u.email);

    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        recipient_count: recipients.length,
        recipients: recipients.map((u) => u.email),
      });
    }

    let sent = 0;
    let failed = 0;

    for (const user of recipients) {
      const unsubscribeUrl = getUnsubscribeUrl(user.id);
      const { subject, html } = buildAnnouncementEmail(unsubscribeUrl);

      const success = await sendEmail({
        to: user.email,
        subject,
        html,
        unsubscribeUrl,
      });

      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Small delay to stay within Resend rate limits
      if (sent % 10 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.error(`[email/announce] Sent: ${sent}, Failed: ${failed}`);
    return NextResponse.json({ sent, failed, total: recipients.length });
  } catch (err) {
    console.error('[email/announce] Error:', err);
    Sentry.captureException(err, { tags: { route: 'email-announce' } });
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}

function buildAnnouncementEmail(unsubscribeUrl: string): { subject: string; html: string } {
  const p = (text: string) =>
    `<p style="font-size:14px;color:#a1a1aa;line-height:1.7;margin:0 0 16px 0;">${text}</p>`;
  const h2 = (text: string) =>
    `<h2 style="font-size:20px;color:#ffffff;font-weight:700;margin:0 0 16px 0;">${text}</h2>`;
  const cta = (text: string, href: string) =>
    `<div style="margin:24px 0;"><a href="${href}" style="display:inline-block;padding:10px 24px;background-color:#5eead4;color:#0a0a0b;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${text}</a></div>`;
  const li = (text: string) =>
    `<li style="font-size:14px;color:#a1a1aa;line-height:1.7;margin-bottom:8px;">${text}</li>`;

  const content = `
    ${h2("What's new in AirwayLab")}
    ${p("We've been shipping. Here's what's changed since you last uploaded:")}
    <ul style="margin:0 0 16px 0;padding-left:20px;">
      ${li('<strong style="color:#fff;">AI insights upgraded to Claude Sonnet</strong> -- deeper, more specific therapy recommendations for paid users. Free users still get 3 per month via Haiku.')}
      ${li('<strong style="color:#fff;">Settings dashboard</strong> -- see your machine settings (EPAP, IPAP, PS, EPR) and how they changed over time.')}
      ${li('<strong style="color:#fff;">Night comparison</strong> -- compare any two nights side by side across all engines.')}
      ${li('<strong style="color:#fff;">Email updates</strong> -- opt in to get therapy tips and analysis reminders. You can enable this from your dashboard.')}
    </ul>
    ${p("Your previous results are still saved. Upload new data to see how your therapy has changed.")}
    ${cta('Open AirwayLab', `${BASE_URL}/analyze?utm_source=email&utm_medium=announce&utm_campaign=product_update_1`)}
    ${p("If you don't want to hear from us again, click unsubscribe below and we won't email you.")}
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>AirwayLab</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#ffffff;">
        <span style="color:#ffffff;">Airway</span><span style="color:#5eead4;font-weight:400;">Lab</span>
      </span>
    </div>
    ${content}
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e1e21;">
      <p style="font-size:11px;color:#52525b;line-height:1.6;margin:0;">
        You're receiving this one-time update because you have an account on
        <a href="${BASE_URL}" style="color:#5eead4;text-decoration:none;">airwaylab.app</a>.
        This is not a recurring email.
      </p>
      <p style="font-size:11px;color:#52525b;margin:8px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Unsubscribe</a>
        -- we won't email you again.
      </p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: "What's new in AirwayLab -- settings dashboard, night comparison, and more",
    html,
  };
}
