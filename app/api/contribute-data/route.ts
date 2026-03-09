import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { NightResult } from '@/lib/types';

// ── Constants ────────────────────────────────────────────────
/** Bump when the anonymised night schema changes */
const SCHEMA_VERSION = 2;

// ── Rate limiter (per-IP, 3 contributions per hour) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ── Validation ───────────────────────────────────────────────
const MAX_NIGHTS = 365;
const MAX_PAYLOAD_BYTES = 2_048_000; // 2 MB

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

// ── Request body types ───────────────────────────────────────

interface ContributeRequestBody {
  nights: NightResult[];
  /** Optional: user-reported sleep quality (1–5 scale) per night */
  sleepQuality?: number | null;
  /** Optional: therapy change metadata */
  therapyChange?: {
    /** Index of the night when therapy was changed (within the nights array) */
    changeNightIndex: number;
    /** Settings before the change */
    settingsBefore?: {
      epap: number;
      ipap: number;
      pressureSupport: number;
      papMode: string;
    };
  } | null;
  /** Optional: stable anonymous token for longitudinal linking */
  anonymousToken?: string | null;
  /** Optional: per-breath summary arrays (NED/FI per breath, compact) */
  breathSummaries?: Array<{
    nightIndex: number;
    /** Per-breath NED values */
    nedValues: number[];
    /** Per-breath FI values */
    fiValues: number[];
    /** Per-breath tPeak/Ti values */
    tpeakValues: number[];
    /** Per-breath M-shape flags (1 = M-shape, 0 = not) */
    mShapeFlags: number[];
  }> | null;
}

// ── Inter-night gap computation ──────────────────────────────

/**
 * Compute days between consecutive nights.
 * Returns an array of gaps where gaps[i] = days between night i-1 and night i.
 * First element is always 0.
 * Preserves temporal patterns without revealing actual dates.
 */
function computeInterNightGaps(nights: NightResult[]): number[] {
  if (nights.length <= 1) return [0];
  const gaps = [0];
  for (let i = 1; i < nights.length; i++) {
    const prev = new Date(nights[i - 1].dateStr);
    const curr = new Date(nights[i].dateStr);
    const diffMs = Math.abs(curr.getTime() - prev.getTime());
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    gaps.push(diffDays);
  }
  return gaps;
}

// ── Anonymise one night ─────────────────────────────────────

function anonymiseNight(n: NightResult, index: number, gapDays: number) {
  return {
    schemaVersion: SCHEMA_VERSION,
    nightIndex: index,
    /** Days since previous night (0 for first night) */
    gapDaysSincePrevious: gapDays,
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
        }
      : null,
  };
}

// ── Validate optional fields ─────────────────────────────────

function validateSleepQuality(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'number') return null;
  if (!Number.isInteger(val) || val < 1 || val > 5) return null;
  return val;
}

function validateTherapyChange(
  val: unknown,
  nightCount: number
): ContributeRequestBody['therapyChange'] {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  if (
    typeof obj.changeNightIndex !== 'number' ||
    obj.changeNightIndex < 0 ||
    obj.changeNightIndex >= nightCount
  ) {
    return null;
  }
  const result: NonNullable<ContributeRequestBody['therapyChange']> = {
    changeNightIndex: obj.changeNightIndex,
  };
  if (obj.settingsBefore && typeof obj.settingsBefore === 'object') {
    const sb = obj.settingsBefore as Record<string, unknown>;
    if (
      typeof sb.epap === 'number' &&
      typeof sb.ipap === 'number' &&
      typeof sb.pressureSupport === 'number' &&
      typeof sb.papMode === 'string'
    ) {
      result.settingsBefore = {
        epap: sb.epap,
        ipap: sb.ipap,
        pressureSupport: sb.pressureSupport,
        papMode: sb.papMode,
      };
    }
  }
  return result;
}

function validateAnonymousToken(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  // Must be a hex string 32-128 chars (SHA-256 or similar)
  if (val.length < 32 || val.length > 128) return null;
  if (!/^[a-f0-9]+$/i.test(val)) return null;
  return val;
}

/** Validate and cap per-breath summaries to prevent abuse */
function validateBreathSummaries(
  val: unknown,
  nightCount: number
): ContributeRequestBody['breathSummaries'] {
  if (!Array.isArray(val)) return null;
  const MAX_BREATHS_PER_NIGHT = 5000; // ~8hr at 10 breaths/min
  const MAX_SUMMARY_NIGHTS = 30; // Cap breath-level data to recent nights

  const validated: NonNullable<ContributeRequestBody['breathSummaries']> = [];
  for (const entry of val.slice(0, MAX_SUMMARY_NIGHTS)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.nightIndex !== 'number' || e.nightIndex < 0 || e.nightIndex >= nightCount) continue;
    if (!Array.isArray(e.nedValues) || !Array.isArray(e.fiValues)) continue;
    if (!Array.isArray(e.tpeakValues) || !Array.isArray(e.mShapeFlags)) continue;

    // All arrays must be same length and within limits
    const len = Math.min(e.nedValues.length, MAX_BREATHS_PER_NIGHT);
    if (
      e.fiValues.length < len ||
      e.tpeakValues.length < len ||
      e.mShapeFlags.length < len
    ) continue;

    // Validate all values are numbers
    const nedSlice = (e.nedValues as unknown[]).slice(0, len);
    const fiSlice = (e.fiValues as unknown[]).slice(0, len);
    const tpeakSlice = (e.tpeakValues as unknown[]).slice(0, len);
    const mShapeSlice = (e.mShapeFlags as unknown[]).slice(0, len);

    if (!nedSlice.every((v) => typeof v === 'number')) continue;
    if (!fiSlice.every((v) => typeof v === 'number')) continue;
    if (!tpeakSlice.every((v) => typeof v === 'number')) continue;
    if (!mShapeSlice.every((v) => typeof v === 'number')) continue;

    validated.push({
      nightIndex: e.nightIndex,
      nedValues: nedSlice as number[],
      fiValues: fiSlice as number[],
      tpeakValues: tpeakSlice as number[],
      mShapeFlags: mShapeSlice as number[],
    });
  }

  return validated.length > 0 ? validated : null;
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
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
    const { nights } = body as { nights: unknown[] };

    // Validate nights
    if (!Array.isArray(nights) || nights.length === 0 || nights.length > MAX_NIGHTS) {
      console.warn(`[contribute-data] 400 invalid night count: ${Array.isArray(nights) ? nights.length : 'not array'}`);
      return NextResponse.json(
        { error: `Expected 1–${MAX_NIGHTS} nights.` },
        { status: 400 }
      );
    }

    if (!nights.every(isValidNight)) {
      console.warn('[contribute-data] 400 invalid night data format');
      return NextResponse.json(
        { error: 'Invalid night data format.' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const sleepQuality = validateSleepQuality(body.sleepQuality);
    const therapyChange = validateTherapyChange(body.therapyChange, nights.length);
    const anonymousToken = validateAnonymousToken(body.anonymousToken);
    const breathSummaries = validateBreathSummaries(body.breathSummaries, nights.length);

    // Compute inter-night gaps (temporal context without real dates)
    const gaps = computeInterNightGaps(nights as NightResult[]);

    // Anonymise
    const anonymised = (nights as NightResult[]).map((n, i) =>
      anonymiseNight(n, i, gaps[i])
    );

    // Generate a random contribution ID (not linked to user identity)
    const contributionId = crypto.randomUUID();

    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.from('data_contributions').insert({
        contribution_id: contributionId,
        schema_version: SCHEMA_VERSION,
        night_count: anonymised.length,
        nights: anonymised,
        has_oximetry: anonymised.some((n) => n.oximetry !== null),
        device_model: anonymised[0]?.settings.deviceModel || 'Unknown',
        pap_mode: anonymised[0]?.settings.papMode || 'Unknown',
        sleep_quality: sleepQuality,
        therapy_change: therapyChange,
        anonymous_token: anonymousToken,
        breath_summaries: breathSummaries,
      });

      if (error) {
        console.error('[contribute-data] Supabase error:', error.message);
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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
