import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 3 });

const MAX_PAYLOAD_BYTES = 256_000; // 256 KB

async function sendNotificationEmail(fields: {
  fileNames: string[];
  errorMessage: string;
  email: string | null;
}) {
  const apiKey = serverEnv.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AirwayLab <noreply@airwaylab.app>',
        to: ['dev@airwaylab.app'],
        subject: `Unsupported format: ${fields.fileNames.slice(0, 3).join(', ')}`,
        text: [
          'New unsupported data format submission on airwaylab.app',
          '',
          `Files (${fields.fileNames.length}): ${fields.fileNames.slice(0, 10).join(', ')}`,
          `Error: ${fields.errorMessage.slice(0, 500)}`,
          `Email: ${fields.email ?? '—'}`,
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[submit-error-data] Resend error:', res.status, body);
    }
  } catch (err) {
    console.error('[submit-error-data] Notification email failed:', err);
  }
}

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
    if (limiter.isLimited(ip)) {
      console.warn(`[submit-error-data] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.warn(`[submit-error-data] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await request.json();
    const { fileNames, errorMessage, email, userAgent } = body as {
      fileNames: string[];
      errorMessage: string;
      email?: string;
      userAgent?: string;
    };

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      console.warn('[submit-error-data] 400 no file names provided');
      return NextResponse.json({ error: 'No file names provided.' }, { status: 400 });
    }

    if (typeof errorMessage !== 'string' || errorMessage.length < 3) {
      console.warn('[submit-error-data] 400 missing error message');
      return NextResponse.json({ error: 'Error message required.' }, { status: 400 });
    }

    // Validate email if provided
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
      }
    }

    // Sanitize file names — only keep name and extension, limit count
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
        sendNotificationEmail({
          fileNames: sanitizedFiles,
          errorMessage: errorMessage.slice(0, 2000),
          email: email?.trim() || null,
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
