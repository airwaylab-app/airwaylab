// ============================================================
// AirwayLab — Prompt Input Sanitization
// Defense-in-depth layer for user-controlled text entering LLM prompts.
// ============================================================

import * as Sentry from '@sentry/nextjs';

export interface SanitizeResult {
  text: string;
  flagged: boolean;
}

/**
 * Injection patterns that indicate prompt manipulation attempts.
 * Each pattern requires instruction-like context — bare keywords
 * like "ignore" or "override" in normal sentences won't match.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?(previous\s+|above\s+)?instructions/i,
  /override\s+(all\s+)?(previous\s+|above\s+)?instructions/i,
  /forget\s+(everything|all)\s+(above|previous)/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+a/i,
  /new\s+instructions?\s*:/i,
  /\bdo\s+not\s+follow\s+(your|the)\s+(previous|original)\b/i,
  /\bact\s+as\s+(if|though)\s+you\s+are\b/i,
];

/** Unicode control characters and zero-width chars to strip */
const CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F\u200B\u200C\u200D\u200E\u200F\u2028\u2029\uFEFF]/g;

/** URL pattern (http/https) */
const URL_PATTERN = /https?:\/\/[^\s)}\]>]+/gi;

const MAX_LENGTH = 200;

/**
 * Sanitize user-provided text before including it in an LLM prompt.
 *
 * 1. Strip control characters and zero-width chars
 * 2. Strip URLs
 * 3. Detect prompt injection patterns
 * 4. Truncate to MAX_LENGTH
 *
 * If injection is detected, the text is replaced with "[note removed]"
 * and a Sentry event is logged for monitoring.
 */
export function sanitizePromptInput(input: string): SanitizeResult {
  if (!input) {
    return { text: '', flagged: false };
  }

  // Step 1: Strip control characters and zero-width chars
  let cleaned = input.replace(CONTROL_CHARS, '');

  // Step 2: Strip URLs
  cleaned = cleaned.replace(URL_PATTERN, '');

  // Step 3: Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      Sentry.captureMessage('Prompt injection attempt detected in night notes', {
        level: 'warning',
        tags: { prompt_injection_attempt: 'true' },
        extra: {
          inputLength: input.length,
          matchedPattern: pattern.source,
        },
      });

      return { text: '[note removed]', flagged: true };
    }
  }

  // Step 4: Truncate
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.slice(0, MAX_LENGTH);
  }

  return { text: cleaned, flagged: false };
}
