/**
 * Email cron handler — called from the existing cleanup cron job.
 *
 * Processes pending email sequences:
 * 1. Queries for due emails (scheduled_at <= now, status = pending)
 * 2. Sends each via Resend
 * 3. Updates status to 'sent'
 * 4. Checks for newly dormant users and schedules dormancy sequences
 *
 * Returns a summary for logging.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getPendingEmails, markSent, scheduleDormancySequences } from './sequences';
import { SEQUENCES } from './templates';
import { getUnsubscribeUrl } from './unsubscribe-token';
import { sendEmail } from './send';

interface CronResult {
  sent: number;
  failed: number;
  dormancyScheduled: number;
}

export async function processEmailDrips(supabase: SupabaseClient): Promise<CronResult> {
  const result: CronResult = { sent: 0, failed: 0, dormancyScheduled: 0 };

  // 1. Send pending emails
  const pendingEmails = await getPendingEmails(supabase);

  for (const email of pendingEmails) {
    const config = SEQUENCES[email.sequence_name];
    if (!config) continue;

    const unsubscribeUrl = getUnsubscribeUrl(email.user_id);
    const template = config.getTemplate(email.step, unsubscribeUrl);
    if (!template) continue;

    const success = await sendEmail({
      to: email.email,
      subject: template.subject,
      html: template.html,
      unsubscribeUrl,
    });

    if (success) {
      await markSent(supabase, email.id);
      result.sent++;
    } else {
      result.failed++;
    }
  }

  // 2. Check for dormant users and schedule re-engagement
  result.dormancyScheduled = await scheduleDormancySequences(supabase);

  return result;
}
