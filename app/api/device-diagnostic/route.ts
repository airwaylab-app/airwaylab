import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { routeAlert } from '@/lib/discord-webhook';
import { checkAndUpdateDedup } from './_dedup';
import { trackSignalCount } from '@/lib/signal-tracker';

/**
 * Stable fingerprint for a coverage gap: same (device model + reason + signal-label
 * set) → same key, so the table dedups to ~one row per distinct firmware/gap and the
 * coverage-issue sweep opens exactly one issue per gap. Computed server-side so the
 * key is canonical regardless of client.
 */
function coverageFingerprint(deviceModel: string, reason: string, signalLabels: string[]): string {
  const canonical = `${deviceModel}|${reason}|${[...signalLabels].sort().join(',')}`;
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

/**
 * Device families whose settings we actually extract (ResMed AirSense/AirCurve, BMC).
 * Anything else — including the `Unknown` fallback — is an unsupported or incomplete
 * upload (non-ResMed hardware or a partial SD card), which is an expected long tail,
 * not an error worth a live alert.
 */
function isSupportedModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes('airsense') || m.includes('aircurve') || m.includes('bmc');
}

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 });

const BodySchema = z.object({
  deviceModel: z.string().max(200),
  // Printable-ASCII only (blocks binary/control-char abuse) and bounded count +
  // length — EDF signal labels are ≤16 chars, so 64 is safe headroom.
  signalLabels: z.array(z.string().regex(/^[\x20-\x7E]+$/).max(64)).max(256),
  identificationText: z.string().max(2000).nullable(),
  hasStrFile: z.boolean(),
  reason: z.enum(['untrusted_autoset_range']).optional(),
}).strict();

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

    const { deviceModel, signalLabels, identificationText, hasStrFile, reason } = parsed.data;
    const fingerprint = reason ? coverageFingerprint(deviceModel, reason, signalLabels) : null;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      Sentry.captureMessage('Supabase not configured - data lost', {
        level: 'error',
        tags: { route: 'device-diagnostic' },
      });
    }
    // Coverage-gap harvests (reason set) dedup by fingerprint: keep ~one row per
    // distinct (model + reason + signal-set) instead of one per upload (AutoSet is
    // a high-volume mode). The existing empty-settings path is unchanged.
    let alreadyCaptured = false;
    if (supabase && reason && fingerprint) {
      const { data: existing } = await supabase
        .from('device_diagnostics')
        .select('id')
        .eq('fingerprint', fingerprint)
        .limit(1)
        .maybeSingle();
      alreadyCaptured = !!existing;
    }
    if (supabase && !alreadyCaptured) {
      try {
        let timeoutHandle: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>(
          (_, reject) =>
            (timeoutHandle = setTimeout(
              () =>
                reject(
                  Object.assign(new Error('Supabase insert timed out'), { name: 'AbortError' }),
                ),
              4_000,
            )),
        );

        const { error } = await Promise.race([
          supabase.from('device_diagnostics').insert({
            device_model: deviceModel,
            signal_labels: signalLabels,
            identification_text: identificationText,
            has_str_file: hasStrFile,
            reason,
            fingerprint,
          }),
          timeoutPromise,
        ]).finally(() => clearTimeout(timeoutHandle));

        if (error) {
          console.error('[device-diagnostic] Supabase error:', error.message);
          Sentry.captureException(error, { tags: { route: 'device-diagnostic' } });
        }
      } catch (insertErr) {
        if (insertErr instanceof Error && insertErr.name === 'AbortError') {
          console.warn('[device-diagnostic] Supabase insert timed out — data dropped');
        } else {
          Sentry.captureException(insertErr, { tags: { route: 'device-diagnostic' } });
        }
      }
    }

    const now = Date.now();

    // Coverage-gap harvests (reason set) are NOT a per-upload alarm — the row is
    // captured above and the coverage-issue sweep opens/maintains one GitHub issue
    // per fingerprint. Only the empty-settings/unsupported path raises a live alert.
    if (supabase && !reason) {
      if (isSupportedModel(deviceModel)) {
        // A device we DO support produced an empty-settings diagnostic — a genuine
        // engineering signal worth investigating. Deduped per model and routed to the
        // quiet #platform-health channel, NOT the user-facing alarm.
        const { shouldFire, suppressedCount } = await checkAndUpdateDedup(
          supabase,
          deviceModel,
          new Date(now),
        );
        if (shouldFire) {
          void routeAlert(
            'supported_device_extraction_failed',
            `:warning: Settings extraction failed for a SUPPORTED device — model: ${deviceModel}, hasStr: ${hasStrFile} (${suppressedCount} hit${suppressedCount !== 1 ? 's' : ''} in last 24h)`,
          );
        }
        void trackSignalCount('supported_device_extraction_failed', 'Supported Device Extraction Failed');
      } else {
        // Unsupported or incomplete upload (non-ResMed hardware or a partial card).
        // Expected long tail — the row is already captured above for the support
        // roadmap; do NOT raise a live alert (routeAlert suppresses this type).
        void routeAlert(
          'unsupported_device_unknown',
          `Unsupported/incomplete upload — model: ${deviceModel}, hasStr: ${hasStrFile}`,
        );
        void trackSignalCount('unsupported_device', 'Unsupported Device');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'device-diagnostic' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
