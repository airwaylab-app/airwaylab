import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';

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

    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
    }

    const nightDate = request.headers.get('x-night-date');
    const contributionId = request.headers.get('x-contribution-id');
    const engineVersion = request.headers.get('x-engine-version');
    const sampleCount = parseInt(request.headers.get('x-sample-count') || '');
    const durationSeconds = parseFloat(request.headers.get('x-duration-seconds') || '');
    const deviceModel = request.headers.get('x-device-model') || 'Unknown';
    const papMode = request.headers.get('x-pap-mode') || 'Unknown';
    const oximetryResultsRaw = request.headers.get('x-oximetry-results');
    const isCompressed = request.headers.get('content-encoding') === 'gzip';

    if (
      !nightDate ||
      !contributionId ||
      !engineVersion ||
      isNaN(sampleCount) ||
      isNaN(durationSeconds) ||
      !oximetryResultsRaw
    ) {
      return NextResponse.json({ error: 'Missing required metadata.' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nightDate)) {
      return NextResponse.json({ error: 'Invalid night date format.' }, { status: 400 });
    }

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
