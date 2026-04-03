import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';

const WaveformMetadataSchema = z.object({
  nightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid night date format.'),
  contributionId: z.string().min(1, 'Contribution ID is required.'),
  engineVersion: z.string().min(1, 'Engine version is required.'),
  samplingRate: z.number().positive('Sampling rate must be positive.'),
  durationSeconds: z.number().positive('Duration must be positive.'),
  sampleCount: z.number().int().positive('Sample count must be a positive integer.'),
  analysisResultsRaw: z.string().min(1, 'Analysis results are required.'),
  deviceModel: z.string().default('Unknown'),
  papMode: z.string().default('Unknown'),
  channelCount: z.number().int().positive().default(1),
  formatVersion: z.number().int().positive().default(1),
  hasPressure: z.boolean().default(false),
});

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 20 });
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

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
      console.error('[contribute-waveforms] 403 missing consent confirmation');
      return NextResponse.json(
        { error: 'Data contribution requires explicit consent.' },
        { status: 403 }
      );
    }

    // Size guard
    if (exceedsPayloadLimit(request, MAX_BODY_BYTES)) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    // Extract and validate metadata from headers
    const isCompressed = request.headers.get('content-encoding') === 'gzip';
    const rawMetadata = {
      nightDate: request.headers.get('x-night-date') || '',
      contributionId: request.headers.get('x-contribution-id') || '',
      engineVersion: request.headers.get('x-engine-version') || '',
      samplingRate: parseFloat(request.headers.get('x-sampling-rate') || ''),
      durationSeconds: parseFloat(request.headers.get('x-duration-seconds') || ''),
      sampleCount: parseInt(request.headers.get('x-sample-count') || ''),
      analysisResultsRaw: request.headers.get('x-analysis-results') || '',
      deviceModel: request.headers.get('x-device-model') || undefined,
      papMode: request.headers.get('x-pap-mode') || undefined,
      channelCount: parseInt(request.headers.get('x-channel-count') || '1'),
      formatVersion: parseInt(request.headers.get('x-format-version') || '1'),
      hasPressure: request.headers.get('x-has-pressure') === 'true',
    };

    const metaParsed = WaveformMetadataSchema.safeParse(rawMetadata);
    if (!metaParsed.success) {
      const firstError = metaParsed.error.issues[0]?.message || 'Missing required metadata.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      nightDate, contributionId, engineVersion,
      samplingRate, durationSeconds, sampleCount,
      analysisResultsRaw, deviceModel, papMode,
      channelCount, formatVersion, hasPressure,
    } = metaParsed.data;

    // Parse analysis results JSON
    let analysisResults: unknown;
    try {
      analysisResults = JSON.parse(analysisResultsRaw);
    } catch {
      return NextResponse.json({ error: 'Invalid analysis results.' }, { status: 400 });
    }

    // Read binary body
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: 'Empty body.' }, { status: 400 });
    }
    if (body.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('[contribute-waveforms] Supabase not configured');
      Sentry.captureMessage('Supabase not configured - data lost', {
        level: 'error',
        tags: { route: 'contribute-waveforms' },
      });
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // Upload to Supabase Storage
    const storagePath = `${contributionId}/${nightDate}.flow${isCompressed ? '.gz' : '.bin'}`;
    const { error: storageError } = await supabase.storage
      .from('research-waveforms')
      .upload(storagePath, Buffer.from(body), {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      // Duplicate upload — treat as success (idempotent)
      if (storageError.message?.includes('already exists') || storageError.message?.includes('Duplicate')) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      console.error('[contribute-waveforms] Storage error:', storageError.message);
      Sentry.captureException(storageError, { tags: { route: 'contribute-waveforms' } });
      return NextResponse.json({ error: 'Storage error.' }, { status: 500 });
    }

    // Insert metadata row
    const { error: dbError } = await supabase.from('waveform_contributions').insert({
      contribution_id: contributionId,
      night_date: nightDate,
      engine_version: engineVersion,
      sampling_rate: samplingRate,
      duration_seconds: durationSeconds,
      sample_count: sampleCount,
      compressed_size_bytes: body.byteLength,
      storage_path: storagePath,
      device_model: deviceModel,
      pap_mode: papMode,
      analysis_results: analysisResults,
      channel_count: channelCount,
      format_version: formatVersion,
      has_pressure: hasPressure,
    });

    if (dbError) {
      console.error('[contribute-waveforms] DB error:', dbError.message);
      Sentry.captureException(dbError, { tags: { route: 'contribute-waveforms' } });
      // Clean up orphaned storage file
      await supabase.storage.from('research-waveforms').remove([storagePath]);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contribute-waveforms' } });
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
