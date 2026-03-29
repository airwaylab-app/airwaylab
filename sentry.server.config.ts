import * as Sentry from '@sentry/nextjs';

// ── Budget guard ────────────────────────────────────────────
// Sentry free tier = 5,000 events/month. This in-memory guard
// applies progressive sampling as the budget is consumed so we
// never silently exhaust quota. Counts reset on cold starts
// (serverless) and on the 1st of each month.
//
// Thresholds:
//   0–70 %  → pass everything (full fidelity)
//  70–85 %  → 1-in-4 sampling (keeps ~25 %)
//  85–95 %  → 1-in-10 sampling (keeps ~10 %)
//  95–100 % → only level:fatal / level:error pass
const MONTHLY_BUDGET = 5_000;
const TIER1_PCT = 0.70; // start mild sampling
const TIER2_PCT = 0.85; // aggressive sampling
const TIER3_PCT = 0.95; // errors-only

let eventCount = 0;
let budgetMonth = new Date().getMonth();
let alertSent: Record<string, boolean> = {};

function resetIfNewMonth() {
  const now = new Date().getMonth();
  if (now !== budgetMonth) {
    eventCount = 0;
    budgetMonth = now;
    alertSent = {};
  }
}

function sendBudgetDiscordAlert(pct: number, tier: string) {
  const url = process.env.DISCORD_OPS_WEBHOOK_URL;
  if (!url || alertSent[tier]) return;
  alertSent[tier] = true;

  const color = pct >= 95 ? 0xef4444 : pct >= 85 ? 0xf59e0b : 0x3b82f6;
  const body = JSON.stringify({
    embeds: [{
      title: `:warning: Sentry budget ${Math.round(pct)}% — ${tier} sampling active`,
      description: `${eventCount} / ${MONTHLY_BUDGET} events used this month. ${tier === 'errors-only' ? 'Only fatal/error events are being captured.' : `Sampling is reducing volume to preserve budget for real errors.`}`,
      color,
      footer: { text: 'Sentry budget guard' },
      timestamp: new Date().toISOString(),
    }],
  });

  // Fire-and-forget — never block Sentry pipeline
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5_000),
  }).catch(() => { /* fail-open */ });
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Track which deploy introduced each error
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  tracesSampleRate: 0.01,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    // Filter: Supabase duplicate upload rejections (idempotent success)
    const message = event.exception?.values?.[0]?.value ?? '';
    if (message.includes('The resource already exists')) {
      return null;
    }

    // Budget guard: progressive sampling as quota is consumed
    resetIfNewMonth();
    const usagePct = eventCount / MONTHLY_BUDGET;

    if (usagePct >= TIER3_PCT) {
      // 95%+: only fatal/error level events pass
      sendBudgetDiscordAlert(usagePct * 100, 'errors-only');
      const level = event.level ?? 'error';
      if (level !== 'fatal' && level !== 'error') return null;
    } else if (usagePct >= TIER2_PCT) {
      // 85–95%: keep ~10% of events
      sendBudgetDiscordAlert(usagePct * 100, 'aggressive');
      if (Math.random() > 0.1) return null;
    } else if (usagePct >= TIER1_PCT) {
      // 70–85%: keep ~25% of events
      sendBudgetDiscordAlert(usagePct * 100, 'mild');
      if (Math.random() > 0.25) return null;
    }

    eventCount++;
    // Anthropic transient errors (rate limits, timeouts, connection, server errors)
    // are not AirwayLab bugs. Sample at 10% to track volume trends without burning budget.
    const errorType = (event.tags as Record<string, string> | undefined)?.error_type;
    if (
      errorType === 'rate_limit' ||
      errorType === 'connection_timeout' ||
      errorType === 'connection' ||
      errorType === 'server_error'
    ) {
      return Math.random() < 0.1 ? event : null;
    }

    return event;
  },
});
