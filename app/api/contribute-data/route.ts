import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { NightResult } from '@/lib/types';

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

export async function POST(request: Request) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many contributions. Please try again later.' },
        { status: 429 }
      );
    }

    // Size guard
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { nights } = body as { nights: unknown[] };

    // Validate
    if (!Array.isArray(nights) || nights.length === 0 || nights.length > MAX_NIGHTS) {
      return NextResponse.json(
        { error: `Expected 1–${MAX_NIGHTS} nights.` },
        { status: 400 }
      );
    }

    if (!nights.every(isValidNight)) {
      return NextResponse.json(
        { error: 'Invalid night data format.' },
        { status: 400 }
      );
    }

    // Anonymise
    const anonymised = nights.map((n, i) => anonymiseNight(n as NightResult, i));

    // Generate a random contribution ID (not linked to user identity)
    const contributionId = crypto.randomUUID();

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
