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

  const h3 = (text: string) =>
    `<h3 style="font-size:16px;color:#ffffff;font-weight:700;margin:24px 0 12px 0;">${text}</h3>`;
  const box = (content: string, borderColor: string, bgColor: string) =>
    `<div style="margin:24px 0;padding:16px;border-radius:8px;border:1px solid ${borderColor};background-color:${bgColor};">${content}</div>`;

  const content = `
    ${h2("AirwayLab beta update")}
    ${p("You signed up for updates from AirwayLab. Thank you for being one of the first. We're still in beta, still building, and your feedback is shaping what this becomes.")}
    ${p("Here's what's new, what went wrong, and what we need from you.")}

    ${h3("What we shipped")}
    <ul style="margin:0 0 16px 0;padding-left:20px;">
      ${li('<strong style="color:#fff;">AI insights upgraded to Claude Sonnet.</strong> Deeper, more specific therapy recommendations for Supporters and Champions. Free users still get 3 analyses per month via Haiku.')}
      ${li('<strong style="color:#fff;">Settings dashboard.</strong> See your machine settings (EPAP, IPAP, PS, EPR) and how they changed over time.')}
      ${li('<strong style="color:#fff;">Night comparison.</strong> Compare any two nights side by side across all four engines.')}
      ${li('<strong style="color:#fff;">Cloud sync (free for everyone).</strong> Your SD card files are now stored securely in the EU so you can access your data from any device. You can delete all stored data at any time from your account settings.')}
      ${li('<strong style="color:#fff;">Email updates.</strong> We now send occasional therapy tips and analysis reminders. You\'re opted in by default since you signed up for updates.')}
    </ul>

    ${box(`
      <p style="font-size:14px;color:#a1a1aa;line-height:1.7;margin:0 0 8px 0;">
        <strong style="color:#f59e0b;">We need you to re-upload your SD card.</strong>
      </p>
      <p style="font-size:13px;color:#a1a1aa;line-height:1.7;margin:0;">
        We had a storage bug that affected contributed research data. If you haven't uploaded in the last 3 days and you want your data included in the research dataset, please upload your full SD card again. Your personal analysis results aren't affected. This only impacts the anonymised data used to improve analysis quality for everyone.
      </p>
    `, '#92400e', '#451a0380')}

    ${cta('Re-upload Your SD Card', `${BASE_URL}/analyze?utm_source=email&utm_medium=announce&utm_campaign=reupload`)}

    ${h3("Thank you to our Supporters and Champions")}
    ${p("A genuine thank you to everyone who's upgraded to a paid plan. AirwayLab is a side project with a tiny maintenance budget, and your support directly funds better AI analysis, more features, and keeping the core tool free for everyone.")}
    ${p('Supporters ($9/mo) get unlimited AI insights and cloud sync. Champions ($25/mo) get deeper per-breath analysis, priority support, and early access to new features. <a href="' + BASE_URL + '/pricing?utm_source=email&utm_medium=announce&utm_campaign=premium" style="color:#5eead4;text-decoration:underline;">See plans</a>.')}

    ${box(`
      <p style="font-size:15px;color:#ffffff;font-weight:700;line-height:1.5;margin:0 0 8px 0;">
        What should we build next?
      </p>
      <p style="font-size:13px;color:#a1a1aa;line-height:1.7;margin:0;">
        You're using AirwayLab because you care about understanding your therapy. We want to build what actually helps you. What's missing? What's confusing? What would make you upload every week?
      </p>
      <p style="font-size:13px;color:#a1a1aa;line-height:1.7;margin:8px 0 0 0;">
        Hit reply or email me directly at <a href="mailto:dev@airwaylab.app" style="color:#5eead4;text-decoration:underline;">dev@airwaylab.app</a>. I read everything personally.
      </p>
    `, '#5eead4', '#5eead410')}

    <div style="margin:24px 0;padding:16px;border-radius:8px;border:1px solid #27272a;background-color:#18181b;">
      <p style="font-size:13px;color:#a1a1aa;line-height:1.6;margin:0;">
        <strong style="color:#fff;">Don't want these emails?</strong> No problem.
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Click here to unsubscribe</a>
        and you won't hear from us again. You can also toggle email updates from
        <a href="${BASE_URL}/settings" style="color:#5eead4;text-decoration:none;">account settings</a> at any time.
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
    subject: 'AirwayLab beta update: new features, a bug fix, and a question for you',
    html,
  };
}
