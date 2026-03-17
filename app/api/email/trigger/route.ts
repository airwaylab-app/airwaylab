import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { scheduleSequence, cancelSequence } from '@/lib/email/sequences';
import { SEQUENCES } from '@/lib/email/templates';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token';
import { sendEmail } from '@/lib/email/send';
import { validateOrigin } from '@/lib/csrf';

const TriggerSchema = z.object({
  sequence: z.enum(['post_upload', 'feature_education']),
});

/**
 * POST /api/email/trigger
 *
 * Schedules an email drip sequence for the authenticated user.
 * Step 1 is sent inline (immediately). Steps 2+ are scheduled in DB
 * for the hourly cron to pick up.
 *
 * Also updates last_analysis_at for post_upload triggers and
 * cancels any dormancy sequence (user is active).
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

  const { sequence } = parsed.data;

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

    // For post_upload: update last_analysis_at and cancel dormancy
    if (sequence === 'post_upload') {
      await supabase
        .from('profiles')
        .update({ last_analysis_at: new Date().toISOString() })
        .eq('id', user.id);

      await cancelSequence(supabase, user.id, 'dormancy');
    }

    // Schedule the full sequence (idempotent)
    await scheduleSequence(supabase, user.id, sequence);

    // Send step 1 inline (immediately)
    const config = SEQUENCES[sequence];
    const unsubscribeUrl = getUnsubscribeUrl(user.id);
    const template = config.getTemplate(1, unsubscribeUrl);

    if (template) {
      const sent = await sendEmail({
        to: profile.email,
        subject: template.subject,
        html: template.html,
        unsubscribeUrl,
      });

      if (sent) {
        // Mark step 1 as sent so cron doesn't re-send
        await supabase
          .from('email_sequences')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('sequence_name', sequence)
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
