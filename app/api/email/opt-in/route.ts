import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { scheduleSequence, cancelAllPending } from '@/lib/email/sequences';
import { SEQUENCES } from '@/lib/email/templates';
import { getUnsubscribeUrl } from '@/lib/email/unsubscribe-token';
import { sendEmail } from '@/lib/email/send';
import { validateOrigin } from '@/lib/csrf';

const OptInSchema = z.object({
  opt_in: z.boolean(),
});

/**
 * POST /api/email/opt-in
 *
 * Toggles email_opt_in for the authenticated user.
 * On opt-in: schedules feature_education sequence, sends step 1 inline.
 * On opt-out: cancels all pending email sequences.
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
  const parsed = OptInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { opt_in } = parsed.data;

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_opt_in: opt_in })
      .eq('id', user.id);

    if (updateError) {
      console.error('[email/opt-in] Profile update failed:', updateError.message);
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
    }

    if (opt_in) {
      // Schedule feature_education sequence
      await scheduleSequence(supabase, user.id, 'feature_education');

      // Send step 1 inline
      const config = SEQUENCES.feature_education;
      const unsubscribeUrl = getUnsubscribeUrl(user.id);
      const template = config.getTemplate(1, unsubscribeUrl);

      if (template) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();

        if (profile?.email) {
          const sent = await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.html,
            unsubscribeUrl,
          });

          if (sent) {
            await supabase
              .from('email_sequences')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('user_id', user.id)
              .eq('sequence_name', 'feature_education')
              .eq('step', 1);
          }
        }
      }
    } else {
      // Cancel all pending sequences
      await cancelAllPending(supabase, user.id);
    }

    return NextResponse.json({ ok: true, email_opt_in: opt_in });
  } catch (err) {
    console.error('[email/opt-in] Error:', err);
    Sentry.captureException(err, { tags: { route: 'email-opt-in' } });
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
  }
}
