/**
 * Environment variable validation & typed accessors.
 *
 * All variables are optional — the app runs fully client-side without them.
 * Server-only vars are validated at import time so mis-configuration
 * surfaces immediately in `next dev` / `next build`.
 */

// ─── Client (NEXT_PUBLIC_*) ──────────────────────────────────────────
export const env = {
  /** Plausible Analytics domain (omit to disable analytics) */
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN:
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? undefined,

  /** URL for the AI Insights API route */
  NEXT_PUBLIC_AI_INSIGHTS_URL:
    process.env.NEXT_PUBLIC_AI_INSIGHTS_URL ?? undefined,

  /** Supabase project URL (needed for auth) */
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? undefined,

  /** Supabase anon key (public, safe for client) */
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? undefined,
} as const;

// ─── Server-only (never bundled to the client) ──────────────────────
export const serverEnv = {
  /** Supabase project URL */
  SUPABASE_URL: process.env.SUPABASE_URL ?? undefined,

  /** Supabase service-role key (keep secret!) */
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? undefined,

  /** Anthropic API key for AI Insights */
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? undefined,

  /** Gating key that clients must send to use AI Insights */
  AI_INSIGHTS_API_KEY: process.env.AI_INSIGHTS_API_KEY ?? undefined,

  /** Stripe secret key */
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? undefined,

  /** Stripe webhook signing secret */
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? undefined,

  /** Resend API key for transactional email */
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? undefined,

  /** Secret for authenticating Vercel Cron requests */
  CRON_SECRET: process.env.CRON_SECRET ?? undefined,

  /** Admin API key for internal endpoints (ML export, etc.) */
  ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? undefined,

  /** Upstash Redis REST URL (enables persistent rate limiting) */
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? undefined,

  /** Upstash Redis REST token */
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? undefined,
} as const;

/**
 * Call in server-side code to warn about missing pairs.
 * e.g. if ANTHROPIC_API_KEY is set but AI_INSIGHTS_API_KEY is not.
 */
export function validateServerEnv() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Supabase auth requires both client-side vars as a pair
  const hasSupabaseUrl = !!env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (hasSupabaseUrl !== hasSupabaseKey) {
    errors.push(
      `NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set (or both unset). Auth will not work.`
    );
  }

  if (serverEnv.ANTHROPIC_API_KEY && !serverEnv.AI_INSIGHTS_API_KEY) {
    warnings.push(
      'ANTHROPIC_API_KEY is set but AI_INSIGHTS_API_KEY is missing — AI Insights endpoint will reject requests.'
    );
  }

  if (serverEnv.SUPABASE_URL && !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push(
      'SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing — service role operations will fail.'
    );
  }

  if (serverEnv.SUPABASE_SERVICE_ROLE_KEY && !serverEnv.SUPABASE_URL) {
    warnings.push(
      'SUPABASE_SERVICE_ROLE_KEY is set but SUPABASE_URL is missing — service role operations will fail.'
    );
  }

  if (serverEnv.STRIPE_SECRET_KEY && !serverEnv.STRIPE_WEBHOOK_SECRET) {
    warnings.push(
      'STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing — Stripe webhooks will fail.'
    );
  }

  const hasUpstashUrl = !!serverEnv.UPSTASH_REDIS_REST_URL;
  const hasUpstashToken = !!serverEnv.UPSTASH_REDIS_REST_TOKEN;
  if (hasUpstashUrl !== hasUpstashToken) {
    warnings.push(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set (or both unset). Rate limiting will fall back to in-memory.'
    );
  }

  // Stripe price IDs — if Stripe is enabled, all four must be set or checkout silently breaks
  if (serverEnv.STRIPE_SECRET_KEY) {
    const priceVars = [
      'NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID',
      'NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID',
    ] as const;
    const missing = priceVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      warnings.push(
        `Stripe is enabled but ${missing.length} price ID(s) are missing — checkout buttons will not work: ${missing.join(', ')}`
      );
    }
  }

  for (const w of warnings) {
    console.warn(`[env] ⚠️  ${w}`);
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`[env] ❌ ${e}`);
    }
    throw new Error(`[env] Environment validation failed:\n${errors.join('\n')}`);
  }

  return warnings;
}
