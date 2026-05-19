import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';

// ── Stub heavy/client-only deps ──────────────────────────────
vi.mock('@/lib/analytics', () => ({
  events: { shareViewed: vi.fn(), tabViewed: vi.fn(), shareCopied: vi.fn() },
}));

vi.mock('@/components/common/thresholds-provider', () => ({
  ThresholdsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/common/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/common/night-selector', () => ({
  NightSelector: () => null,
}));

vi.mock('@/components/dashboard/overview-tab', () => ({
  OverviewTab: () => <div data-testid="overview-tab" />,
}));

vi.mock('@/components/dashboard/glasgow-tab', () => ({
  GlasgowTab: () => <div data-testid="glasgow-tab" />,
}));

vi.mock('@/components/dashboard/flow-analysis-tab', () => ({
  FlowAnalysisTab: () => <div data-testid="flow-analysis-tab" />,
}));

vi.mock('@/components/dashboard/oximetry-tab', () => ({
  OximetryTab: () => <div data-testid="oximetry-tab" />,
}));

vi.mock('@/components/dashboard/trends-tab', () => ({
  TrendsTab: () => <div data-testid="trends-tab" />,
}));

vi.mock('@/components/share/shared-graphs-tab', () => ({
  SharedGraphsTab: () => <div data-testid="shared-graphs-tab" />,
}));

// next/link stub
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { SharedViewClient } from '@/components/share/shared-view-client';

function makeNight(dateStr: string): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7,
    sessionCount: 1,
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
    },
    glasgow: {
      overall: 3.5,
      skew: 0.5, spike: 0.3, flatTop: 0.4, topHeavy: 0.2,
      multiPeak: 0.3, noPause: 0.5, inspirRate: 0.4,
      multiBreath: 0.6, variableAmp: 0.5,
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

const baseProps = {
  nights: [makeNight('2025-01-01')],
  machineInfo: null,
  nightsCount: 1,
  expiresAt: '2025-12-31T00:00:00Z',
  shareUrl: 'https://airwaylab.app/share/test123',
  shareId: 'test-share-id',
};

describe('SharedViewClient — Graphs tab visibility', () => {
  it('renders the Graphs tab trigger when hasFiles=false', () => {
    render(
      <SharedViewClient {...baseProps} hasFiles={false} filePaths={[]} />
    );

    // Tab is always present in the tab bar
    const graphsTab = screen.getByRole('tab', { name: /graphs/i });
    expect(graphsTab).toBeInTheDocument();
  });

  it('Graphs tab has aria-disabled when hasFiles=false', () => {
    render(
      <SharedViewClient {...baseProps} hasFiles={false} filePaths={[]} />
    );

    // @base-ui/react uses aria-disabled rather than native disabled
    const graphsTab = screen.getByRole('tab', { name: /graphs/i });
    expect(graphsTab).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not render SharedGraphsTab when hasFiles=false', () => {
    render(
      <SharedViewClient {...baseProps} hasFiles={false} filePaths={[]} />
    );

    expect(screen.queryByTestId('shared-graphs-tab')).not.toBeInTheDocument();
  });

  it('renders the Graphs tab trigger as enabled when hasFiles=true with files', () => {
    render(
      <SharedViewClient
        {...baseProps}
        hasFiles={true}
        filePaths={['night1.edf']}
      />
    );

    const graphsTab = screen.getByRole('tab', { name: /graphs/i });
    expect(graphsTab).toBeInTheDocument();
    expect(graphsTab).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('renders SharedGraphsTab after activating the Graphs tab when hasFiles=true', () => {
    render(
      <SharedViewClient
        {...baseProps}
        hasFiles={true}
        filePaths={['night1.edf']}
      />
    );

    const graphsTab = screen.getByRole('tab', { name: /graphs/i });
    fireEvent.click(graphsTab);

    expect(screen.getByTestId('shared-graphs-tab')).toBeInTheDocument();
  });

  it('Graphs tab has aria-disabled when hasFiles=true but filePaths is empty', () => {
    render(
      <SharedViewClient {...baseProps} hasFiles={true} filePaths={[]} />
    );

    const graphsTab = screen.getByRole('tab', { name: /graphs/i });
    expect(graphsTab).toHaveAttribute('aria-disabled', 'true');
  });
});
