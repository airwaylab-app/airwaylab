import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token';

const BASE_URL = 'https://airwaylab.app';

/**
 * One-time product announcement email for existing users.
 * Protected by ADMIN_API_KEY.
 *
 * Backfills email_opt_in = true for all users (consent was given
 * via the signup form but never stored due to a missing endpoint).
 * The email includes a prominent unsubscribe link for anyone who
 * changed their mind.
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

    // Backfill: set email_opt_in = true for all users.
    // These users consented via the signup form — the /api/subscribe
    // endpoint was never built, so consent was lost. This restores it.
    const { error: backfillError } = await supabase
      .from('profiles')
      .update({ email_opt_in: true })
      .eq('email_opt_in', false);

    if (backfillError) {
      console.error('[email/announce] Backfill failed:', backfillError.message);
      // Continue anyway — sending is more important than the flag
    } else {
      console.error(`[email/announce] Backfilled email_opt_in = true for all users`);
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
    ${p("You signed up for updates from AirwayLab. We've shipped a lot since then -- here's a quick overview:")}
    <ul style="margin:0 0 16px 0;padding-left:20px;">
      ${li('<strong style="color:#fff;">AI insights upgraded to Claude Sonnet</strong> -- deeper, more specific therapy recommendations for paid users. Free users still get 3 per month via Haiku.')}
      ${li('<strong style="color:#fff;">Settings dashboard</strong> -- see your machine settings (EPAP, IPAP, PS, EPR) and how they changed over time.')}
      ${li('<strong style="color:#fff;">Night comparison</strong> -- compare any two nights side by side across all engines.')}
      ${li('<strong style="color:#fff;">Therapy tips by email</strong> -- we now send occasional emails with tips on reading your data and getting the most out of your therapy. You\'re opted in by default.')}
    </ul>
    ${p("Your previous results are still saved. Upload new data to see how your therapy has changed.")}
    ${cta('Open AirwayLab', `${BASE_URL}/analyze?utm_source=email&utm_medium=announce&utm_campaign=product_update_1`)}
    <div style="margin:24px 0;padding:16px;border-radius:8px;border:1px solid #27272a;background-color:#18181b;">
      <p style="font-size:13px;color:#a1a1aa;line-height:1.6;margin:0;">
        <strong style="color:#fff;">Don't want these emails?</strong> No problem.
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Click here to unsubscribe</a>
        and you won't hear from us again. You can also toggle email updates off from your
        <a href="${BASE_URL}/analyze" style="color:#5eead4;text-decoration:none;">dashboard</a> at any time.
      </p>
    </div>
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
        You're receiving this because you signed up on
        <a href="${BASE_URL}" style="color:#5eead4;text-decoration:none;">airwaylab.app</a>.
      </p>
      <p style="font-size:11px;color:#52525b;margin:8px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Unsubscribe</a>
        from all AirwayLab emails.
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
