import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { cancelAllPending } from '@/lib/email/sequences';

const UnsubscribeQuerySchema = z.object({
  token: z.string().min(1, 'Unsubscribe token is required.'),
});

/**
 * GET /api/email/unsubscribe?token=...
 *
 * One-click unsubscribe from email footer links.
 * Verifies HMAC token, sets email_opt_in = false, cancels all pending emails.
 * Redirects to a confirmation page.
 */
export async function GET(request: NextRequest) {
  const queryParsed = UnsubscribeQuerySchema.safeParse({
    token: request.nextUrl.searchParams.get('token') ?? '',
  });

  if (!queryParsed.success) {
    return NextResponse.redirect(new URL('/contact?unsubscribe=invalid', request.url));
  }

  const { token } = queryParsed.data;
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL('/contact?unsubscribe=invalid', request.url));
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[unsubscribe] Supabase admin not available');
      return NextResponse.redirect(new URL('/contact?unsubscribe=error', request.url));
    }

    // Set email_opt_in to false
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email_opt_in: false })
      .eq('id', userId);

    if (profileError) {
      console.error('[unsubscribe] Failed to update profile:', profileError.message);
      Sentry.captureException(profileError, { tags: { route: 'email-unsubscribe', step: 'profile-update' } });
    }

    // Cancel all pending email sequences
    await cancelAllPending(supabase, userId);

    return NextResponse.redirect(new URL('/contact?unsubscribe=success', request.url));
  } catch (err) {
    console.error('[unsubscribe] Unexpected error:', err);
    Sentry.captureException(err, { tags: { route: 'email-unsubscribe' } });
    return NextResponse.redirect(new URL('/contact?unsubscribe=error', request.url));
  }
}
