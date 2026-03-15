import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import type { NightResult } from '@/lib/types';

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 });

// ── Validation ───────────────────────────────────────────────
const MAX_NIGHTS_PER_CHUNK = 1000; // max nights per request (client chunks larger datasets)
const MAX_PAYLOAD_BYTES = 3_145_728; // 3 MB (supports ~1000 anonymised nights with headroom)

function isValidNight(n: unknown): n is NightResult {
  if (!n || typeof n !== 'object') return false;
  const obj = n as Record<string, unknown>;
  return (
    typeof obj.durationHours === 'number' &&
    obj.durationHours > 0 &&
    obj.durationHours <= 24 &&
    typeof obj.sessionCount === 'number' &&
    obj.sessionCount > 0 &&
    obj.sessionCount <= 20 &&
    typeof obj.settings === 'object' &&
    obj.settings !== null &&
    typeof obj.glasgow === 'object' &&
    obj.glasgow !== null &&
    typeof obj.wat === 'object' &&
    obj.wat !== null &&
    typeof obj.ned === 'object' &&
    obj.ned !== null
  );
}

// ── Anonymise one night ─────────────────────────────────────
function anonymiseNight(n: NightResult, index: number) {
  return {
    nightIndex: index,
    durationHours: Math.round(n.durationHours * 100) / 100,
    sessionCount: n.sessionCount,
    settings: {
      deviceModel: n.settings.deviceModel || 'Unknown',
      papMode: n.settings.papMode,
      epap: n.settings.epap,
      ipap: n.settings.ipap,
      pressureSupport: n.settings.pressureSupport,
      riseTime: n.settings.riseTime,
      trigger: n.settings.trigger,
      cycle: n.settings.cycle,
      easyBreathe: n.settings.easyBreathe,
      // Extended settings (v0.7.0)
      ...(n.settings.rampEnabled !== undefined && { rampEnabled: n.settings.rampEnabled }),
      ...(n.settings.rampTime !== undefined && { rampTime: n.settings.rampTime }),
      ...(n.settings.rampPressure !== undefined && { rampPressure: n.settings.rampPressure }),
      ...(n.settings.humidifierLevel !== undefined && { humidifierLevel: n.settings.humidifierLevel }),
      ...(n.settings.climateControlAuto !== undefined && { climateControlAuto: n.settings.climateControlAuto }),
      ...(n.settings.tubeTempSetting !== undefined && { tubeTempSetting: n.settings.tubeTempSetting }),
      ...(n.settings.maskType !== undefined && { maskType: n.settings.maskType }),
      ...(n.settings.smartStart !== undefined && { smartStart: n.settings.smartStart }),
      ...(n.settings.extendedSettings && Object.keys(n.settings.extendedSettings).length > 0 && {
        extendedSettings: n.settings.extendedSettings,
      }),
    },
    glasgow: {
      overall: n.glasgow.overall,
      skew: n.glasgow.skew,
      spike: n.glasgow.spike,
      flatTop: n.glasgow.flatTop,
      topHeavy: n.glasgow.topHeavy,
      multiPeak: n.glasgow.multiPeak,
      noPause: n.glasgow.noPause,
      inspirRate: n.glasgow.inspirRate,
      multiBreath: n.glasgow.multiBreath,
      variableAmp: n.glasgow.variableAmp,
    },
    wat: {
      flScore: n.wat.flScore,
      regularityScore: n.wat.regularityScore,
      periodicityIndex: n.wat.periodicityIndex,
    },
    ned: {
      breathCount: n.ned.breathCount,
      nedMean: n.ned.nedMean,
      nedMedian: n.ned.nedMedian,
      nedP95: n.ned.nedP95,
      nedClearFLPct: n.ned.nedClearFLPct,
      nedBorderlinePct: n.ned.nedBorderlinePct,
      fiMean: n.ned.fiMean,
      fiFL85Pct: n.ned.fiFL85Pct,
      tpeakMean: n.ned.tpeakMean,
      mShapePct: n.ned.mShapePct,
      reraIndex: n.ned.reraIndex,
      reraCount: n.ned.reraCount,
      h1NedMean: n.ned.h1NedMean,
      h2NedMean: n.ned.h2NedMean,
      combinedFLPct: n.ned.combinedFLPct,
      estimatedArousalIndex: n.ned.estimatedArousalIndex,
      // Hypopnea (v0.7.0+)
      ...(n.ned.hypopneaCount !== undefined && { hypopneaCount: n.ned.hypopneaCount }),
      ...(n.ned.hypopneaIndex !== undefined && { hypopneaIndex: n.ned.hypopneaIndex }),
      ...(n.ned.hypopneaSource !== undefined && { hypopneaSource: n.ned.hypopneaSource }),
      ...(n.ned.hypopneaNedInvisibleCount !== undefined && { hypopneaNedInvisibleCount: n.ned.hypopneaNedInvisibleCount }),
      ...(n.ned.hypopneaNedInvisiblePct !== undefined && { hypopneaNedInvisiblePct: n.ned.hypopneaNedInvisiblePct }),
      ...(n.ned.hypopneaMeanDropPct !== undefined && { hypopneaMeanDropPct: n.ned.hypopneaMeanDropPct }),
      ...(n.ned.hypopneaMeanDurationS !== undefined && { hypopneaMeanDurationS: n.ned.hypopneaMeanDurationS }),
      ...(n.ned.hypopneaH1Index !== undefined && { hypopneaH1Index: n.ned.hypopneaH1Index }),
      ...(n.ned.hypopneaH2Index !== undefined && { hypopneaH2Index: n.ned.hypopneaH2Index }),
      // Brief obstruction (v0.7.0+)
      ...(n.ned.briefObstructionCount !== undefined && { briefObstructionCount: n.ned.briefObstructionCount }),
      ...(n.ned.briefObstructionIndex !== undefined && { briefObstructionIndex: n.ned.briefObstructionIndex }),
      ...(n.ned.briefObstructionH1Index !== undefined && { briefObstructionH1Index: n.ned.briefObstructionH1Index }),
      ...(n.ned.briefObstructionH2Index !== undefined && { briefObstructionH2Index: n.ned.briefObstructionH2Index }),
      // Amplitude stability (v0.7.0+)
      ...(n.ned.amplitudeCvOverall !== undefined && { amplitudeCvOverall: n.ned.amplitudeCvOverall }),
      ...(n.ned.amplitudeCvMedianEpoch !== undefined && { amplitudeCvMedianEpoch: n.ned.amplitudeCvMedianEpoch }),
      ...(n.ned.unstableEpochPct !== undefined && { unstableEpochPct: n.ned.unstableEpochPct }),
    },
    oximetry: n.oximetry
      ? {
          odi3: n.oximetry.odi3,
          odi4: n.oximetry.odi4,
          tBelow90: n.oximetry.tBelow90,
          tBelow94: n.oximetry.tBelow94,
          spo2Mean: n.oximetry.spo2Mean,
          spo2Min: n.oximetry.spo2Min,
          hrMean: n.oximetry.hrMean,
          hrSD: n.oximetry.hrSD,
          hrClin8: n.oximetry.hrClin8,
          hrClin10: n.oximetry.hrClin10,
          hrClin12: n.oximetry.hrClin12,
          hrClin15: n.oximetry.hrClin15,
          hrMean10: n.oximetry.hrMean10,
          hrMean15: n.oximetry.hrMean15,
          coupled3_6: n.oximetry.coupled3_6,
          coupled3_10: n.oximetry.coupled3_10,
          coupledHRRatio: n.oximetry.coupledHRRatio,
          h1: n.oximetry.h1,
          h2: n.oximetry.h2,
          totalSamples: n.oximetry.totalSamples,
          retainedSamples: n.oximetry.retainedSamples,
          doubleTrackingCorrected: n.oximetry.doubleTrackingCorrected,
        }
      : null,
    settingsMetrics: n.settingsMetrics ?? null,
  };
}

/*
 Supabase table schema:

 CREATE TABLE data_contributions (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   contribution_id TEXT NOT NULL,          -- random per-submission ID
   night_count INTEGER NOT NULL,
   nights JSONB NOT NULL,                  -- anonymised NightResult[]
   has_oximetry BOOLEAN DEFAULT FALSE,
   device_model TEXT,
   pap_mode TEXT,
   created_at TIMESTAMPTZ DEFAULT now()
 );

 CREATE INDEX idx_contributions_created ON data_contributions(created_at);
*/

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.warn(`[contribute-data] 429 rate limited ip=${ip}`);
      return NextResponse.json(
        { error: 'Too many contributions. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      console.warn(`[contribute-data] 413 payload too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { nights, contributionId: clientContributionId } = body as {
      nights: unknown[];
      contributionId?: string;
    };

    // Validate
    if (!Array.isArray(nights) || nights.length === 0 || nights.length > MAX_NIGHTS_PER_CHUNK) {
      console.warn(`[contribute-data] 400 invalid night count: ${Array.isArray(nights) ? nights.length : 'not array'}`);
      return NextResponse.json(
        { error: `Expected 1–${MAX_NIGHTS_PER_CHUNK} nights per request.` },
        { status: 400 }
      );
    }

    if (!nights.every(isValidNight)) {
      console.warn(`[contribute-data] 400 invalid night data format (${nights.length} nights)`);
      return NextResponse.json(
        { error: 'Invalid night data format.' },
        { status: 400 }
      );
    }

    // Anonymise
    const anonymised = nights.map((n, i) => anonymiseNight(n as NightResult, i));

    // Use client-provided contributionId for chunked submissions, or generate one
    const contributionId =
      typeof clientContributionId === 'string' && clientContributionId.length > 0
        ? clientContributionId
        : crypto.randomUUID();

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('data_contributions').insert({
        contribution_id: contributionId,
        night_count: anonymised.length,
        nights: anonymised,
        has_oximetry: anonymised.some((n) => n.oximetry !== null),
        device_model: anonymised[0]?.settings.deviceModel || 'Unknown',
        pap_mode: anonymised[0]?.settings.papMode || 'Unknown',
      });

      if (error) {
        console.error('[contribute-data] Supabase error:', error.message);
        Sentry.captureException(error, { tags: { route: 'contribute-data' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(
        `[contribute-data] ${anonymised.length} nights contributed (Supabase not configured)`
      );
    }

    return NextResponse.json({
      ok: true,
      contributionId,
      nightCount: anonymised.length,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contribute-data' } });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
