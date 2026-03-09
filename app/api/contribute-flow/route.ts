import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

// ── Rate limiter (per-IP, 3 submissions per hour) ──────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 3_600_000;
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
// Max 50 MB per request (compressed flow data for multiple nights)
const MAX_PAYLOAD_BYTES = 50_000_000;
const MAX_NIGHTS = 365;

const FlowNightSchema = z.object({
  nightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deviceModel: z.string().max(200).optional(),
  papMode: z.string().max(50).optional(),
  samplingRate: z.number().positive().max(1000),
  totalDurationSeconds: z.number().positive().max(86400),
  sessionCount: z.number().int().positive().max(20),
  flowDataB64: z.string().min(1).max(40_000_000), // ~30 MB base64 limit per night
  pressureDataB64: z.string().max(40_000_000).nullable().optional(),
});

type FlowNight = z.infer<typeof FlowNightSchema>;

const ContributeFlowSchema = z.object({
  nights: z.array(FlowNightSchema).min(1).max(MAX_NIGHTS),
});

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
    const parsed = ContributeFlowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid flow data format.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { nights } = parsed.data;
    const contributionId = crypto.randomUUID();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const rows = nights.map((n: FlowNight) => ({
        contribution_id: contributionId,
        night_date: n.nightDate,
        device_model: n.deviceModel || 'Unknown',
        pap_mode: n.papMode || 'Unknown',
        sampling_rate: n.samplingRate,
        total_duration_seconds: n.totalDurationSeconds,
        session_count: n.sessionCount,
        flow_data_b64: n.flowDataB64,
        pressure_data_b64: n.pressureDataB64 || null,
      }));

      const { error } = await supabase
        .from('raw_flow_contributions')
        .insert(rows);

      if (error) {
        console.error('[contribute-flow] Supabase error:', error.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    } else {
      console.info(
        `[contribute-flow] ${nights.length} nights of flow data contributed (Supabase not configured)`
      );
    }

    return NextResponse.json({
      ok: true,
      contributionId,
      nightCount: nights.length,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
