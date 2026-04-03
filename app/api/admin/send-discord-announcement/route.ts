/**
 * One-time admin endpoint to send Discord community launch email
 * to all active paid subscribers (Supporter + Champion).
 *
 * Protected by X-Admin-Secret header (ADMIN_API_KEY env var).
 * Idempotent: checks email_log for existing discord_launch emails.
 * Sends in batches of 10 with 1s delay to respect Resend rate limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { discordLaunchEmail } from '@/lib/email/transactional';

// This endpoint is triggered by admin secret header only.
// No request body is accepted; unexpected fields are rejected.
const BodySchema = z.object({}).strict();

const ADMIN_SECRET = process.env.ADMIN_API_KEY;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  if (rawBody !== null) {
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'This endpoint does not accept a request body.' }, { status: 400 });
    }
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { data: paidUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, tier')
      .in('tier', ['supporter', 'champion'])
      .not('email', 'is', null);

    if (fetchError) {
      console.error('[discord-announce] Failed to fetch paid users:', fetchError);
      Sentry.captureException(fetchError, { tags: { route: 'admin-discord-announcement', action: 'fetch-users' } });
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!paidUsers || paidUsers.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: 'No paid users found' });
    }

    // Idempotency: skip users who already received this email
    const { data: alreadySent } = await supabase
      .from('email_log')
      .select('to_email')
      .eq('email_type', 'discord_launch');

    const alreadySentEmails = new Set(
      (alreadySent ?? []).map(r => r.to_email)
    );

    const toSend = paidUsers.filter(u => !alreadySentEmails.has(u.email));
    const skipped = paidUsers.length - toSend.length;

    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
      const batch = toSend.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          try {
            const tier = user.tier as 'supporter' | 'champion';
            const { subject, html } = discordLaunchEmail(tier);
            await sendEmail({
              to: user.email,
              subject,
              html,
              metadata: {
                emailType: 'discord_launch',
                userId: user.id,
              },
            });
            sent++;
          } catch (err) {
            const msg = `Failed to send to ${user.email}: ${err}`;
            console.error(`[discord-announce] ${msg}`);
            errors.push(msg);
          }
        })
      );

      if (i + BATCH_SIZE < toSend.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    if (errors.length > 0) {
      Sentry.captureMessage('Discord announcement: some emails failed', {
        level: 'warning',
        extra: { errors, sent, skipped },
      });
    }

    return NextResponse.json({
      sent,
      skipped,
      errors: errors.length,
      total_paid_users: paidUsers.length,
    });
  } catch (err) {
    console.error('[discord-announce] Unexpected error:', err);
    Sentry.captureException(err, { tags: { action: 'discord-announcement' } });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
