import type { Tier } from '@/lib/auth/auth-context'
import packageJson from '../package.json'

/** Rich context captured alongside every feedback submission. */
export interface FeedbackMetadata {
  user_agent: string | null
  screen_width: number | null
  screen_height: number | null
  viewport_width: number | null
  viewport_height: number | null
  timezone: string | null
  locale: string | null
  app_version: string
  has_analysis_results: boolean | null
  user_tier: Tier | null
  display_name: string | null
  referrer: string | null
}

/**
 * Gathers client-side context metadata for a feedback submission.
 * All fields are best-effort — returns null for anything unavailable.
 */
export function gatherFeedbackContext(profile: {
  tier: Tier
  display_name: string | null
} | null): FeedbackMetadata {
  return {
    user_agent: navigator.userAgent ?? null,
    screen_width: screen.width ?? null,
    screen_height: screen.height ?? null,
    viewport_width: window.innerWidth ?? null,
    viewport_height: window.innerHeight ?? null,
    timezone: safeTimezone(),
    locale: navigator.language ?? null,
    app_version: packageJson.version,
    has_analysis_results: safeCheckLocalStorage('airwaylab_results'),
    user_tier: profile?.tier ?? null,
    display_name: profile?.display_name ?? null,
    referrer: document.referrer || null,
  }
}

function safeTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return null
  }
}

function safeCheckLocalStorage(key: string): boolean | null {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return null
  }
}
