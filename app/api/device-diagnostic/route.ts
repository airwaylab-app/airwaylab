import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const BodySchema = z.object({
  deviceModel: z.string().max(200),
  signalLabels: z.array(z.string().max(100)).max(200),
  identificationText: z.string().max(2000).nullable(),
  hasStrFile: z.boolean(),
});

/**
 * POST /api/device-diagnostic
 *
 * Saves unknown device info when settings extraction fails.
 * No auth required — this fires automatically on upload for unsupported devices.
 * Rate limited to prevent abuse. No PII is collected.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const ip = getRateLimitKey(request);
  if (await limiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const raw = await request.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { deviceModel, signalLabels, identificationText, hasStrFile } = parsed.data;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      Sentry.captureMessage('Supabase not configured - data lost', {
        level: 'error',
        tags: { route: 'device-diagnostic' },
      });
    }
    if (supabase) {
      const { error } = await supabase.from('device_diagnostics').insert({
        device_model: deviceModel,
        signal_labels: signalLabels,
        identification_text: identificationText,
        has_str_file: hasStrFile,
      });

      if (error) {
        console.error('[device-diagnostic] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'device-diagnostic' } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'device-diagnostic' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
