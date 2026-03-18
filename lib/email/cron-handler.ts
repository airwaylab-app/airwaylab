/**
 * Email cron handler — called from the existing cleanup cron job.
 *
 * Processes pending email sequences:
 * 1. Queries for due emails (scheduled_at <= now, status = pending)
 * 2. Sends each via Resend (with AB variant subjects where applicable)
 * 3. Updates status to 'sent' with Resend message ID
 * 4. Checks for newly dormant users and schedules dormancy sequences
 * 5. Checks for users who signed up but never uploaded (activation)
 * 6. Applies sunset policy for unengaged users
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
import { getABVariant, getVariantSubject, type ABVariant } from './ab';

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

  // 1. Send pending emails
  const pendingEmails = await getPendingEmails(supabase);

  for (const email of pendingEmails) {
    const config = SEQUENCES[email.sequence_name];
    if (!config) continue;

    const unsubscribeUrl = getUnsubscribeUrl(email.user_id);
    const template = config.getTemplate(email.step, unsubscribeUrl);
    if (!template) continue;

    // Use variant subject if this email has an AB variant and a subject override exists
    const variant = (email.ab_variant as ABVariant | null)
      ?? getABVariant(email.user_id, 'post_upload_subject');
    const variantSubject = getVariantSubject(email.sequence_name, email.step, variant);
    const subject = variantSubject ?? template.subject;

    const resendId = await sendEmail({
      to: email.email,
      subject,
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

  // 2. Check for dormant users and schedule re-engagement
  result.dormancyScheduled = await scheduleDormancySequences(supabase);

  // 3. Check for users who signed up but never uploaded
  result.activationScheduled = await scheduleActivationSequences(supabase);

  // 4. Apply sunset policy for persistently unengaged users
  result.sunsetted = await applySunsetPolicy(supabase);

  return result;
}
