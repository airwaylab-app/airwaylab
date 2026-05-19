import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';
import type { Insight } from '@/lib/insights';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockUser: { id: string } | null = null;
let mockIsPaid = false;
let mockTier = 'community';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: mockUser, tier: mockTier, isPaid: mockIsPaid }),
}));

vi.mock('@/lib/auth/feature-gate', () => ({
  canAccess: () => false,
  getAIRemaining: () => 3,
}));

vi.mock('@/lib/ai-insights-client', () => ({
  fetchAIInsights: vi.fn(),
  fetchDeepAIInsights: vi.fn(),
}));

vi.mock('@/lib/demo-ai-insights', () => ({ DEMO_AI_INSIGHTS: [] }));
vi.mock('@/lib/night-notes', () => ({
  loadNightNotes: () => ({ symptomRating: null }),
  EMPTY_NOTES: {},
}));
vi.mock('@/lib/insights', () => ({ generateInsights: () => [] }));
vi.mock('@/lib/analytics', () => ({
  events: { aiTeaserCtaClicked: vi.fn(), aiInsightsButtonClicked: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('@/components/dashboard/night-summary-hero', () => ({
  NightSummaryHero: () => React.createElement('div', { 'data-testid': 'night-summary-hero' }),
}));
vi.mock('@/components/dashboard/symptom-rating', () => ({
  SymptomRating: () => null,
}));
vi.mock('@/components/dashboard/night-context-editor', () => ({
  NightContextEditor: () => null,
}));
vi.mock('@/components/dashboard/share-prompts', () => ({
  SharePrompts: () => null,
}));
vi.mock('@/components/dashboard/community-comparison', () => ({
  CommunityComparison: () => null,
}));
vi.mock('@/components/dashboard/community-benchmarks', () => ({
  CommunityBenchmarks: () => null,
}));
vi.mock('@/components/dashboard/data-highlights-panel', () => ({
  DataHighlightsPanel: () => null,
}));
vi.mock('@/components/charts/night-heatmap', () => ({
  NightHeatmap: () => null,
}));
vi.mock('@/components/dashboard/next-steps', () => ({
  NextSteps: () => null,
}));
vi.mock('@/components/dashboard/metric-detail-modal', () => ({
  MetricDetailModal: () => null,
}));
vi.mock('@/components/common/metric-explanation', () => ({
  MetricExplanation: () => null,
}));
vi.mock('@/components/dashboard/deep-insight-teasers', () => ({
  DeepInsightTeasers: () => null,
}));
vi.mock('@/components/dashboard/ai-insights-cta', () => ({
  AIInsightsCTA: () => null,
}));
vi.mock('@/components/upload/contribution-consent-utils', () => ({
  getConsentState: () => false,
}));
vi.mock('@/components/common/thresholds-provider', async () => {
  const { THRESHOLDS } = await import('@/lib/thresholds');
  return { useThresholds: () => THRESHOLDS };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNight(): NightResult {
  return {
    date: new Date('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7,
    sessionCount: 1,
    machineSummary: { ahi: 2, ahi_central: 0, ahi_obstructive: 2, ahi_hypopnea: 0 },
    settings: {
      deviceModel: 'AirSense 10',
      papMode: 'CPAP',
      epap: 10,
      ipap: 10,
      pressureSupport: 0,
      riseTime: 1,
      trigger: 'Med',
      cycle: 'Med',
      easyBreathe: 'On',
      settingsSource: 'extracted',
    },
    glasgow: {
      overall: 3.5,
      skew: 0.5, spike: 0.3, flatTop: 0.4, topHeavy: 0.2,
      multiPeak: 0.3, noPause: 0.5, inspirRate: 0.4, multiBreath: 0.6, variableAmp: 0.5,
    },
    wat: { flScore: 45, regularityScore: 1.2, periodicityIndex: 0.05 },
    ned: {
      breathCount: 500, nedMean: 25, nedMedian: 22, nedP95: 55,
      nedClearFLPct: 30, nedBorderlinePct: 20, fiMean: 0.6,
      fiFL85Pct: 15, tpeakMean: 0.35, mShapePct: 8,
      reraIndex: 5, reraCount: 35, h1NedMean: 28, h2NedMean: 22,
      combinedFLPct: 50, estimatedArousalIndex: 12,
    },
    oximetry: null,
  } as unknown as NightResult;
}

const sampleInsights: Insight[] = [
  { id: 'test-1', type: 'warning', category: 'ned', title: 'High NED', body: 'Your NED is elevated.' },
];

// ── AIInsightsGate tests ─────────────────────────────────────────────────────

import { AIInsightsGate } from '@/components/dashboard/ai-insights-gate';

describe('AIInsightsGate — shared view', () => {
  const night = makeNight();
  const nights = [night];

  beforeEach(() => {
    mockUser = null;
    mockIsPaid = false;
    mockTier = 'community';
    vi.clearAllMocks();
  });

  it('does not render locked skeleton cards when isSharedView=true and user=null', () => {
    render(
      <AIInsightsGate
        nights={nights}
        selectedNight={night}
        previousNight={null}
        therapyChangeDate={null}
        ruleBasedInsights={sampleInsights}
        isDemo={false}
        isNewUser={false}
        isSharedView={true}
      />
    );
    expect(screen.queryByText(/Register to unlock/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a free account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Analysis Preview/i)).not.toBeInTheDocument();
  });

  it('renders rule-based insights panel when isSharedView=true and insights are present', () => {
    render(
      <AIInsightsGate
        nights={nights}
        selectedNight={night}
        previousNight={null}
        therapyChangeDate={null}
        ruleBasedInsights={sampleInsights}
        isDemo={false}
        isNewUser={false}
        isSharedView={true}
      />
    );
    expect(screen.getByText('High NED')).toBeInTheDocument();
  });

  it('renders upsell content normally when isSharedView=false and user=null', () => {
    render(
      <AIInsightsGate
        nights={nights}
        selectedNight={night}
        previousNight={null}
        therapyChangeDate={null}
        ruleBasedInsights={sampleInsights}
        isDemo={false}
        isNewUser={false}
        isSharedView={false}
      />
    );
    expect(screen.getByText(/Create a free account/i)).toBeInTheDocument();
  });
});

// ── OverviewTab tests ────────────────────────────────────────────────────────

import { OverviewTab } from '@/components/dashboard/overview-tab';

describe('OverviewTab — shared view upgrade prompt suppression', () => {
  const night = makeNight();
  const nights = [night];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render UpgradePrompt when isSharedView=true, isPaid=false', () => {
    mockIsPaid = false;
    mockUser = null;
    render(
      <OverviewTab
        nights={nights}
        selectedNight={night}
        previousNight={null}
        therapyChangeDate={null}
        isDemo={false}
        isNewUser={false}
        isSharedView={true}
      />
    );
    expect(screen.queryByText(/Supporters get/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Get AI-powered analysis/i)).not.toBeInTheDocument();
  });

  it('renders UpgradePrompt when isSharedView is not set and isPaid=false (no regression)', () => {
    mockIsPaid = false;
    mockUser = null;
    render(
      <OverviewTab
        nights={nights}
        selectedNight={night}
        previousNight={null}
        therapyChangeDate={null}
        isDemo={false}
        isNewUser={false}
      />
    );
    const upgradeText =
      screen.queryByText(/Supporters get/i) ??
      screen.queryByText(/Get AI-powered analysis/i);
    expect(upgradeText).toBeInTheDocument();
  });
});
