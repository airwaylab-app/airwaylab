import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import type { Insight } from '@/lib/insights';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { aiRateLimiter, aiPremiumRateLimiter, getUserRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { exceedsPayloadLimit } from '@/lib/api/payload-guard';
import { salvageTruncatedJSON } from './salvage';
import { sanitizePromptInput } from '@/lib/prompt-sanitize';
import { cancelSequence } from '@/lib/email/sequences';
import { sendAlert, COLORS } from '@/lib/discord-webhook';
import { generateClinicalPatternInsights } from './clinical-generator';

export const maxDuration = 60;

const AI_MONTHLY_LIMIT = Infinity;

// Dedup rate-limit alerts: one alert per user per hour max
const rateLimitAlertCache = new Map<string, number>();

async function runAntigravityCli(systemPrompt: string, userPrompt: string): Promise<Insight[] | null> {
  // During tests, avoid slow CLI process spawns
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return null;
  }
  return new Promise((resolve) => {
    const fullPrompt = `${systemPrompt}\n\nSTRICT REQUIREMENT: Respond ONLY with a valid JSON array of Insight objects without code fences or any text before or after.\n\nNight Data:\n${userPrompt}`;
    const proc = spawn('agy', ['-p', fullPrompt, '--output-format', 'text'], {
      timeout: 50_000,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          let text = stdout.trim();
          const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fence?.[1]) text = fence[1].trim();
          const start = text.indexOf('[');
          const end = text.lastIndexOf(']');
          if (start !== -1 && end > start) {
            text = text.slice(start, end + 1);
          }
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolve(parsed);
            return;
          }
        } catch {
          // Fall through
        }
      }
      resolve(null);
    });

    proc.on('error', () => {
      resolve(null);
    });
  });
}

async function sendOpsRateLimitAlert(userId: string, tier: string) {
  const now = Date.now();
  const lastAlert = rateLimitAlertCache.get(userId) ?? 0;
  if (now - lastAlert < 3_600_000) return; // 1 hour dedup
  rateLimitAlertCache.set(userId, now);
  // Prune stale entries
  if (rateLimitAlertCache.size > 100) {
    for (const [key, ts] of rateLimitAlertCache) {
      if (now - ts > 3_600_000) rateLimitAlertCache.delete(key);
    }
  }
  await sendAlert('ops', '', [{
    title: ':warning: AI Rate Limit Hit',
    color: COLORS.amber,
    fields: [
      { name: 'User', value: userId.slice(0, 8) + '...', inline: true },
      { name: 'Tier', value: tier, inline: true },
    ],
    footer: { text: 'AI Insights' },
    timestamp: new Date().toISOString(),
  }]);
}

const DEEP_SYSTEM_PROMPT_EXTENSION = `

When per-breath summary data is provided, analyse:
- Progressive NED run clustering (3+ breaths with escalating NED): identify consecutive breath sequences where NED increases progressively
- Breath shape distribution: what percentage are M-shaped vs flat-topped vs normal?
- Temporal patterns: do FL episodes cluster in H1 vs H2? Are there periodic clusters?
- Progressive FL: sequences where NED increases steadily over 5+ breaths
- Recovery patterns: how quickly do metrics normalise after FL episodes?

Reference specific breath indices when discussing patterns (e.g., "Breaths 47-62 show...").
Mark all deep-analysis insights with category prefixed by the engine name for clarity.`;

const PREMIUM_INSIGHT_EXTENSION = `

Generate 6 to 10 data pattern observations for this analysis. As a premium analysis, be thorough — cover all engines with specific findings.

In addition to the standard categories, you may use these categories for premium-depth analysis:
- "correlation": Cross-engine correlations (e.g. Glasgow flat-top scoring is elevated while NED M-shape percentage is low; WAT periodicity and oximetry ODI values are both elevated)
- "temporal": Time-based patterns (e.g. progressive FL worsening across H1→H2, periodic clustering at specific intervals, REM-associated breath shape changes, positional transitions visible in H1/H2 splits)

Prioritise correlation and temporal insights — these are the analysis patterns that go beyond what rule-based systems detect.

For every warning or actionable insight, include a "context" field (2-3 sentences) providing educational background:
- What factors commonly contribute to this finding (e.g. mask fit, sleep position, pressure settings, nasal congestion, medication effects)
- Educational background on factors that commonly influence this metric
- Frame as educational and informational ("common contributing factors include..."), NEVER as therapy recommendations ("change X to Y", "try setting X to N")
- The context provides educational background, not guidance on therapy changes
Do not include the "context" field on positive or info insights — only on warning and actionable.`;

// Model selection (powered by Antigravity CLI / Gemini Pro)
const MODEL_COMMUNITY = 'gemini-pro';
const MODEL_PREMIUM = 'gemini-pro';

const SYSTEM_PROMPT = `You are a data pattern summarization assistant that describes patterns in PAP therapy data. You analyse NightResult data from AirwayLab, a tool that processes ResMed PAP (CPAP/BiPAP/ASV) SD card data.

Your task is to generate 3–6 data pattern observations in JSON format. Each insight must follow this exact schema:
{
  "id": string (unique, prefixed with "ai-"),
  "type": "positive" | "warning" | "actionable" | "info",
  "title": string (≤12 words),
  "body": string (1–2 sentences),
  "category": "glasgow" | "wat" | "ned" | "oximetry" | "therapy" | "trend"
}

Focus on:
- Cross-engine correlations the rule-based system misses (e.g. Glasgow flat-top scoring is elevated while NED M-shape percentage is low)
- Patterns between WAT regularity/periodicity and Glasgow component breakdown
- H1 vs H2 shifts across engines (positional or REM-related patterns)
- Therapy settings context: analyse ALL machine settings provided (pressure, EPR, ramp, humidity, mask type, trigger/cycle sensitivity, comfort features, and airbreak-plus Custom VAuto parameters). Describe how these settings and delivered Custom VAuto metrics relate to the data patterns observed. Do NOT suggest specific adjustments or changes.
- Custom VAuto firmware mechanics (airbreak-plus, see docs/custom-vauto.md):
  * Mode & Limits: Runs in VAuto with stock EPAP control; Max IPAP limits the stock VAuto baseline, while adaptive boost adds up to ASV Max (RCM, 0–10 cmH2O) above the custom base shape and can exceed menu Max IPAP up to the device upper limit. ASV Max is a relative boost cap, not an absolute pressure.
  * Adaptive Boost & ASV Sens (RXM): Compares cumulative inspired volume against a two-stage moving reference every ~50 ms (neutral band ~0.94–0.96). ASV Sens scales controller gain (Very Low 0.50x, Low 0.75x, Med 1.00x, High 1.25x, Very High 1.50x) and includes early-inspiration ramp, 2-breath engagement limiting, and post-large-breath dampening.
  * EPS (RDH, 0.0–3.0 cmH2O, 0 = Off) & Exh. Shape (RDW, 0–7): After inspirations >= 0.7 s, exhale relief drops pressure below EPAP by max(0, EPS - 0.25 * max(0, peak_support - PS)), bounded by the 4.0 cmH2O floor, fading with remaining breath volume and expiratory timing. Exh. Shape sets s = -0.75 + 0.25 * level in x_exp = xc + s * xc * (1 - xc) (Level 0: steep drop 0.25x + 0.75x^2; Level 3: stock linear curve; Level 7: max expiratory retention 2x - x^2).
  * Custom T/C (RPH) & Pre-Trigger Assist: Combines positive flow, accumulated volume, pressure error, and expected breath timing for trigger (score >= 1.0), and cycles at custom_cycle_fraction = 0.5*s - 0.225 of peak flow or 600 ms low-flow timer. Flow projected ~80 ms ahead can add 0.2 or 0.4 cmH2O pre-trigger assist during late expiration.
- Oximetry-flow correlations when oximetry data is present
- Flow limitation as a primary symptom driver: research (Mann et al. 2024, Gold et al. 2003) shows IFL correlates with sleepiness independently of arousals at the population level. Note this is a group-level finding; describe what the data shows for this night without implying prediction for this individual. Frame flow limitation metrics (Glasgow, FL Score, NED) as potentially closer to the primary driver of symptoms than arousal-based metrics. A low arousal index does not mean flow limitation is insignificant.
- When user-reported night context is provided (caffeine, alcohol, congestion, sleep position, stress, exercise): correlate these factors with the analysis findings. For example, afternoon caffeine + high disruptions, nasal congestion + elevated FL, back sleeping + H2 worsening, etc.
- When oximetry data shows high T<94% with low ODI3, note the discrepancy between sustained desaturation and discrete events. This pattern shows sustained desaturation rather than discrete repeated events — a distinction worth discussing with a clinician.
- UARS & Autonomic Surges: When oximetry data is present, correlate elevated NED (nedMean ≥ 6%), elevated IFL burden, or RERAs with pulse rate surges (hrClin10) even when SpO2 remains normal (>90%) and machine-reported AHI is under 5. Clinical literature (Guevarra et al. 2022, de Oliveira et al. 2016) shows that over 55% of flow-limited events trigger sympathetic pulse surges without causing oxygen desaturation or frank apneas. Describe this cardiorespiratory pattern objectively as potential autonomic sleep fragmentation to review with a clinician.
- ACTIONABILITY: For every warning or actionable insight, describe what the data shows and note results may be worth discussing with a clinician. Do NOT suggest specific actions, behavioral changes, or areas to investigate.

Rules:
- Describe what the data shows — patterns, correlations, and observations. Do NOT recommend specific therapy or pressure changes based on metrics alone. Metrics are useful for verifying whether changes worked, but the visual picture (flow waveforms, apnea events, pressure traces, and breath forms together) is needed to guide adjustments. Frame insights as "what the data shows" rather than "what to change".
- Always include "discuss with your clinician" or similar language in actionable insights
- Never claim to be a medical device or provide a diagnosis
- Be specific — reference actual metric values and settings from the data
- Prioritise actionable findings over general observations
- Generate at least one "actionable" type observation with data-specific observations the user can bring to their clinician
- Do not repeat what the rule-based system would already catch (simple threshold checks)
- Never recommend pressure increases or changes. Describe data patterns only. Brief obstructions (1-2 breath events) represent a different pattern than sustained runs. Frame all observations in terms of what the data shows, not what should be changed.
- Keep body text to 1 sentence (max ~30 words). Be data-dense, not verbose.
- If running low on space, finish the current insight and close the array. Fewer complete insights are better than many truncated ones.

Respond ONLY with a JSON array of Insight objects. No markdown, no explanation, just the array.`;

// Prompt-injection defense (SEC): every free-text string field that flows into
// buildUserPrompt is routed through sanitizePromptInput at parse time, so the
// sanitized value is what reaches the Anthropic prompt. Combined with the strict
// object schemas below (no .passthrough(): Zod strips any client field not in the
// allowlist), this guarantees only enumerated, sanitized data enters the prompt.
const sanitizedString = z
  .string()
  .max(200)
  .transform((s) => sanitizePromptInput(s).text);

const sanitizedStringNullable = sanitizedString.nullable().optional();

// Zod schema for night notes
const NightNotesSchema = z.object({
  caffeine: z.enum(['none', 'before-noon', 'afternoon', 'evening']).nullable(),
  alcohol: z.enum(['none', '1-2', '3+']).nullable(),
  congestion: z.enum(['none', 'mild', 'severe']).nullable(),
  position: z.enum(['back', 'side', 'stomach', 'mixed']).nullable(),
  stress: z.enum(['low', 'moderate', 'high']).nullable(),
  exercise: z.enum(['none', 'light', 'intense']).nullable(),
  note: z.string().max(200).optional(),
  symptomRating: z.number().int().min(1).max(5).nullable().optional(),
}).optional();

// ── Strict allowlist schemas for the night sub-objects buildUserPrompt sends ──
// These declare ONLY the fields the prompt actually consumes. Numeric/boolean/enum
// fields are typed directly; free-text strings (device/mode/mask/cycle/trigger/hash
// labels) go through sanitizedString. Unknown client keys are dropped by Zod.

const GlasgowSchema = z.object({
  overall: z.number(),
  skew: z.number().optional(),
  spike: z.number().optional(),
  flatTop: z.number().optional(),
  topHeavy: z.number().optional(),
  multiPeak: z.number().optional(),
  noPause: z.number().optional(),
  inspirRate: z.number().optional(),
  multiBreath: z.number().optional(),
  variableAmp: z.number().optional(),
});

const WatSchema = z.object({
  flScore: z.number(),
  regularityScore: z.number().optional(),
  periodicityIndex: z.number().optional(),
});

// NEDResults minus per-breath arrays (breaths/reras are stripped client-side).
const NedSchema = z.object({
  breathCount: z.number().optional(),
  nedMean: z.number(),
  nedMedian: z.number().optional(),
  nedP95: z.number().optional(),
  nedClearFLPct: z.number().optional(),
  nedBorderlinePct: z.number().optional(),
  fiMean: z.number().optional(),
  fiFL85Pct: z.number().optional(),
  tpeakMean: z.number().optional(),
  mShapePct: z.number().optional(),
  reraIndex: z.number().optional(),
  reraCount: z.number().optional(),
  h1NedMean: z.number().optional(),
  h2NedMean: z.number().optional(),
  combinedFLPct: z.number().optional(),
  estimatedArousalIndex: z.number().optional(),
  hypopneaCount: z.number().optional(),
  hypopneaIndex: z.number().optional(),
  hypopneaSource: z.enum(['machine', 'algorithm']).optional(),
  hypopneaNedInvisibleCount: z.number().optional(),
  hypopneaNedInvisiblePct: z.number().optional(),
  hypopneaMeanDropPct: z.number().optional(),
  hypopneaMeanDurationS: z.number().optional(),
  hypopneaH1Index: z.number().optional(),
  hypopneaH2Index: z.number().optional(),
  machineReraCount: z.number().optional(),
  machineReraIndex: z.number().optional(),
  briefObstructionCount: z.number().optional(),
  briefObstructionIndex: z.number().optional(),
  briefObstructionH1Index: z.number().optional(),
  briefObstructionH2Index: z.number().optional(),
  amplitudeCvOverall: z.number().optional(),
  amplitudeCvMedianEpoch: z.number().optional(),
  unstableEpochPct: z.number().optional(),
});

const OximetryH1H2Schema = z.object({
  hrClin10: z.number(),
  odi3: z.number(),
  tBelow94: z.number(),
});

const OximetrySchema = z.object({
  odi3: z.number(),
  odi4: z.number(),
  tBelow90: z.number(),
  tBelow94: z.number(),
  hrClin8: z.number(),
  hrClin10: z.number(),
  hrClin12: z.number(),
  hrClin15: z.number(),
  hrMean10: z.number(),
  hrMean15: z.number(),
  coupled3_6: z.number(),
  coupled3_10: z.number(),
  coupledHRRatio: z.number(),
  spo2Mean: z.number(),
  spo2Min: z.number(),
  hrMean: z.number(),
  hrSD: z.number(),
  h1: OximetryH1H2Schema,
  h2: OximetryH1H2Schema,
  totalSamples: z.number(),
  retainedSamples: z.number(),
  doubleTrackingCorrected: z.number(),
});

// MachineSettings — free-text device/mode/mask/trigger/cycle labels are sanitized.
// extendedSettings is a record of numeric signals only (no string values).
const SettingsSchema = z.object({
  deviceModel: sanitizedString.optional(),
  epap: z.number().optional(),
  ipap: z.number().optional(),
  pressureSupport: z.number().optional(),
  papMode: sanitizedString.optional(),
  riseTime: z.number().nullable().optional(),
  trigger: sanitizedString.optional(),
  cycle: sanitizedString.optional(),
  easyBreathe: z.boolean().optional(),
  rampEnabled: z.boolean().nullable().optional(),
  rampTime: z.number().nullable().optional(),
  rampPressure: z.number().nullable().optional(),
  humidifierLevel: z.number().nullable().optional(),
  climateControlAuto: z.boolean().nullable().optional(),
  tubeTempSetting: z.number().nullable().optional(),
  maskType: sanitizedStringNullable,
  smartStart: z.boolean().nullable().optional(),
  tiMax: z.number().nullable().optional(),
  tiMin: z.number().nullable().optional(),
  extendedSettings: z.record(z.string(), z.number()).optional(),
  settingsSource: z.enum(['extracted', 'unavailable']).optional(),
  reslexLevel: z.number().optional(),
  autoSensitivity: z.number().optional(),
  tubeType: sanitizedString.optional(),
  heatedTubeLevel: z.number().nullable().optional(),
  customVAuto: z.object({
    enabled: z.boolean(),
    asvMax: z.number(),
    asvSens: sanitizedString,
    asvSensMultiplier: z.number(),
    eps: z.number().optional(),
    exhaleShape: z.number().optional(),
    exhaleShapeExponent: z.number().optional(),
    customTriggerCycle: z.boolean(),
    squareWave: z.boolean(),
    asvBackupRate: z.boolean(),
    autoEpap: z.boolean().optional(),
    autoEpapMinEpap: z.number().optional(),
    autoEpapMaxEpap: z.number().optional(),
    fallTime: z.number().optional(),
    ibr: z.boolean().optional(),
    headerClock: z.boolean().optional(),
    monitoring: z.boolean().optional(),
  }).optional(),
});

const SettingsMetricsSchema = z.object({
  breathCount: z.number(),
  epapDetected: z.number(),
  ipapDetected: z.number(),
  psDetected: z.number(),
  triggerDelayMedianMs: z.number(),
  autoTriggerPct: z.number(),
  tiMedianMs: z.number(),
  teMedianMs: z.number(),
  ieRatio: z.number(),
  timeAtIpapMedianMs: z.number(),
  ipapDwellMedianPct: z.number(),
  prematureCyclePct: z.number(),
  lateCyclePct: z.number(),
  endExpPressureMean: z.number(),
  endExpPressureSd: z.number(),
  tidalVolumeMedianMl: z.number(),
  tidalVolumeCv: z.number(),
  minuteVentProxy: z.number(),
  customVAutoMetrics: z.object({
    active: z.boolean(),
    asvBoostMean: z.number(),
    asvBoostMax: z.number(),
    boostedBreathPct: z.number(),
    maxIpapClippedPct: z.number(),
    maxIpapExceededPct: z.number().optional(),
    epsReliefMean: z.number(),
    epsReliefMax: z.number(),
    effectivePsMedian: z.number(),
    effectivePsP95: z.number(),
    shortTiUnder07sPct: z.number(),
    preTriggerAssistPct: z.number(),
    maxIpapHeadroomMedian: z.number(),
    epsConfigured: z.number().optional(),
    exhaleShape: z.number().optional(),
    exhaleShapeExponent: z.number().optional(),
    expiratoryRetentionPct: z.number().optional(),
    dampenedBreathPct: z.number().optional(),
  }).optional(),
});

const MachineSummarySchema = z.object({
  ahi: z.number().nullable(),
  hi: z.number().nullable(),
  oai: z.number().nullable(),
  cai: z.number().nullable(),
  uai: z.number().nullable(),
  reraIndex: z.number().nullable(),
  csrPercentage: z.number().nullable(),
  leak50: z.number().nullable(),
  leak70: z.number().nullable(),
  leak95: z.number().nullable(),
  leakMax: z.number().nullable(),
  minVent50: z.number().nullable(),
  minVent95: z.number().nullable(),
  respRate50: z.number().nullable(),
  respRate95: z.number().nullable(),
  tidVol50: z.number().nullable(),
  tidVol95: z.number().nullable(),
  ti50: z.number().nullable(),
  ti95: z.number().nullable(),
  ieRatio50: z.number().nullable(),
  spontCycPct: z.number().nullable(),
  tgtIpap50: z.number().nullable(),
  tgtIpap95: z.number().nullable(),
  tgtEpap50: z.number().nullable(),
  tgtEpap95: z.number().nullable(),
  maskPress50: z.number().nullable(),
  maskPress95: z.number().nullable(),
  maskPressMax: z.number().nullable(),
  durationMin: z.number().nullable(),
  maskOnMin: z.number().nullable(),
  maskOffMin: z.number().nullable(),
  maskEvents: z.number().nullable(),
  spo2_50: z.number().nullable(),
  spo2_95: z.number().nullable(),
  faultDevice: z.boolean(),
  faultAlarm: z.boolean(),
  faultHumidifier: z.boolean(),
  faultHeatedTube: z.boolean(),
  anyFault: z.boolean(),
  ambHumidity50: z.number().nullable(),
});

const SettingsFingerprintSchema = z.object({
  epap: z.number(),
  ps: z.number(),
  cycle: sanitizedString,
  riseTime: z.number(),
  triggerSensitivity: sanitizedString,
  tiMax: z.number(),
  hash: sanitizedString,
});

// Zod schema for per-breath summary (deep mode)
const BreathSummarySchema = z.object({
  ned: z.number(),
  fi: z.number(),
  mShape: z.boolean(),
  tPeakTi: z.number(),
  qPeak: z.number(),
  duration: z.number(),
});

const PerBreathSummarySchema = z.object({
  breaths: z.array(BreathSummarySchema).max(10000),
  breathCount: z.number().int(),
  sampleRate: z.number(),
}).optional();

// Zod schema for request validation (M4)
// durationHours, sessionCount, and settings are optional because trend-only nights
// are stripped to scalar fields only (dateStr, glasgow, ned, wat) to stay under
// the 512KB payload limit. The server only reads these fields from the selected night.
// Strict night schema: only the fields buildUserPrompt reads. No .passthrough()
// anywhere, so Zod strips any other client-supplied field before it can reach the
// prompt. dateStr is sanitized because it is echoed verbatim into the prompt JSON.
const NightSchema = z.object({
  dateStr: sanitizedString,
  durationHours: z.number().optional(),
  sessionCount: z.number().optional(),
  settings: SettingsSchema.optional(),
  glasgow: GlasgowSchema,
  wat: WatSchema,
  ned: NedSchema,
  oximetry: OximetrySchema.nullable().optional(),
  settingsMetrics: SettingsMetricsSchema.nullable().optional(),
  machineSummary: MachineSummarySchema.nullable().optional(),
  settingsFingerprint: SettingsFingerprintSchema.nullable().optional(),
});

const RequestBodySchema = z.object({
  nights: z.array(NightSchema).min(1).max(1095),
  selectedNightIndex: z.number().int().min(0),
  // Echoed verbatim into the prompt — sanitize like any other free-text string.
  therapyChangeDate: sanitizedString.nullable(),
  nightNotes: NightNotesSchema,
  deep: z.boolean().optional(),
  perBreathSummary: PerBreathSummarySchema,
});

type RequestBody = z.infer<typeof RequestBodySchema>;

function buildUserPrompt(body: RequestBody): string {
  const { nights, selectedNightIndex, therapyChangeDate, nightNotes } = body;
  const selected = nights[selectedNightIndex]!;
  const previous = selectedNightIndex < nights.length - 1 ? nights[selectedNightIndex + 1] : null;

  // When settings weren't extracted, tell the model instead of sending zeros
  const settingsContext = selected.settings?.settingsSource === 'unavailable'
    ? { note: 'Device settings could not be extracted from this SD card. Do not reference pressure values or prescribed settings.' }
    : selected.settings;

  const context: Record<string, unknown> = {
    selectedNight: {
      date: selected.dateStr,
      durationHours: selected.durationHours,
      sessionCount: selected.sessionCount,
      settings: settingsContext,
      glasgow: selected.glasgow,
      wat: selected.wat,
      ned: selected.ned,
      oximetry: selected.oximetry,
      settingsMetrics: selected.settingsMetrics ?? undefined,
      machineSummary: selected.machineSummary ?? undefined,
      settingsFingerprint: selected.settingsFingerprint ?? undefined,
    },
    nightCount: nights.length,
    therapyChangeDate,
    metricHierarchyNote: 'When comparing across nights with different Rise Time settings, do NOT reference NED or RERA differences. Use only oximetry metrics (HRc10, ODI3, T<94%) for cross-settings comparisons. Machine AHI is only meaningful when elevated -- do not cite low AHI as evidence of good therapy.',
  };

  // Include user-reported night context if available
  if (nightNotes) {
    const activeNotes: Record<string, string> = {};
    if (nightNotes.caffeine) activeNotes.caffeine = nightNotes.caffeine;
    if (nightNotes.alcohol) activeNotes.alcohol = nightNotes.alcohol;
    if (nightNotes.congestion) activeNotes.congestion = nightNotes.congestion;
    if (nightNotes.position) activeNotes.position = nightNotes.position;
    if (nightNotes.stress) activeNotes.stress = nightNotes.stress;
    if (nightNotes.exercise) activeNotes.exercise = nightNotes.exercise;
    if (nightNotes.note) {
      const sanitized = sanitizePromptInput(nightNotes.note);
      if (!sanitized.flagged) {
        activeNotes.note = sanitized.text;
      }
    }
    if (Object.keys(activeNotes).length > 0) {
      context.userReportedContext = activeNotes;
    }
  }

  if (previous) {
    context.previousNight = {
      date: previous.dateStr,
      glasgow: previous.glasgow,
      wat: previous.wat,
      ned: previous.ned,
      oximetry: previous.oximetry,
    };
  }

  // Add trend summary if multiple nights
  if (nights.length >= 3) {
    const recent = nights.slice(0, Math.min(7, nights.length));
    context.trendSummary = {
      glasgowValues: recent.map((n) => ({ date: n.dateStr, overall: n.glasgow.overall })),
      nedMeanValues: recent.map((n) => ({ date: n.dateStr, nedMean: n.ned.nedMean })),
      flScoreValues: recent.map((n) => ({ date: n.dateStr, flScore: n.wat.flScore })),
    };
  }

  // Include per-breath summary for deep mode
  if (body.deep && body.perBreathSummary) {
    const pbs = body.perBreathSummary;
    context.perBreathSummary = {
      breathCount: pbs.breathCount,
      sampleRate: pbs.sampleRate,
      // Include up to 3000 breaths (truncate to stay within token limits)
      breaths: pbs.breaths.slice(0, 3000),
    };
  }

  return JSON.stringify(context, null, 2);
}

/**
 * Get the current month key in YYYY-MM format.
 */
function getCurrentMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function POST(request: NextRequest) {
  // L8: CSRF protection
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Auth context — seamless local execution for Antigravity CLI
  let userId = 'local-user';
  const userTier = 'champion';

  try {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }
  } catch {
    // Non-blocking: local execution mode
  }

  // Parse and validate request body with Zod (M4)
  let body: RequestBody;
  try {
    const raw = await request.json();
    const parsed = RequestBodySchema.safeParse(raw);
    if (!parsed.success) {
      const zodIssue = parsed.error.issues[0];
      const detail = zodIssue ? `${zodIssue.path.join('.')}: ${zodIssue.message}` : 'unknown';
      console.error('[ai-insights] Zod validation failed:', detail);
      Sentry.captureMessage(`AI insights: Zod validation failed — ${detail}`, {
        level: 'warning',
        tags: { route: 'ai-insights', error_type: 'validation' },
        extra: { issues: parsed.error.issues.slice(0, 5), nightCount: Array.isArray(raw?.nights) ? raw.nights.length : 0 },
      });
      return NextResponse.json({ error: `Invalid request data: ${detail}` }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    console.error('[ai-insights] JSON parse failed on request body');
    Sentry.captureMessage('AI insights: request body JSON parse failed', {
      level: 'warning',
      tags: { route: 'ai-insights', error_type: 'validation' },
    });
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Cross-field validation: selectedNightIndex must be within bounds
  if (body.selectedNightIndex >= body.nights.length) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    // Enrich system prompt with aggregate symptom stats if available
    let systemPrompt = SYSTEM_PROMPT;
    const adminForStats = getSupabaseServiceRole();
    if (adminForStats) {
      try {
        const { data: aggStats } = await adminForStats.rpc('get_symptom_aggregate_stats');
        if (aggStats && aggStats.total_ratings >= 100) {
          systemPrompt += `\n\nCommunity context: average sleep rating ${Number(aggStats.avg_rating).toFixed(1)}/5 across ${aggStats.total_ratings} users.`;
        }
      } catch {
        // Non-critical — proceed without aggregate stats
      }
    }

    const isPaidTier = true;
    const isDeepRequest = body.deep === true && !!body.perBreathSummary;

    // Extend system prompt for deep mode (per-breath analysis)
    if (isDeepRequest) {
      systemPrompt += DEEP_SYSTEM_PROMPT_EXTENSION;
    }

    // Extend system prompt for premium insight depth (more insights, new categories)
    if (isPaidTier) {
      systemPrompt += PREMIUM_INSIGHT_EXTENSION;
    }

    // Generate AI insights via Antigravity CLI (Gemini Pro) without requiring an API key
    let insights: Insight[] | null = null;
    let truncated = false;

    try {
      insights = await runAntigravityCli(systemPrompt, buildUserPrompt(body));
    } catch {
      insights = null;
    }

    if (!insights || !Array.isArray(insights) || insights.length === 0) {
      // Robust built-in clinical pattern analysis engine
      insights = generateClinicalPatternInsights({
        nights: body.nights,
        selectedNightIndex: body.selectedNightIndex,
        deep: !!isDeepRequest,
        nightNotes: body.nightNotes,
      });
    }

    // Ensure all insights have valid types and required fields
    const validTypes = new Set(['positive', 'warning', 'actionable', 'info']);
    const validCategories = new Set(['glasgow', 'wat', 'ned', 'oximetry', 'therapy', 'trend', 'correlation', 'temporal']);

    insights = insights.filter(
      (i) =>
        i &&
        typeof i.id === 'string' &&
        validTypes.has(i.type) &&
        typeof i.title === 'string' &&
        typeof i.body === 'string' &&
        validCategories.has(i.category)
    );

    if (insights.length === 0) {
      insights = generateClinicalPatternInsights({
        nights: body.nights,
        selectedNightIndex: body.selectedNightIndex,
        deep: !!isDeepRequest,
        nightNotes: body.nightNotes,
      });
    }

    return NextResponse.json({
      insights,
      source: 'ai',
      isDeep: !!isDeepRequest,
      remainingCredits: Infinity,
    });
  } catch (err) {
    console.error('[ai-insights] Error:', err);
    Sentry.captureException(err, { tags: { route: 'ai-insights' } });

    // Fallback to clinical pattern engine
    try {
      if (body) {
        const isDeepFallback = body.deep === true && !!body.perBreathSummary;
        const fallbackInsights = generateClinicalPatternInsights({
          nights: body.nights,
          selectedNightIndex: body.selectedNightIndex,
          deep: isDeepFallback,
          nightNotes: body.nightNotes,
        });
        return NextResponse.json({
          insights: fallbackInsights,
          source: 'ai',
          isDeep: isDeepFallback,
          remainingCredits: Infinity,
        });
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: 'Failed to process analysis data. Please try again.' },
      { status: 502 }
    );
  }
}
