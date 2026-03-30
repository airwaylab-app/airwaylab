import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';

/** Rate limit: 100 requests per hour per IP (relaxed for authenticated users) */
const symptomRateLimiter = new RateLimiter({
  windowMs: 3_600_000,
  max: 100,
});

const PayloadSchema = z.object({
  consent: z.literal(true, { error: 'Consent is required to contribute symptom data.' }),
  symptom_rating: z.number().int().min(1).max(5),
  ifl_risk: z.number().min(0).max(100),
  glasgow_overall: z.number().min(0).max(8),
  fl_score: z.number().min(0).max(100),
  ned_mean: z.number().min(0).max(100),
  regularity: z.number().min(0).max(100),
  eai: z.number().min(0),
  rera_index: z.number().min(0),
  combined_fl_pct: z.number().min(0).max(100),
  pressure_bucket: z.enum(['<6', '6-8', '8-10', '10-12', '12-14', '14+']),
  pap_mode: z.string().max(50),
  device_model: z.string().max(100),
  duration_hours: z.number().min(0).max(24),
  // Night date for user-based dedup (YYYY-MM-DD)
  night_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Engine version for ML dataset versioning
  engine_version: z.string().max(50).optional(),
  // Enhanced fields (optional for backward compat)
  hypopnea_index: z.number().min(0).optional(),
  amplitude_cv: z.number().min(0).optional(),
  unstable_epoch_pct: z.number().int().min(0).max(100).optional(),
  tidal_volume_cv: z.number().min(0).optional(),
  trigger_delay_median_ms: z.number().int().min(0).optional(),
  ie_ratio: z.number().min(0).optional(),
});

/**
 * Compute a SHA-256 hex digest of a string.
 * Uses the Web Crypto API available in Edge Runtime.
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Auth required — contributions must be linked to a user
  const supabaseAuth = await getSupabaseServer();
  if (!supabaseAuth) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }
  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Authentication required to contribute data.' }, { status: 401 });
  }

  // Rate limiting
  const ip = getRateLimitKey(request);
  if (await symptomRateLimiter.isLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Parse and validate request body
  let payload: z.infer<typeof PayloadSchema>;
  try {
    const raw = await request.json();
    const parsed = PayloadSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('[contribute-symptoms] 400 validation failed:', parsed.error.issues[0]?.message);
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const adminClient = getSupabaseServiceRole();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  try {
    const rowData = {
      user_id: authUser.id,
      symptom_rating: payload.symptom_rating,
      ifl_risk: payload.ifl_risk,
      glasgow_overall: payload.glasgow_overall,
      fl_score: payload.fl_score,
      ned_mean: payload.ned_mean,
      regularity: payload.regularity,
      eai: payload.eai,
      rera_index: payload.rera_index,
      combined_fl_pct: payload.combined_fl_pct,
      pressure_bucket: payload.pressure_bucket,
      pap_mode: payload.pap_mode,
      device_model: payload.device_model,
      duration_hours: payload.duration_hours,
      night_date: payload.night_date ?? null,
      engine_version: payload.engine_version ?? null,
      // Enhanced fields (nullable — backward compatible)
      hypopnea_index: payload.hypopnea_index ?? null,
      amplitude_cv: payload.amplitude_cv ?? null,
      unstable_epoch_pct: payload.unstable_epoch_pct ?? null,
      tidal_volume_cv: payload.tidal_volume_cv ?? null,
      trigger_delay_median_ms: payload.trigger_delay_median_ms ?? null,
      ie_ratio: payload.ie_ratio ?? null,
    };

    // User-based dedup: if night_date is present, upsert on (user_id, night_date)
    // using the unique index idx_symptom_contributions_user_night.
    // Legacy anonymous rows still use dedup_hash — not affected.
    let error;
    if (payload.night_date) {
      // Use raw SQL upsert via the unique index on (user_id, night_date)
      // Since Supabase JS client doesn't support partial index conflict,
      // we first try to find an existing row, then insert or update.
      const { data: existing } = await adminClient
        .from('symptom_contributions')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('night_date', payload.night_date)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await adminClient
          .from('symptom_contributions')
          .update(rowData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Also generate a dedup_hash for backward compatibility (column may have NOT NULL)
        const dedupInput = `${authUser.id}|${payload.night_date}|${payload.symptom_rating}`;
        const dedupHash = await sha256(dedupInput);
        const { error: insertError } = await adminClient
          .from('symptom_contributions')
          .insert({ ...rowData, dedup_hash: dedupHash });
        error = insertError;
      }
    } else {
      // No night_date — fallback to hash-based dedup
      const dedupInput = `${authUser.id}|${payload.ifl_risk}|${payload.glasgow_overall}|${payload.fl_score}|${payload.ned_mean}|${payload.symptom_rating}`;
      const dedupHash = await sha256(dedupInput);
      const { error: upsertError } = await adminClient
        .from('symptom_contributions')
        .upsert({ ...rowData, dedup_hash: dedupHash }, { onConflict: 'dedup_hash' });
      error = upsertError;
    }

    if (error) {
      console.error('[contribute-symptoms] DB error:', error.message);
      Sentry.captureException(error, { tags: { route: 'contribute-symptoms' } });
      return NextResponse.json({ error: 'Failed to save contribution' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contribute-symptoms' } });
    console.error('[contribute-symptoms] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
