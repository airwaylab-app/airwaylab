import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';
import { sendEmail } from '@/lib/email/send';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 3 });

const SubmitErrorSchema = z.object({
  fileNames: z.array(z.string()).min(1, 'No file names provided.').max(50),
  errorMessage: z.string().min(3, 'Error message required.').max(2000),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/).nullable()
  ),
  userAgent: z.string().max(500).optional(),
  // Consent awareness: device error data is less sensitive than health metrics,
  // so consent is optional but logged when present for audit trail
  consentAcknowledged: z.boolean().optional(),
});

const MAX_PAYLOAD_BYTES = 256_000; // 256 KB

/**
 * POST /api/submit-error-data
 *
 * Accepts error reports when users try to upload unsupported data formats.
 * Stores file names, sizes, error message, and optional user email
 * so we can add support for new devices.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.error('[submit-error-data] 429 rate limited', { ip });
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

        if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      const contentLength = request.headers.get('content-length');
      console.error('[submit-error-data] 413 payload too large', { contentLength });
      Sentry.captureMessage('Payload too large', {
        level: 'warning',
        extra: { route: 'submit-error-data', contentLength },
      });
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    const parsed = SubmitErrorSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fileNames, errorMessage, email, userAgent, consentAcknowledged } = parsed.data;

    // Log consent status for audit trail (device error data is less sensitive,
    // so we accept submissions without consent but track it)
    if (!consentAcknowledged) {
      console.error('[submit-error-data] Submission without explicit consent acknowledgement', { ip });
    }

    // Sanitize file names -- only keep name and extension, limit count
    const sanitizedFiles = fileNames
      .slice(0, 50)
      .map((f) => {
        const name = String(f).replace(/[^\w.\-/]/g, '_');
        return name.slice(0, 200);
      });

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('error_submissions').insert({
        file_names: sanitizedFiles,
        error_message: errorMessage.slice(0, 2000),
        email: email?.trim().slice(0, 200) || null,
        user_agent: userAgent?.slice(0, 500) || null,
      });

      if (error) {
        console.error('[submit-error-data] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'submit-error-data' } });
      } else {
        // Fire-and-forget notification email
        void sendEmail({
          to: 'dev@airwaylab.app',
          subject: `Unsupported format: ${sanitizedFiles.slice(0, 3).join(', ')}`,
          text: [
            'New unsupported data format submission on airwaylab.app',
            '',
            `Files (${sanitizedFiles.length}): ${sanitizedFiles.slice(0, 10).join(', ')}`,
            `Error: ${errorMessage.slice(0, 500)}`,
            `Email: ${email?.trim() ?? '\u2014'}`,
          ].join('\n'),
          metadata: { emailType: 'admin_error_data' },
        });
      }
    }

    // Alert so unsupported format submissions are visible in Sentry
    Sentry.captureMessage('Unsupported data submission', {
      level: 'warning',
      tags: { route: 'submit-error-data', error_type: 'unsupported_data' },
      extra: {
        fileNames: sanitizedFiles.slice(0, 10),
        errorMessage: errorMessage.slice(0, 500),
        userAgent: userAgent?.slice(0, 200) || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'submit-error-data' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
