import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SettingsTimeline } from '@/components/dashboard/settings-timeline';
import type { NightResult, MachineSettings } from '@/lib/types';

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
    ...overrides,
  };
}

function makeNight(dateStr: string, settings?: Partial<MachineSettings>): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: makeSettings(settings),
    glasgow: {
      overall: 3, skew: 0.5, spike: 0.3, flatTop: 0.4, topHeavy: 0.2,
      multiPeak: 0.3, noPause: 0.4, inspirRate: 0.5, multiBreath: 0.4, variableAmp: 0.3,
    },
    wat: { flScore: 30, regularityScore: 0.5, periodicityIndex: 0.1 },
    ned: {
      breathCount: 500, nedMean: 20, nedMedian: 18, nedP95: 45,
      nedClearFLPct: 15, nedBorderlinePct: 10, fiMean: 0.7, fiFL85Pct: 12,
      tpeakMean: 0.35, mShapePct: 5, reraIndex: 3, reraCount: 20,
      h1NedMean: 18, h2NedMean: 22, combinedFLPct: 25, estimatedArousalIndex: 8,
    },
    oximetry: null,
    oximetryTrace: null,
  };
}

describe('SettingsTimeline', () => {
  it('shows subtitle explaining amber rows when changes exist', () => {
    const nights = [
      makeNight('2025-01-15', { epap: 12 }),
      makeNight('2025-01-14'),
    ];
    render(<SettingsTimeline nights={nights} therapyChangeDate={null} />);
    expect(screen.getByText(/settings changed from the previous night/i)).toBeInTheDocument();
  });

  it('shows consistent-settings subtitle when no changes exist', () => {
    const nights = [
      makeNight('2025-01-15'),
      makeNight('2025-01-14'),
    ];
    render(<SettingsTimeline nights={nights} therapyChangeDate={null} />);
    expect(screen.getByText(/consistent across all nights/i)).toBeInTheDocument();
  });

  it('shows visible "Changed:" text on desktop rows with changes', () => {
    const nights = [
      makeNight('2025-01-15', { epap: 12, ipap: 16 }),
      makeNight('2025-01-14'),
    ];
    render(<SettingsTimeline nights={nights} therapyChangeDate={null} />);
    // Desktop table should have visible change text
    const table = screen.getByRole('table');
    const changedText = within(table).getByText(/Changed: EPAP, IPAP/);
    expect(changedText).toBeInTheDocument();
    expect(changedText).not.toHaveClass('sr-only');
  });

  it('shows "Therapy change reference" when therapyChangeDate has no changeMap entry', () => {
    // Single night that is the therapyChangeDate — no prior night to compare
    const nights = [makeNight('2025-01-14')];
    render(<SettingsTimeline nights={nights} therapyChangeDate="2025-01-14" />);
    const refs = screen.getAllByText(/Therapy change reference/);
    expect(refs.length).toBeGreaterThanOrEqual(1);
  });

  it('adds title attribute to AlertTriangle icon with change details', () => {
    const nights = [
      makeNight('2025-01-15', { trigger: 'High' }),
      makeNight('2025-01-14'),
    ];
    render(<SettingsTimeline nights={nights} therapyChangeDate={null} />);
    const icons = document.querySelectorAll('[data-testid="change-icon"]');
    const icon = icons[0];
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('title')).toMatch(/Settings changed: Trigger/);
  });

  it('mobile card still shows "Changed:" text', () => {
    const nights = [
      makeNight('2025-01-15', { cycle: 'High' }),
      makeNight('2025-01-14'),
    ];
    render(<SettingsTimeline nights={nights} therapyChangeDate={null} />);
    // The mobile section has its own "Changed:" text
    const mobileChangedTexts = screen.getAllByText(/Changed: Cycle/);
    expect(mobileChangedTexts.length).toBeGreaterThanOrEqual(1);
  });
});
