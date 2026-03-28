import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 1 });

const SubmitDeviceSchema = z.object({
  fileStructure: z.object({
    totalFiles: z.number(),
    extensions: z.record(z.string(), z.number()),
    folderStructure: z.array(z.string()).max(50),
    totalSizeBytes: z.number(),
  }),
  fileHeaderSamples: z.record(z.string(), z.string()).optional(),
  deviceGuess: z.string().max(200).optional(),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/).nullable()
  ),
  consent: z.literal(true, 'Consent is required to submit device data.'),
});

const MAX_PAYLOAD_BYTES = 512_000; // 512 KB

/**
 * POST /api/submit-device-data
 *
 * Accepts file structure metadata from users with unsupported PAP devices.
 * Consent-gated: only processes submissions with explicit consent.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.error('[submit-device-data] 429 rate limited', { ip });
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      console.error('[submit-device-data] 413 payload too large', {
        contentLength: request.headers.get('content-length'),
      });
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    const parsed = SubmitDeviceSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fileStructure, fileHeaderSamples, deviceGuess, email } = parsed.data;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
    }
    const { error: dbError } = await supabase
      .from('unsupported_device_submissions')
      .insert({
        file_structure: fileStructure,
        file_header_samples: fileHeaderSamples ?? null,
        device_guess: deviceGuess ?? null,
        email: email ?? null,
        user_agent: userAgent,
      });

    if (dbError) {
      Sentry.captureException(dbError, {
        tags: { route: 'submit-device-data' },
      });
      return NextResponse.json(
        { error: 'Failed to store submission. Please try again.' },
        { status: 500 }
      );
    }

    Sentry.captureMessage('Unsupported device data submitted', {
      level: 'info',
      tags: {
        route: 'submit-device-data',
        device_guess: deviceGuess ?? 'unknown',
        total_files: String(fileStructure.totalFiles),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'submit-device-data' },
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
