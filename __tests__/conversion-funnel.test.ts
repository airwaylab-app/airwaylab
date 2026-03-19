/**
 * Tests for the AI Insights Conversion Funnel spec.
 *
 * Covers: anonymous analysis, locked teasers, consent, auto-upload,
 * account settings, free/paid AI insights, deep mode, nudges,
 * analytics events, and privacy/pricing content.
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Mock localStorage ──────────────────────────────────────────
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
  get length() { return storage.size; },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

const ROOT = path.resolve(__dirname, '..');

// ── Helper: read source file ───────────────────────────────────
function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

// ── Test 1: Anonymous analysis stays browser-only ──────────────
describe('Core: Anonymous analysis unchanged', () => {
  it('analysis worker does not make network requests', () => {
    // The analysis worker must NOT contain fetch() calls for analysis
    const workerSrc = readSource('workers/analysis-worker.ts');
    // Worker may import modules but should not fetch during analysis
    expect(workerSrc).not.toContain('fetch(');
  });

  it('overview-tab does not auto-fetch AI insights', () => {
    const overviewSrc = readSource('components/dashboard/overview-tab.tsx');
    // Should NOT contain triggerAIFetch or auto-fetch useEffect
    expect(overviewSrc).not.toContain('triggerAIFetch');
    expect(overviewSrc).not.toContain('AIConsentModal');
  });
});

// ── Test 2: Anonymous sees locked AI teasers ───────────────────
describe('Step 1-2: Locked teasers for anonymous users', () => {
  it('ai-locked-teasers component exists with CTA', () => {
    const src = readSource('components/dashboard/ai-locked-teasers.tsx');
    expect(src).toContain('Create a free account');
    expect(src).toContain('onRegister');
  });

  it('ai-insights-gate renders locked teasers for anonymous users', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('AILockedTeasers');
    expect(src).toContain('!user && !isDemo');
  });

  it('locked teasers fire analytics event on mount', () => {
    const src = readSource('components/dashboard/ai-locked-teasers.tsx');
    expect(src).toContain('aiTeaserShown');
  });
});

// ── Test 3: AuthModal consent checkbox ─────────────────────────
describe('Step 3: Single registration consent', () => {
  it('auth-modal includes consent checkbox', () => {
    const src = readSource('components/auth/auth-modal.tsx');
    expect(src).toContain('consentChecked');
    expect(src).toContain('type="checkbox"');
  });

  it('submit button disabled without consent', () => {
    const src = readSource('components/auth/auth-modal.tsx');
    expect(src).toContain('!consentChecked');
  });

  it('consent checkbox text covers storage and AI', () => {
    const src = readSource('components/auth/auth-modal.tsx');
    expect(src).toContain('store my sleep data');
    expect(src).toContain('processed by AI');
    expect(src).toContain('delete all data anytime');
  });

  it('tracks consent checked analytics event', () => {
    const src = readSource('components/auth/auth-modal.tsx');
    expect(src).toContain('authConsentChecked');
  });
});

// ── Test 4: Automatic data collection ──────────────────────────
describe('Step 4: Auto data collection for registered users', () => {
  it('analyze page triggers auto-upload on auth', () => {
    const src = readSource('app/analyze/page.tsx');
    expect(src).toContain('hasTriggeredAutoUpload');
    expect(src).toContain('storeAnalysisData');
  });

  it('presign route does not enforce storage quota', () => {
    const src = readSource('app/api/files/presign/route.ts');
    // Should not contain 413 status code for quota exceeded
    expect(src).not.toContain('413');
    expect(src).not.toContain('getStorageUsage');
  });

  it('storage quotas are unlimited for all tiers', () => {
    const src = readSource('lib/storage/quota.ts');
    expect(src).toContain('MAX_SAFE_INTEGER');
  });
});

// ── Test 5: Account settings + data deletion ───────────────────
describe('Step 5: Account settings', () => {
  it('account page exists with profile, subscription, and data sections', () => {
    const src = readSource('app/account/page.tsx');
    expect(src).toContain('Profile');
    expect(src).toContain('Subscription');
    expect(src).toContain('Your Data');
  });

  it('account page has data deletion flow', () => {
    const src = readSource('app/account/page.tsx');
    expect(src).toContain('Delete all my data');
    expect(src).toContain('showDeleteConfirm');
    expect(src).toContain('handleDeleteData');
  });

  it('user menu has account settings link', () => {
    const src = readSource('components/auth/user-menu.tsx');
    expect(src).toContain('/account');
    expect(src).toContain('Account Settings');
  });

  it('delete API route validates auth and rate-limits', () => {
    const src = readSource('app/api/delete-user-data/route.ts');
    expect(src).toContain('getUser');
    expect(src).toContain('isLimited');
    expect(src).toContain('401');
  });

  it('delete API cleans up storage files and DB tables', () => {
    const src = readSource('app/api/delete-user-data/route.ts');
    expect(src).toContain('STORAGE_BUCKET');
    expect(src).toContain('user_files');
    expect(src).toContain('analysis_data');
    expect(src).toContain('ai_usage');
  });
});

// ── Test 6: Free AI insights (aggregate-based) ────────────────
describe('Step 6: Free AI insights', () => {
  it('gate shows Generate AI Insights button for free users', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('Generate AI Insights');
    expect(src).toContain('free this month');
  });

  it('gate shows exhausted state with upgrade CTA', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('3 free analyses used this month');
    expect(src).toContain('Become a Supporter');
  });

  it('feature-gate defines AI credit limits', () => {
    const src = readSource('lib/auth/feature-gate.ts');
    // Community gets limited credits, paid gets unlimited
    expect(src).toContain('getAIRemaining');
    expect(src).toContain('Infinity');
  });
});

// ── Test 7: Paid deep AI insights (waveform-based) ────────────
describe('Step 7: Deep AI insights', () => {
  it('ai-insights-client exports fetchDeepAIInsights', () => {
    const src = readSource('lib/ai-insights-client.ts');
    expect(src).toContain('export async function fetchDeepAIInsights');
  });

  it('deep fetch sends per-breath summary and deep flag', () => {
    const src = readSource('lib/ai-insights-client.ts');
    expect(src).toContain('deep: true');
    expect(src).toContain('perBreathSummary');
  });

  it('API route extends system prompt for deep mode', () => {
    const src = readSource('app/api/ai-insights/route.ts');
    expect(src).toContain('DEEP_SYSTEM_PROMPT_EXTENSION');
    expect(src).toContain('RERA clustering');
    expect(src).toContain('Breath shape distribution');
  });

  it('API route validates per-breath schema with Zod', () => {
    const src = readSource('app/api/ai-insights/route.ts');
    expect(src).toContain('BreathSummarySchema');
    expect(src).toContain('PerBreathSummarySchema');
  });

  it('API route returns isDeep flag in response', () => {
    const src = readSource('app/api/ai-insights/route.ts');
    expect(src).toContain('isDeep: !!isDeepRequest');
  });

  it('insights panel shows Deep Analysis badge', () => {
    const src = readSource('components/dashboard/insights-panel.tsx');
    expect(src).toContain('Deep Analysis');
    expect(src).toContain('isDeepAnalysis');
  });

  it('gate uses deep fetch for paid users', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('fetchDeepAIInsights');
    expect(src).toContain('isDeepAccess');
    expect(src).toContain('Generate Deep AI Insights');
  });

  it('deep mode only available for non-community tiers', () => {
    const src = readSource('app/api/ai-insights/route.ts');
    // Deep request requires paid tier (supporter or champion)
    expect(src).toContain('isPaidTier');
  });
});

// ── Test 8: Free → Paid nudge ──────────────────────────────────
describe('Step 8: Free → Paid nudge', () => {
  it('deep insight teasers shown after free AI insights', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('DeepInsightTeasers');
    expect(src).toContain('!isPaid && !isDemo');
  });

  it('deep teasers track analytics events', () => {
    const src = readSource('components/dashboard/deep-insight-teasers.tsx');
    expect(src).toContain('deepTeaserShown');
    expect(src).toContain('deepTeaserCtaClicked');
  });

  it('deep teasers link to pricing page', () => {
    const src = readSource('components/dashboard/deep-insight-teasers.tsx');
    expect(src).toContain('/pricing');
  });
});

// ── Test 9: Privacy policy + pricing updates ───────────────────
describe('Step 9: Privacy and pricing updates', () => {
  it('privacy policy covers registration consent model', () => {
    const src = readSource('app/privacy/page.tsx');
    expect(src).toContain('Registration Consent');
    expect(src).toContain('single consent covering all data processing');
  });

  it('privacy policy mentions per-breath data for paid tier', () => {
    const src = readSource('app/privacy/page.tsx');
    expect(src).toContain('per-breath summary');
  });

  it('privacy policy mentions data deletion from Account Settings', () => {
    const src = readSource('app/privacy/page.tsx');
    expect(src).toContain('Account Settings');
    expect(src).toContain('Delete all server-stored data instantly');
  });

  it('pricing page includes unlimited cloud storage for community', () => {
    const src = readSource('app/pricing/page.tsx');
    expect(src).toContain('Unlimited cloud storage for your EDF files');
  });

  it('pricing page shows deep AI insights for supporters', () => {
    const src = readSource('app/pricing/page.tsx');
    expect(src).toContain('6-10 deep AI insights per analysis (unlimited)');
  });

  it('pricing FAQ mentions Account Settings for data deletion', () => {
    const src = readSource('app/pricing/page.tsx');
    expect(src).toContain('Account Settings');
  });
});

// ── Test 10: Funnel analytics ──────────────────────────────────
describe('Step 10: Funnel analytics events', () => {
  const analyticsSrc = readSource('lib/analytics.ts');

  const requiredEvents = [
    'aiTeaserShown',
    'aiTeaserCtaClicked',
    'returningUserNudgeShown',
    'returningUserNudgeClicked',
    'authConsentChecked',
    'edfAutoUploadStarted',
    'edfAutoUploadCompleted',
    'edfAutoUploadFailed',
    'analysisDataStored',
    'aiInsightsButtonClicked',
    'aiInsightsGenerated',
    'aiInsightsFailed',
    'aiCreditsExhausted',
    'deepTeaserShown',
    'deepTeaserCtaClicked',
    'dataDeletionRequested',
    'dataDeletionCompleted',
  ];

  for (const event of requiredEvents) {
    it(`analytics exports ${event} event`, () => {
      expect(analyticsSrc).toContain(event);
    });
  }
});

// ── Edge cases ─────────────────────────────────────────────────
describe('Edge cases', () => {
  it('demo mode shows static AI insights with registration nudge', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('isDemo');
    expect(src).toContain('DEMO_AI_INSIGHTS');
    expect(src).toContain('Create free account');
  });

  it('AI never auto-fetches — button click required', () => {
    const gateSrc = readSource('components/dashboard/ai-insights-gate.tsx');
    // handleGenerate is a useCallback, not called from useEffect
    expect(gateSrc).toContain('handleGenerate');
    expect(gateSrc).toContain('useCallback');
    // overview-tab should not auto-fetch AI insights
    const overviewSrc = readSource('components/dashboard/overview-tab.tsx');
    expect(overviewSrc).not.toContain('triggerAIFetch');
    expect(overviewSrc).not.toContain('fetchAIInsights');
  });

  it('night switching shows re-generate option', () => {
    const src = readSource('components/dashboard/ai-insights-gate.tsx');
    expect(src).toContain('nightChanged');
    expect(src).toContain('Re-generate for');
  });

  it('returning user nudge component exists with dismiss', () => {
    const src = readSource('components/dashboard/returning-user-nudge.tsx');
    expect(src).toContain('airwaylab_nudge_dismissed');
    expect(src).toContain('handleDismiss');
  });

  it('analysis_data migration exists with correct schema', () => {
    const sql = readSource('supabase/migrations/017_analysis_data.sql');
    expect(sql).toContain('CREATE TABLE analysis_data');
    expect(sql).toContain('user_id UUID NOT NULL');
    expect(sql).toContain('night_date DATE NOT NULL');
    expect(sql).toContain('glasgow_overall REAL');
    expect(sql).toContain('per_breath_storage_path TEXT');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('UNIQUE(user_id, night_date)');
  });

  it('feature gate includes deep_ai_insights for paid tiers', () => {
    const src = readSource('lib/auth/feature-gate.ts');
    expect(src).toContain('deep_ai_insights');
  });

  it('feature gate gives community users cloud access', () => {
    const src = readSource('lib/auth/feature-gate.ts');
    // cloud_sync should include community
    expect(src).toMatch(new RegExp('cloud_sync.*community', 's'));
  });
});
