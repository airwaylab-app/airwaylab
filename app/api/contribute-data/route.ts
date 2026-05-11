import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { validateOrigin } from '@/lib/csrf';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';
import type { NightResult } from '@/lib/types';
import { isValidDeviceMode } from '@/lib/device-capabilities';

// Tier-blind by design: all uploads are kept for ML data flywheel (AIR-1060)
const limiter = new RateLimiter({ windowMs: 3_600_000, max: 30 });

// ── Validation ───────────────────────────────────────────────
const MAX_NIGHTS_PER_CHUNK = 1000; // max nights per request (client chunks larger datasets)
const MAX_PAYLOAD_BYTES = 3_145_728; // 3 MB (supports ~1000 anonymised nights with headroom)

// Structured night context (no free text — only enum/numeric fields)
const NightContextSchema = z.object({
  caffeine: z.enum(['none', 'before-noon', 'afternoon', 'evening']).nullable(),
  alcohol: z.enum(['none', '1-2', '3+']).nullable(),
  congestion: z.enum(['none', 'mild', 'severe']).nullable(),
  position: z.enum(['back', 'side', 'stomach', 'mixed']).nullable(),
  stress: z.enum(['low', 'moderate', 'high']).nullable(),
  exercise: z.enum(['none', 'light', 'intense']).nullable(),
  symptomRating: z.number().int().min(1).max(5).nullable(),
}).nullable();

const ContributeDataSchema = z.object({
  nights: z.array(z.unknown()).min(1).max(MAX_NIGHTS_PER_CHUNK),
  contributionId: z.string().max(200).optional(),
  // Parallel array of structured night context (same length as nights, or omitted)
  nightContexts: z.array(NightContextSchema).max(MAX_NIGHTS_PER_CHUNK).optional(),
});

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

type NightContext = z.infer<typeof NightContextSchema>;

// ── Anonymise one night ─────────────────────────────────────
function anonymiseNight(n: NightResult, index: number, nightContext?: NightContext) {
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
    // Machine-reported summary stats (no identifying info — device-level only)
    machineSummary: n.machineSummary
      ? {
          ahi: n.machineSummary.ahi,
          hi: n.machineSummary.hi,
          oai: n.machineSummary.oai,
          cai: n.machineSummary.cai,
          uai: n.machineSummary.uai,
          leak50: n.machineSummary.leak50,
          leak70: n.machineSummary.leak70,
          leak95: n.machineSummary.leak95,
          leakMax: n.machineSummary.leakMax,
          minVent50: n.machineSummary.minVent50,
          minVent95: n.machineSummary.minVent95,
          respRate50: n.machineSummary.respRate50,
          respRate95: n.machineSummary.respRate95,
          tidVol50: n.machineSummary.tidVol50,
          tidVol95: n.machineSummary.tidVol95,
          ti50: n.machineSummary.ti50,
          ti95: n.machineSummary.ti95,
          ieRatio50: n.machineSummary.ieRatio50,
          spontCycPct: n.machineSummary.spontCycPct,
          tgtIpap50: n.machineSummary.tgtIpap50,
          tgtIpap95: n.machineSummary.tgtIpap95,
          tgtEpap50: n.machineSummary.tgtEpap50,
          tgtEpap95: n.machineSummary.tgtEpap95,
          maskPress50: n.machineSummary.maskPress50,
          maskPress95: n.machineSummary.maskPress95,
          durationMin: n.machineSummary.durationMin,
          maskOnMin: n.machineSummary.maskOnMin,
          maskOffMin: n.machineSummary.maskOffMin,
          maskEvents: n.machineSummary.maskEvents,
          spo2_50: n.machineSummary.spo2_50,
          spo2_95: n.machineSummary.spo2_95,
          faultDevice: n.machineSummary.faultDevice,
          faultAlarm: n.machineSummary.faultAlarm,
          faultHumidifier: n.machineSummary.faultHumidifier,
          faultHeatedTube: n.machineSummary.faultHeatedTube,
          anyFault: n.machineSummary.anyFault,
          ambHumidity50: n.machineSummary.ambHumidity50,
        }
      : null,
    // Night context (structured enums only — no free text, no PII)
    nightContext: nightContext ?? null,
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
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    if (await limiter.isLimited(ip)) {
      console.error('[contribute-data] 429 rate limited', { ip });
      return NextResponse.json(
        { error: 'Too many contributions. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      console.error('[contribute-data] 413 payload too large', { contentLength });
      Sentry.captureMessage('Contribution payload too large', {
        level: 'warning',
        extra: { contentLength },
      });
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    // Proactive payload size monitoring -- track every request so we can alert
    // when payloads approach the limit before they start hitting 413s
    Sentry.addBreadcrumb({
      category: 'payload',
      message: `contribute-data payload size: ${contentLength ?? 'unknown'} bytes`,
      level: 'info',
      data: { route: 'contribute-data', contentLength, limitBytes: MAX_PAYLOAD_BYTES },
    });

    const raw = await request.json().catch(() => null);
    const parsed = ContributeDataSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.';
      console.error('[contribute-data] 400 validation failed', { error: firstError });
      Sentry.captureMessage('Contribute-data Zod validation failure', {
        level: 'warning',
        tags: { route: 'contribute-data' },
        extra: { error: firstError, issueCount: parsed.error.issues.length },
      });
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const { nights, contributionId: clientContributionId, nightContexts } = parsed.data;

    if (!nights.every(isValidNight)) {
      console.error('[contribute-data] 400 invalid night data format', { nightCount: nights.length });
      Sentry.captureMessage('Contribute-data invalid night data format', {
        level: 'warning',
        tags: { route: 'contribute-data' },
        extra: { nightCount: nights.length },
      });
      return NextResponse.json(
        { error: 'Invalid night data format.' },
        { status: 400 }
      );
    }

    // Anonymise (pass corresponding night context if available)
    const anonymised = nights.map((n, i) =>
      anonymiseNight(n as NightResult, i, nightContexts?.[i])
    );

    // Use client-provided contributionId for chunked submissions, or generate one
    const contributionId =
      typeof clientContributionId === 'string' && clientContributionId.length > 0
        ? clientContributionId
        : crypto.randomUUID();

    // Device/mode consistency check -- flag impossible combinations (parser bug indicator)
    const deviceModel = anonymised[0]?.settings.deviceModel || 'Unknown';
    const papMode = anonymised[0]?.settings.papMode || 'Unknown';
    if (!isValidDeviceMode(deviceModel, papMode)) {
      Sentry.captureMessage('Device/mode mismatch detected', {
        level: 'warning',
        tags: { route: 'contribute-data', action: 'device-mode-check' },
        extra: { deviceModel, papMode, contributionId },
      });
    }

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
        Sentry.captureException(error, { tags: { route: 'contribute-data', step: 'insert' } });
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.error('[contribute-data] Supabase not configured', { nightCount: anonymised.length });
      Sentry.captureMessage('Supabase not configured - data lost', {
        level: 'error',
        tags: { route: 'contribute-data' },
        extra: { nightCount: anonymised.length },
      });
    }

    const hasOximetry = anonymised.some((n) => n.oximetry !== null);
    console.error('[contribute-data] Data contribution received', {
      nightCount: anonymised.length,
      hasOximetry,
      deviceModel: anonymised[0]?.settings.deviceModel || 'Unknown',
    });

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
