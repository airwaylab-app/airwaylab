import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';

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

    // Extract metadata from headers
    const nightDate = request.headers.get('x-night-date');
    const contributionId = request.headers.get('x-contribution-id');
    const engineVersion = request.headers.get('x-engine-version');
    const samplingRate = parseFloat(request.headers.get('x-sampling-rate') || '');
    const durationSeconds = parseFloat(request.headers.get('x-duration-seconds') || '');
    const sampleCount = parseInt(request.headers.get('x-sample-count') || '');
    const deviceModel = request.headers.get('x-device-model') || 'Unknown';
    const papMode = request.headers.get('x-pap-mode') || 'Unknown';
    const analysisResultsRaw = request.headers.get('x-analysis-results');
    const isCompressed = request.headers.get('content-encoding') === 'gzip';
    const channelCount = parseInt(request.headers.get('x-channel-count') || '1');
    const formatVersion = parseInt(request.headers.get('x-format-version') || '1');
    const hasPressure = request.headers.get('x-has-pressure') === 'true';

    // Validate required fields
    if (
      !nightDate ||
      !contributionId ||
      !engineVersion ||
      isNaN(samplingRate) ||
      isNaN(durationSeconds) ||
      isNaN(sampleCount) ||
      !analysisResultsRaw
    ) {
      return NextResponse.json({ error: 'Missing required metadata.' }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nightDate)) {
      return NextResponse.json({ error: 'Invalid night date format.' }, { status: 400 });
    }

    // Parse analysis results
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
