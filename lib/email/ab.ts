/**
 * A/B testing utilities for email sequences.
 *
 * Variant assignment is deterministic: hash(userId + testName) -> A | B.
 * No DB storage needed for assignment -- the variant is computed on-demand
 * and recorded alongside each sent email for analysis.
 *
 * To add a new test:
 * 1. Add an entry to ACTIVE_TESTS with clear hypothesis and variants
 * 2. If testing subjects, add entries to SUBJECT_VARIANTS
 * 3. If testing timing, add logic in the relevant scheduling function
 */

import { createHash } from 'crypto';
import type { SequenceName } from './templates';

export type ABVariant = 'A' | 'B';

/**
 * Deterministic variant assignment.
 * Same userId + testName always returns the same variant.
 * Different testNames give independent splits.
 */
export function getABVariant(userId: string, testName: string): ABVariant {
  const hash = createHash('sha256').update(`${userId}:${testName}`).digest();
  return hash[0] % 2 === 0 ? 'A' : 'B';
}

// ── Active tests ────────────────────────────────────────────

/**
 * Registry of active A/B tests.
 * When a test concludes, move it to CONCLUDED_TESTS with the winner.
 */
export const ACTIVE_TESTS = {
  /** Dormancy re-engagement: trigger after 3 days (A) vs 7 days (B) of inactivity */
  dormancy_timing: {
    testName: 'dormancy_timing',
    hypothesis: 'Shorter dormancy window (3 days) catches users before they churn',
    variants: { A: '3 days', B: '7 days' },
    dormancyDays: { A: 3, B: 7 } as Record<ABVariant, number>,
  },
  /** Post-upload step 1: instructional (A) vs curiosity/specificity (B) */
  post_upload_subject: {
    testName: 'post_upload_subject',
    hypothesis: 'Curiosity + specificity drives higher opens than instructional framing',
    variants: { A: 'Instructional (saved, what to do next)', B: 'Curiosity (4 engines decoded)' },
  },
} as const;

// ── Subject line variants ───────────────────────────────────

type SubjectVariants = Partial<
  Record<SequenceName, Partial<Record<number, Record<ABVariant, string>>>>
>;

/**
 * Subject line overrides per sequence/step/variant.
 * If a sequence+step has an entry here, the variant subject is used
 * instead of the template default.
 *
 * Only entries where A !== B are active (tested in getVariantSubject).
 */
export const SUBJECT_VARIANTS: SubjectVariants = {
  post_upload: {
    1: {
      A: "Your first analysis is saved -- here's what to do next",
      B: '4 engines just decoded your breathing data',
    },
  },
};

/**
 * Get the subject line for a given sequence/step/variant.
 * Returns the variant-specific subject if configured, otherwise null
 * (caller should fall back to the template default).
 */
export function getVariantSubject(
  sequenceName: SequenceName,
  step: number,
  variant: ABVariant
): string | null {
  const stepVariants = SUBJECT_VARIANTS[sequenceName]?.[step];
  if (!stepVariants) return null;
  // Only use variant subject if B is actually different from A (test is active)
  if (stepVariants.A === stepVariants.B) return null;
  return stepVariants[variant] ?? null;
}
