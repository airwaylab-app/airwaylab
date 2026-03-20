/**
 * Email sequence management — scheduling, cancellation, and queries.
 *
 * Used by:
 * - Analysis page (trigger post-upload + feature-education sequence)
 * - Auth callback (opt-in toggle)
 * - Cron job (query pending emails, send, schedule dormancy/activation, sunset)
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
  sequenceName: SequenceName,
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
  ab_variant: string | null;
}>> {
  const { data, error } = await supabase
    .from('email_sequences')
    .select(`
      id,
      user_id,
      sequence_name,
      step,
      ab_variant,
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
        ab_variant: (row as Record<string, unknown>).ab_variant as string | null,
      };
    });
}

/**
 * Mark an email as sent and store the Resend message ID for webhook correlation.
 */
export async function markSent(
  supabase: SupabaseClient,
  emailId: string,
  resendId?: string
): Promise<void> {
  const { error } = await supabase
    .from('email_sequences')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      ...(resendId && { resend_id: resendId }),
    })
    .eq('id', emailId);

  if (error) {
    console.error(`[email-sequences] Failed to mark ${emailId} as sent:`, error.message);
  }
}

/**
 * Check for dormant users and schedule re-engagement sequences.
 * Called by the cron job. Triggers after 7 days of inactivity.
 */
export async function scheduleDormancySequences(
  supabase: SupabaseClient
): Promise<number> {
  const DORMANCY_DAYS = 7;
  const cutoff = new Date(Date.now() - DORMANCY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find users who already have a dormancy sequence (to exclude them)
  const { data: existingDormancy } = await supabase
    .from('email_sequences')
    .select('user_id')
    .eq('sequence_name', 'dormancy');

  const excludeIds = existingDormancy?.map((r) => r.user_id) ?? [];

  // Find users who are dormant (no upload in 7 days), opted in, no existing dormancy sequence
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('email_opt_in', true)
    .lt('last_analysis_at', cutoff);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates) {
    console.error('[email-sequences] Failed to find dormant users:', error?.message);
    return 0;
  }

  let scheduled = 0;
  for (const user of candidates) {
    await scheduleSequence(supabase, user.id, 'dormancy');
    scheduled++;
  }

  return scheduled;
}

/**
 * Check for users who signed up but never uploaded, and schedule activation emails.
 * Called by the cron job.
 *
 * Triggers 48h after account creation if last_analysis_at is null.
 */
export async function scheduleActivationSequences(
  supabase: SupabaseClient
): Promise<number> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  // Find users who already have an activation sequence
  const { data: existingActivation } = await supabase
    .from('email_sequences')
    .select('user_id')
    .eq('sequence_name', 'activation');

  const excludeIds = existingActivation?.map((r) => r.user_id) ?? [];

  // Find users created 48h+ ago, opted in, never uploaded, no activation sequence
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('email_opt_in', true)
    .is('last_analysis_at', null)
    .lt('created_at', twoDaysAgo);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: inactiveUsers, error } = await query;

  if (error || !inactiveUsers) {
    console.error('[email-sequences] Failed to find inactive users:', error?.message);
    return 0;
  }

  let scheduled = 0;
  for (const user of inactiveUsers) {
    await scheduleSequence(supabase, user.id, 'activation');
    scheduled++;
  }

  return scheduled;
}

/**
 * Sunset policy: opt out users who haven't engaged with 3+ consecutive emails.
 * Called by the cron job. Requires webhook tracking data (opened_at, clicked_at).
 *
 * A user is sunsetted if they have >= 3 sent emails where:
 * - delivered_at is not null (email arrived)
 * - opened_at is null AND clicked_at is null (no engagement)
 *
 * Sunsetted users get email_opt_in = false and all pending emails cancelled.
 */
export async function applySunsetPolicy(
  supabase: SupabaseClient
): Promise<number> {
  // Circuit breaker: if zero opens are tracked system-wide, open tracking
  // is likely broken. Skip sunset to avoid mass-unsubscribing engaged users.
  const { count: totalOpens } = await supabase
    .from('email_sequences')
    .select('*', { count: 'exact', head: true })
    .not('opened_at', 'is', null);

  if (!totalOpens || totalOpens === 0) {
    console.error('[email-sequences] Sunset skipped: zero opens tracked system-wide (open tracking may be misconfigured)');
    return 0;
  }

  // Find users with 3+ delivered-but-unengaged emails
  const { data: candidates, error } = await supabase
    .from('email_sequences')
    .select('user_id')
    .eq('status', 'sent')
    .not('delivered_at', 'is', null)
    .is('opened_at', null)
    .is('clicked_at', null);

  if (error || !candidates) {
    console.error('[email-sequences] Sunset policy query failed:', error?.message);
    return 0;
  }

  // Count unengaged emails per user
  const countByUser = new Map<string, number>();
  for (const row of candidates) {
    countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
  }

  let sunsetted = 0;
  for (const [userId, count] of countByUser) {
    if (count >= 3) {
      // Opt out and cancel pending
      await supabase
        .from('profiles')
        .update({ email_opt_in: false })
        .eq('id', userId);

      await cancelAllPending(supabase, userId);
      sunsetted++;
    }
  }

  if (sunsetted > 0) {
    console.error(`[email-sequences] Sunset policy: opted out ${sunsetted} users with ${sunsetted} unengaged emails`);
  }

  return sunsetted;
}
