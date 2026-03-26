/**
 * Email cron handler -- called daily at 03:00 UTC from the cleanup cron job.
 *
 * Processes pending email sequences:
 * 1. Discovers new candidates (dormancy, activation) -- schedule first so they
 *    can be sent in the same run, avoiding a 24h delay until the next cron.
 * 2. Queries for all due emails (scheduled_at <= now, status = pending)
 * 3. Sends each via Resend (with AB variant subjects where applicable)
 * 4. Updates status to 'sent' with Resend message ID
 * 5. Applies sunset policy for unengaged users (with circuit breaker)
 *
 * Returns a summary for logging.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  getPendingEmails,
  markSent,
  scheduleDormancySequences,
  scheduleActivationSequences,
  applySunsetPolicy,
} from './sequences';
import { SEQUENCES } from './templates';
import { getUnsubscribeUrl } from './unsubscribe-token';
import { sendEmail } from './send';

interface CronResult {
  sent: number;
  failed: number;
  dormancyScheduled: number;
  activationScheduled: number;
  sunsetted: number;
}

export async function processEmailDrips(supabase: SupabaseClient): Promise<CronResult> {
  const result: CronResult = {
    sent: 0,
    failed: 0,
    dormancyScheduled: 0,
    activationScheduled: 0,
    sunsetted: 0,
  };

  // 1. Discover new candidates first -- scheduling before sending ensures
  //    newly discovered users get their first email in this run, not 24h later.
  result.dormancyScheduled = await scheduleDormancySequences(supabase);
  result.activationScheduled = await scheduleActivationSequences(supabase);

  // 2. Send all pending emails (including freshly scheduled ones from step 1)
  const pendingEmails = await getPendingEmails(supabase);

  if (pendingEmails.length === 0) {
    console.error('[email-drips] getPendingEmails returned 0 rows -- check FK and join config');
  } else {
    const seqCounts = pendingEmails.reduce((acc, e) => {
      acc[e.sequence_name] = (acc[e.sequence_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.error(`[email-drips] Processing ${pendingEmails.length} emails:`, JSON.stringify(seqCounts));
  }

  for (const email of pendingEmails) {
    const config = SEQUENCES[email.sequence_name];
    if (!config) {
      console.error(`[email-drips] No SEQUENCES config for: ${email.sequence_name}`);
      result.failed++;
      continue;
    }

    const unsubscribeUrl = getUnsubscribeUrl(email.user_id);
    const template = config.getTemplate(email.step, unsubscribeUrl);
    if (!template) {
      console.error(`[email-drips] No template for ${email.sequence_name} step ${email.step}`);
      result.failed++;
      continue;
    }

    const resendId = await sendEmail({
      to: email.email,
      subject: template.subject,
      html: template.html,
      unsubscribeUrl,
    });

    if (resendId) {
      await markSent(supabase, email.id, resendId);
      result.sent++;
    } else {
      result.failed++;
    }
  }

  // 3. Apply sunset policy for persistently unengaged users
  result.sunsetted = await applySunsetPolicy(supabase);

  return result;
}
