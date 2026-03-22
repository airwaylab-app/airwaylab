// ============================================================
// AirwayLab — Feature Gate
// Controls access to paid features based on user tier.
// ============================================================

import type { Tier } from './auth-context';

type Feature =
  | 'ai_insights'
  | 'deep_ai_insights'
  | 'cloud_sync'
  | 'raw_storage'
  | 'trends_full'
  | 'pdf_report'
  | 'enhanced_export'
  | 'early_access'
  | 'supporter_badge'
  | 'analysis_window';

// metric_explanations and next_steps intentionally removed —
// both are free for all users (data visibility + appointment prep).
// Actionable therapy guidance via AI is the premium differentiator.
const FEATURE_ACCESS: Record<Feature, Tier[]> = {
  ai_insights: ['community', 'supporter', 'champion'], // Community gets 3/month
  deep_ai_insights: ['supporter', 'champion'],          // Waveform-level analysis
  cloud_sync: ['community', 'supporter', 'champion'],   // All registered users
  raw_storage: ['community', 'supporter', 'champion'],  // All registered users (unlimited)
  trends_full: ['supporter', 'champion'],
  pdf_report: ['supporter', 'champion'],
  enhanced_export: ['supporter', 'champion'],
  early_access: ['champion'],
  supporter_badge: ['supporter', 'champion'],
  analysis_window: ['supporter', 'champion'],
};

const AI_MONTHLY_LIMIT = 3;

/**
 * Check if a user can access a feature.
 * For ai_insights on community tier, also checks monthly usage.
 */
export function canAccess(
  feature: Feature,
  tier: Tier,
  aiUsageThisMonth?: number
): boolean {
  const allowedTiers = FEATURE_ACCESS[feature];
  if (!allowedTiers) return false;

  if (!allowedTiers.includes(tier)) return false;

  // Community tier AI usage limit
  if (feature === 'ai_insights' && tier === 'community') {
    const usage = aiUsageThisMonth ?? getAIUsageThisMonth();
    return usage < AI_MONTHLY_LIMIT;
  }

  return true;
}

/**
 * Get remaining AI analyses for community tier.
 */
export function getAIRemaining(tier: Tier): number {
  if (tier !== 'community') return Infinity;
  return Math.max(0, AI_MONTHLY_LIMIT - getAIUsageThisMonth());
}

// ─── localStorage AI usage tracking ────────────────────────────

function getUsageKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `airwaylab_ai_usage_${yyyy}_${mm}`;
}

export function getAIUsageThisMonth(): number {
  try {
    const raw = localStorage.getItem(getUsageKey());
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementAIUsage(): void {
  try {
    const key = getUsageKey();
    const current = parseInt(localStorage.getItem(key) ?? '0', 10);
    localStorage.setItem(key, String(current + 1));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function getAnalysisWindowDays(tier: Tier): number {
  if (tier === 'champion') return Infinity;
  if (tier === 'supporter') return 90;
  return 0; // community: current session only
}
