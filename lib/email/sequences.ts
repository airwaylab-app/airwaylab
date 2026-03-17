/**
 * Email sequence management — scheduling, cancellation, and queries.
 *
 * Used by:
 * - Analysis page (trigger post-upload sequence)
 * - Auth callback (trigger feature-education sequence)
 * - Cron job (query pending emails, send, update status)
 * - Unsubscribe route (cancel all pending)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SEQUENCES, type SequenceName } from './templates';

/**
 * Schedule a full email sequence for a user.
 * Creates one row per step with the appropriate scheduled_at time.
 * Skips if the user already has this sequence (idempotent).
 */
export async function scheduleSequence(
  supabase: SupabaseClient,
  userId: string,
  sequenceName: SequenceName
): Promise<void> {
  const config = SEQUENCES[sequenceName];
  if (!config) return;

  const now = new Date();
  const rows = config.delays.map((delayDays, index) => ({
    user_id: userId,
    sequence_name: sequenceName,
    step: index + 1,
    status: 'pending' as const,
    scheduled_at: new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000).toISOString(),
  }));

  // upsert to make this idempotent — if sequence already exists, skip
  const { error } = await supabase
    .from('email_sequences')
    .upsert(rows, { onConflict: 'user_id,sequence_name,step', ignoreDuplicates: true });

  if (error) {
    console.error(`[email-sequences] Failed to schedule ${sequenceName} for ${userId}:`, error.message);
  }
}

/**
 * Cancel all pending emails for a user (e.g. on unsubscribe).
 */
export async function cancelAllPending(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('email_sequences')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error(`[email-sequences] Failed to cancel pending for ${userId}:`, error.message);
  }
}

/**
 * Cancel a specific sequence (e.g. cancel dormancy when user uploads new data).
 */
export async function cancelSequence(
  supabase: SupabaseClient,
  userId: string,
  sequenceName: SequenceName
): Promise<void> {
  const { error } = await supabase
    .from('email_sequences')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('sequence_name', sequenceName)
    .eq('status', 'pending');

  if (error) {
    console.error(`[email-sequences] Failed to cancel ${sequenceName} for ${userId}:`, error.message);
  }
}

/**
 * Get all pending emails that are due for sending.
 * Called by the cron job.
 */
export async function getPendingEmails(
  supabase: SupabaseClient
): Promise<Array<{
  id: string;
  user_id: string;
  sequence_name: SequenceName;
  step: number;
  email: string;
}>> {
  const { data, error } = await supabase
    .from('email_sequences')
    .select(`
      id,
      user_id,
      sequence_name,
      step,
      profiles!inner(email, email_opt_in)
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50); // batch size per cron run

  if (error) {
    console.error('[email-sequences] Failed to query pending emails:', error.message);
    return [];
  }

  if (!data) return [];

  // Filter to users who are still opted in and have an email
  return data
    .filter((row) => {
      const profile = row.profiles as unknown as { email: string | null; email_opt_in: boolean };
      return profile?.email_opt_in && profile?.email;
    })
    .map((row) => {
      const profile = row.profiles as unknown as { email: string; email_opt_in: boolean };
      return {
        id: row.id,
        user_id: row.user_id,
        sequence_name: row.sequence_name as SequenceName,
        step: row.step,
        email: profile.email,
      };
    });
}

/**
 * Mark an email as sent.
 */
export async function markSent(
  supabase: SupabaseClient,
  emailId: string
): Promise<void> {
  const { error } = await supabase
    .from('email_sequences')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', emailId);

  if (error) {
    console.error(`[email-sequences] Failed to mark ${emailId} as sent:`, error.message);
  }
}

/**
 * Check for dormant users and schedule re-engagement sequences.
 * Called by the cron job. A user is dormant if:
 * - last_analysis_at is > 14 days ago
 * - email_opt_in is true
 * - they don't already have a dormancy sequence
 */
export async function scheduleDormancySequences(
  supabase: SupabaseClient
): Promise<number> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Find users who already have a dormancy sequence (to exclude them)
  const { data: existingDormancy } = await supabase
    .from('email_sequences')
    .select('user_id')
    .eq('sequence_name', 'dormancy');

  const excludeIds = existingDormancy?.map((r) => r.user_id) ?? [];

  // Find users who are dormant, opted in, and don't have a dormancy sequence
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('email_opt_in', true)
    .lt('last_analysis_at', fourteenDaysAgo);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: dormantUsers, error } = await query;

  if (error || !dormantUsers) {
    console.error('[email-sequences] Failed to find dormant users:', error?.message);
    return 0;
  }

  let scheduled = 0;
  for (const user of dormantUsers) {
    await scheduleSequence(supabase, user.id, 'dormancy');
    scheduled++;
  }

  return scheduled;
}
