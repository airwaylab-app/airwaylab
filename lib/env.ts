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
} as const;

/**
 * Call in server-side code to warn about missing pairs.
 * e.g. if ANTHROPIC_API_KEY is set but AI_INSIGHTS_API_KEY is not.
 */
export function validateServerEnv() {
  const warnings: string[] = [];

  if (serverEnv.ANTHROPIC_API_KEY && !serverEnv.AI_INSIGHTS_API_KEY) {
    warnings.push(
      'ANTHROPIC_API_KEY is set but AI_INSIGHTS_API_KEY is missing — AI Insights endpoint will reject requests.'
    );
  }

  if (serverEnv.SUPABASE_URL && !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push(
      'SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing — waitlist capture will fail.'
    );
  }

  if (serverEnv.SUPABASE_SERVICE_ROLE_KEY && !serverEnv.SUPABASE_URL) {
    warnings.push(
      'SUPABASE_SERVICE_ROLE_KEY is set but SUPABASE_URL is missing — waitlist capture will fail.'
    );
  }

  for (const w of warnings) {
    console.warn(`[env] ⚠️  ${w}`);
  }

  return warnings;
}
