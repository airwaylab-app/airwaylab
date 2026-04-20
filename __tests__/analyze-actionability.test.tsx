/**
 * AIR-667: /analyze actionability improvements
 *
 * Tests cover:
 * - MetricCard micro-trend indicator
 * - MetricCard "Adjust your range" affordance
 * - NextSteps "Where to go from here" three-column layout
 * - Clinician question copy button presence
 * - COMMUNITY_LINKS_ENABLED flag is false (compliance gate)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from '@/components/common/metric-card';
import { NextSteps } from '@/components/dashboard/next-steps';
import { COMMUNITY_LINKS_ENABLED, COMMUNITY_LINK_MAP } from '@/lib/community-links';
import { THRESHOLDS } from '@/lib/thresholds';
import type { NightResult, MachineSettings, GlasgowComponents, WATResults, NEDResults } from '@/lib/types';

// --- Mocks ---

vi.mock('@/components/common/thresholds-provider', () => ({
  useThresholds: () => THRESHOLDS,
}));

vi.mock('@/lib/ifl-risk', () => ({
  computeIFLRisk: (n: NightResult) => n.wat.flScore * 0.35 + n.ned.nedMean * 0.30 + 10,
  getIFLContextNote: () => null,
}));

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
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: null,
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  };
}

// --- MetricCard tests ---

describe('MetricCard — micro-trend indicator', () => {
  it('shows micro-trend when sevenNightAvg is provided', () => {
    render(
      <MetricCard
        label="FL Score"
        value={30}
        sevenNightAvg={25}
        threshold={THRESHOLDS.watFL}
      />
    );
    // 30 vs 25 = +20% increase
    expect(screen.getByText(/20%.*7-night avg/)).toBeInTheDocument();
  });

  it('shows downward trend when value is below 7-night avg', () => {
    render(
      <MetricCard
        label="FL Score"
        value={20}
        sevenNightAvg={25}
        threshold={THRESHOLDS.watFL}
      />
    );
    // 20 vs 25 = -20%
    expect(screen.getByText(/20%.*7-night avg/)).toBeInTheDocument();
    // Screen reader text for decrease
    expect(screen.getByText('decreased by')).toBeInTheDocument();
  });

  it('does not show micro-trend when sevenNightAvg is not provided', () => {
    render(
      <MetricCard
        label="FL Score"
        value={30}
        threshold={THRESHOLDS.watFL}
      />
    );
    expect(screen.queryByText(/7-night avg/)).not.toBeInTheDocument();
  });

  it('does not show micro-trend when sevenNightAvg is zero', () => {
    render(
      <MetricCard
        label="FL Score"
        value={30}
        sevenNightAvg={0}
        threshold={THRESHOLDS.watFL}
      />
    );
    expect(screen.queryByText(/7-night avg/)).not.toBeInTheDocument();
  });

  it('has sr-only text for screen readers', () => {
    render(
      <MetricCard
        label="FL Score"
        value={30}
        sevenNightAvg={25}
        threshold={THRESHOLDS.watFL}
      />
    );
    expect(screen.getByText('increased by')).toHaveClass('sr-only');
  });
});

describe('MetricCard — "Adjust your range" affordance', () => {
  it('shows "Adjust your range" button when metric is amber and callback provided', () => {
    const onAdjust = vi.fn();
    // watFL amber threshold is ~30%, bad is ~50%
    render(
      <MetricCard
        label="FL Score"
        value={35} // amber
        threshold={THRESHOLDS.watFL}
        onAdjustThreshold={onAdjust}
      />
    );
    expect(screen.getByRole('button', { name: /Adjust FL Score threshold range/i })).toBeInTheDocument();
  });

  it('shows "Adjust your range" button when metric is red and callback provided', () => {
    const onAdjust = vi.fn();
    render(
      <MetricCard
        label="FL Score"
        value={80} // red
        threshold={THRESHOLDS.watFL}
        onAdjustThreshold={onAdjust}
      />
    );
    expect(screen.getByRole('button', { name: /Adjust FL Score threshold range/i })).toBeInTheDocument();
  });

  it('does NOT show "Adjust your range" when metric is green', () => {
    const onAdjust = vi.fn();
    render(
      <MetricCard
        label="FL Score"
        value={5} // green (below amber threshold)
        threshold={THRESHOLDS.watFL}
        onAdjustThreshold={onAdjust}
      />
    );
    expect(screen.queryByRole('button', { name: /Adjust FL Score threshold range/i })).not.toBeInTheDocument();
  });

  it('does NOT show "Adjust your range" when no callback provided', () => {
    render(
      <MetricCard
        label="FL Score"
        value={80} // red but no callback
        threshold={THRESHOLDS.watFL}
      />
    );
    expect(screen.queryByText(/Adjust your range/i)).not.toBeInTheDocument();
  });

  it('calls onAdjustThreshold when button is clicked', () => {
    const onAdjust = vi.fn();
    render(
      <MetricCard
        label="FL Score"
        value={80}
        threshold={THRESHOLDS.watFL}
        onAdjustThreshold={onAdjust}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Adjust FL Score threshold range/i }));
    expect(onAdjust).toHaveBeenCalledTimes(1);
  });
});

// --- NextSteps "Where to go from here" tests ---

describe('NextSteps — three-column layout', () => {
  const defaultProps = {
    selectedNight: makeNight(),
    hasOximetry: false,
    nightCount: 1,
  };

  it('renders "Where to go from here" heading', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText('Where to go from here')).toBeInTheDocument();
  });

  it('renders Track it column', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText('Track it')).toBeInTheDocument();
  });

  it('renders Explore it column', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText('Explore it')).toBeInTheDocument();
  });

  it('renders Discuss it column', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText('Discuss it')).toBeInTheDocument();
  });

  it('renders ApneaBoard community link', () => {
    render(<NextSteps {...defaultProps} />);
    const link = screen.getByRole('link', { name: /ApneaBoard forums \(opens in new tab\)/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders r/SleepApnea community link', () => {
    render(<NextSteps {...defaultProps} />);
    const link = screen.getByRole('link', { name: /r\/SleepApnea on Reddit \(opens in new tab\)/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders external links disclaimer', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText(/AirwayLab does not endorse specific treatment advice/i)).toBeInTheDocument();
  });

  it('renders Copy list button for clinician questions', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Copy clinician questions to clipboard/i })).toBeInTheDocument();
  });

  it('shows at least one clinician question', () => {
    // For a night with typical metrics, should show the default question
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText(/My breathing metrics look typical/i)).toBeInTheDocument();
  });

  it('shows elevated IFL risk question for high-risk night', () => {
    const highRiskNight = makeNight({ wat: { flScore: 60 }, ned: { nedMean: 30 } });
    render(<NextSteps {...defaultProps} selectedNight={highRiskNight} />);
    expect(screen.getByText(/IFL Symptom Risk/i)).toBeInTheDocument();
  });

  it('shows nights-remaining hint when nightCount < 3', () => {
    render(<NextSteps {...defaultProps} nightCount={1} />);
    expect(screen.getByText(/2 more nights? to unlock trend analysis/i)).toBeInTheDocument();
  });

  it('keeps "Take the tour again" button', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByText('Take the tour again')).toBeInTheDocument();
  });

  it('keeps "Getting started guide" link', () => {
    render(<NextSteps {...defaultProps} />);
    expect(screen.getByRole('link', { name: /Getting started guide/i })).toBeInTheDocument();
  });
});

// --- Community links compliance gate test ---

describe('community-links compliance gate', () => {
  it('COMMUNITY_LINKS_ENABLED is false pending final compliance code review', () => {
    expect(COMMUNITY_LINKS_ENABLED).toBe(false);
  });

  it('no link label description contains forbidden therapy parameter names', () => {
    const forbidden = ['EPR', 'EPAP', 'IPAP', 'pressure support', 'trigger sensitivity', 'rise time', 'cycle sensitivity'];
    for (const [key, pattern] of Object.entries(COMMUNITY_LINK_MAP) as [string, { summary: string; links: { label: string }[] }][]) {
      for (const term of forbidden) {
        expect(pattern.summary.toLowerCase(), `${key} summary contains "${term}"`).not.toContain(term.toLowerCase());
        for (const link of pattern.links) {
          // Only check the descriptive part (before " — platform") to avoid false positives
          // from platform names like "r/SleepApnea" containing "epap" as a substring.
          const descPart = link.label.split(' — ')[0] ?? link.label;
          expect(descPart.toLowerCase(), `${key} label description "${descPart}" contains "${term}"`).not.toContain(term.toLowerCase());
        }
      }
    }
  });
});
