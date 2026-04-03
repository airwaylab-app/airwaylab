import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';

const OximetryMetadataSchema = z.object({
  nightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid night date format.'),
  contributionId: z.string().min(1, 'Contribution ID is required.'),
  engineVersion: z.string().min(1, 'Engine version is required.'),
  sampleCount: z.number().int().positive('Sample count must be a positive integer.'),
  durationSeconds: z.number().positive('Duration must be positive.'),
  oximetryResultsRaw: z.string().min(1, 'Oximetry results are required.'),
  deviceModel: z.string().default('Unknown'),
  papMode: z.string().default('Unknown'),
});

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 20 });
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }

    // Consent verification (defense-in-depth — client checks consent before calling,
    // but server must verify the request explicitly confirms consent)
    if (request.headers.get('x-consent-confirmed') !== 'true') {
      console.error('[contribute-oximetry-trace] 403 missing consent confirmation');
      return NextResponse.json(
        { error: 'Data contribution requires explicit consent.' },
        { status: 403 }
      );
    }

    if (exceedsPayloadLimit(request, MAX_BODY_BYTES)) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    // Extract and validate metadata from headers
    const isCompressed = request.headers.get('content-encoding') === 'gzip';
    const rawMetadata = {
      nightDate: request.headers.get('x-night-date') || '',
      contributionId: request.headers.get('x-contribution-id') || '',
      engineVersion: request.headers.get('x-engine-version') || '',
      sampleCount: parseInt(request.headers.get('x-sample-count') || ''),
      durationSeconds: parseFloat(request.headers.get('x-duration-seconds') || ''),
      oximetryResultsRaw: request.headers.get('x-oximetry-results') || '',
      deviceModel: request.headers.get('x-device-model') || undefined,
      papMode: request.headers.get('x-pap-mode') || undefined,
    };

    const metaParsed = OximetryMetadataSchema.safeParse(rawMetadata);
    if (!metaParsed.success) {
      const firstError = metaParsed.error.issues[0]?.message || 'Missing required metadata.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      nightDate, contributionId, engineVersion,
      sampleCount, durationSeconds, oximetryResultsRaw,
      deviceModel, papMode,
    } = metaParsed.data;

    // Parse oximetry results JSON
    let oximetryResults: unknown;
    try {
      oximetryResults = JSON.parse(oximetryResultsRaw);
    } catch {
      return NextResponse.json({ error: 'Invalid oximetry results.' }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: 'Empty body.' }, { status: 400 });
    }
    if (body.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[contribute-oximetry-trace] Supabase not configured');
      Sentry.captureMessage('Supabase not configured - data lost', {
        level: 'error',
        tags: { route: 'contribute-oximetry-trace' },
      });
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const storagePath = `${contributionId}/${nightDate}.oxtrace${isCompressed ? '.gz' : '.bin'}`;
    const { error: storageError } = await supabase.storage
      .from('research-oximetry')
      .upload(storagePath, Buffer.from(body), {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      if (storageError.message?.includes('already exists') || storageError.message?.includes('Duplicate')) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error('[contribute-oximetry-trace] Storage error:', storageError.message);
      Sentry.captureException(storageError, { tags: { route: 'contribute-oximetry-trace' } });
      return NextResponse.json({ error: 'Storage error.' }, { status: 500 });
    }

    const { error: dbError } = await supabase.from('oximetry_trace_contributions').insert({
      contribution_id: contributionId,
      night_date: nightDate,
      engine_version: engineVersion,
      sample_count: sampleCount,
      duration_seconds: durationSeconds,
      compressed_size_bytes: body.byteLength,
      storage_path: storagePath,
      device_model: deviceModel,
      pap_mode: papMode,
      oximetry_results: oximetryResults,
    });

    if (dbError) {
      console.error('[contribute-oximetry-trace] DB error:', dbError.message);
      Sentry.captureException(dbError, { tags: { route: 'contribute-oximetry-trace' } });
      await supabase.storage.from('research-oximetry').remove([storagePath]);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contribute-oximetry-trace' } });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
