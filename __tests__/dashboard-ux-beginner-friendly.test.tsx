import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NightSummaryHero } from '@/components/dashboard/night-summary-hero';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import type { NightResult, MachineSettings, GlasgowComponents, WATResults, NEDResults } from '@/lib/types';
import type { Insight } from '@/lib/insights';
import { THRESHOLDS } from '@/lib/thresholds';

// --- Test helpers ---

function makeSettings(overrides: Partial<MachineSettings> = {}): MachineSettings {
  return {
    deviceModel: 'AirSense 10',
    epap: 10,
    ipap: 14,
    pressureSupport: 4,
    papMode: 'APAP',
    riseTime: 2,
    trigger: 'Medium',
    cycle: 'Medium',
    easyBreathe: false,
    settingsSource: 'extracted',
    ...overrides,
  };
}

function makeGlasgow(overall: number): GlasgowComponents {
  return {
    overall,
    skew: 0.1, spike: 0.1, flatTop: 0.1, topHeavy: 0.1,
    multiPeak: 0.1, noPause: 0.1, inspirRate: 0.1, multiBreath: 0.1, variableAmp: 0.1,
  };
}

function makeWAT(overrides: Partial<WATResults> = {}): WATResults {
  return { flScore: 10, regularityScore: 20, periodicityIndex: 5, ...overrides };
}

function makeNED(overrides: Partial<NEDResults> = {}): NEDResults {
  return {
    breathCount: 500, nedMean: 8, nedMedian: 6, nedP95: 20,
    nedClearFLPct: 2, nedBorderlinePct: 3, fiMean: 0.7, fiFL85Pct: 5,
    tpeakMean: 0.35, mShapePct: 2, reraIndex: 2, reraCount: 15,
    h1NedMean: 7, h2NedMean: 9, combinedFLPct: 10, estimatedArousalIndex: 5,
    ...overrides,
  };
}

function makeNight(overrides: {
  glasgow?: number;
  wat?: Partial<WATResults>;
  ned?: Partial<NEDResults>;
  oximetry?: boolean;
} = {}): NightResult {
  return {
    date: new Date('2025-01-15'),
    dateStr: '2025-01-15',
    durationHours: 7,
    sessionCount: 1,
    settings: makeSettings(),
    glasgow: makeGlasgow(overrides.glasgow ?? 0.5),
    wat: makeWAT(overrides.wat),
    ned: makeNED(overrides.ned),
    oximetry: overrides.oximetry ? {
      odi3: 3, odi4: 1, tBelow90: 1, tBelow94: 5,
      hrClin8: 10, hrClin10: 6, hrClin12: 3, hrClin15: 1,
      hrMean10: 5, hrMean15: 2, coupled3_6: 1, coupled3_10: 0.5,
      coupledHRRatio: 0.5, spo2Mean: 96, spo2Min: 90, hrMean: 62, hrSD: 8,
      h1: { hrClin10: 5, odi3: 2, tBelow94: 4 },
      h2: { hrClin10: 7, odi3: 4, tBelow94: 6 },
      totalSamples: 28000, retainedSamples: 27000, doubleTrackingCorrected: 0,
    } : null,
    oximetryTrace: null,
    settingsMetrics: null,
  };
}

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'test-insight',
    type: 'positive',
    title: 'Test insight',
    body: 'Test body text',
    category: 'glasgow',
    ...overrides,
  };
}

// Mock useThresholds to return default THRESHOLDS
vi.mock('@/components/common/thresholds-provider', () => ({
  useThresholds: () => THRESHOLDS,
}));

// --- NightSummaryHero tests ---

describe('NightSummaryHero', () => {
  it('renders green border when all metrics are in healthy range', () => {
    const night = makeNight({ glasgow: 0.5 }); // green threshold: <=1.0
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-emerald');
  });

  it('renders amber border with dual framing when events good but IFL Risk is red', () => {
    // IFL Risk > 45 = red, but RERA 2 (green) → dual framing → amber, not red
    const night = makeNight({ glasgow: 3.5, wat: { flScore: 60 }, ned: { nedMean: 35, fiMean: 0.6 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
  });

  it('renders amber border when IFL Risk is amber', () => {
    // IFL Risk 20-45 = amber
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
  });

  it('handles null oximetry without error', () => {
    const night = makeNight({ oximetry: false });
    expect(night.oximetry).toBeNull();
    expect(() => render(<NightSummaryHero night={night} />)).not.toThrow();
  });

  it('shows green headline for low IFL Risk with good events', () => {
    const night = makeNight({ glasgow: 0.5 });
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText('Your therapy looks effective tonight')).toBeInTheDocument();
  });

  it('shows dual framing headline when events good but IFL Risk is red', () => {
    // RERA 2 (green) + IFL Risk red → dual framing, not "significant FL detected"
    const night = makeNight({ glasgow: 3.5, wat: { flScore: 60 }, ned: { nedMean: 35, fiMean: 0.6 } });
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  it('shows dual framing headline for moderate IFL Risk with good events', () => {
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20 } });
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  it('includes medical disclaimer', () => {
    const night = makeNight();
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/discuss results with your sleep physician/i)).toBeInTheDocument();
  });
});

// --- InsightsPanel tests ---

describe('InsightsPanel', () => {
  const positiveInsights: Insight[] = [
    makeInsight({ id: 'good-1', type: 'positive', title: 'Looking good' }),
    makeInsight({ id: 'good-2', type: 'info', title: 'Info note' }),
  ];

  const mixedInsights: Insight[] = [
    makeInsight({ id: 'warn-1', type: 'warning', title: 'Watch this' }),
    makeInsight({ id: 'action-1', type: 'actionable', title: 'Act now' }),
    makeInsight({ id: 'good-1', type: 'positive', title: 'Looking good' }),
  ];

  it('renders collapsed when defaultExpanded is false', () => {
    render(<InsightsPanel insights={positiveInsights} defaultExpanded={false} />);
    const details = screen.getByRole('group');
    expect(details).not.toHaveAttribute('open');
  });

  it('renders expanded when defaultExpanded is true', () => {
    render(<InsightsPanel insights={positiveInsights} defaultExpanded={true} />);
    const details = screen.getByRole('group');
    expect(details).toHaveAttribute('open');
  });

  it('shows warning count badge when warnings exist', () => {
    render(<InsightsPanel insights={mixedInsights} defaultExpanded={false} />);
    expect(screen.getByText(/2 need attention/)).toBeInTheDocument();
  });

  it('shows no badge when all insights are positive/info', () => {
    render(<InsightsPanel insights={positiveInsights} defaultExpanded={false} />);
    expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
  });

  it('shows total insight count in header', () => {
    render(<InsightsPanel insights={mixedInsights} defaultExpanded={false} />);
    expect(screen.getByText(/Detailed insights \(3\)/)).toBeInTheDocument();
  });

  it('renders AI loading state inside panel', () => {
    render(
      <InsightsPanel insights={[]} defaultExpanded={true} aiLoading={true} />
    );
    expect(screen.getByText('Loading AI insights...')).toBeInTheDocument();
  });

  it('renders AI insights above rule-based when provided', () => {
    const aiInsights: Insight[] = [
      makeInsight({ id: 'ai-1', type: 'info', title: 'AI says hello' }),
    ];
    render(
      <InsightsPanel
        insights={positiveInsights}
        aiInsights={aiInsights}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('AI says hello')).toBeInTheDocument();
  });
});
