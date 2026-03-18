import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { scheduleSequence, cancelSequence } from '@/lib/email/sequences';
import { SEQUENCES } from '@/lib/email/templates';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token';
import { sendEmail } from '@/lib/email/send';
import { validateOrigin } from '@/lib/csrf';
import { getABVariant, getVariantSubject } from '@/lib/email/ab';

const TriggerSchema = z.object({
  sequence: z.enum(['post_upload']),
});

/**
 * POST /api/email/trigger
 *
 * Schedules email drip sequences for the authenticated user on first upload.
 * - post_upload: sent immediately (step 1 inline, steps 2-3 via cron)
 * - feature_education: scheduled to start 10 days after upload (after post_upload finishes)
 * - cancels dormancy + activation sequences (user is now active)
 *
 * Also updates last_analysis_at.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const supabaseAuth = await getSupabaseServer();
  if (!supabaseAuth) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = TriggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    // Check if user has opted in to emails
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, email_opt_in')
      .eq('id', user.id)
      .single();

    if (!profile?.email_opt_in || !profile?.email) {
      return NextResponse.json({ ok: true, skipped: 'not_opted_in' });
    }

    // Update last_analysis_at and cancel dormancy + activation (user is active)
    await supabase
      .from('profiles')
      .update({ last_analysis_at: new Date().toISOString() })
      .eq('id', user.id);

    await cancelSequence(supabase, user.id, 'dormancy');
    await cancelSequence(supabase, user.id, 'activation');

    // Compute AB variant for subject line test
    const variant = getABVariant(user.id, 'post_upload_subject');

    // Schedule post_upload sequence (idempotent)
    await scheduleSequence(supabase, user.id, 'post_upload', variant);

    // Schedule feature_education to start after post_upload finishes (day 10)
    await scheduleSequence(supabase, user.id, 'feature_education', variant);

    // Send post_upload step 1 inline (immediately)
    const config = SEQUENCES.post_upload;
    const unsubscribeUrl = getUnsubscribeUrl(user.id);
    const template = config.getTemplate(1, unsubscribeUrl);

    if (template) {
      // Use variant subject if available
      const variantSubject = getVariantSubject('post_upload', 1, variant);
      const subject = variantSubject ?? template.subject;

      const resendId = await sendEmail({
        to: profile.email,
        subject,
        html: template.html,
        unsubscribeUrl,
      });

      if (resendId) {
        // Mark step 1 as sent so cron doesn't re-send
        await supabase
          .from('email_sequences')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_id: resendId,
          })
          .eq('user_id', user.id)
          .eq('sequence_name', 'post_upload')
          .eq('step', 1);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/trigger] Error:', err);
    Sentry.captureException(err, { tags: { route: 'email-trigger' } });
    return NextResponse.json({ error: 'Failed to schedule emails' }, { status: 500 });
  }
}
