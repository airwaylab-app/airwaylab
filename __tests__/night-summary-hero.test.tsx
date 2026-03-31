import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NightSummaryHero } from '@/components/dashboard/night-summary-hero';
import type { NightResult, MachineSettings, GlasgowComponents, WATResults, NEDResults } from '@/lib/types';
import { THRESHOLDS } from '@/lib/thresholds';

// --- Test helpers ---

function makeSettings(overrides: Partial<MachineSettings> = {}): MachineSettings {
  return {
    deviceModel: 'AirSense 10',
    epap: 10, ipap: 14, pressureSupport: 4,
    papMode: 'APAP', riseTime: 2, trigger: 'Medium',
    cycle: 'Medium', easyBreathe: false,
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
    crossDevice: null, machineSummary: null, settingsFingerprint: null, csl: null, pldSummary: null,
  };
}

vi.mock('@/components/common/thresholds-provider', () => ({
  useThresholds: () => THRESHOLDS,
}));

describe('NightSummaryHero — treatment context framing', () => {
  // Case 2: events good + FL good → green
  it('renders green when IFL Risk is green and events are green', () => {
    const night = makeNight({ glasgow: 0.5 }); // rera 2 (green), IFL ~12.7% (green)
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-emerald');
    expect(screen.getByText('Your therapy looks effective tonight')).toBeInTheDocument();
  });

  // Case 1: events good + FL amber → amber (dual framing)
  it('renders amber with dual framing when events are green but IFL Risk is amber', () => {
    // rera 2 (green), IFL ~26.8% (amber)
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  // Case 1 (key case): events good + FL red → amber, NOT red
  it('renders amber when events are green but IFL Risk is red — never red when events are controlled', () => {
    // rera 2 (green), IFL ~45.3% (red)
    const night = makeNight({ glasgow: 3.5, wat: { flScore: 60 }, ned: { nedMean: 35, fiMean: 0.6 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
    expect(hero.className).not.toContain('border-red');
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  // Case 3: events bad + FL bad → red
  it('renders red when both events and IFL Risk are in red zone', () => {
    // rera 12 (red), IFL ~45.3% (red)
    const night = makeNight({
      glasgow: 3.5,
      wat: { flScore: 60 },
      ned: { nedMean: 35, fiMean: 0.6, reraIndex: 12, hypopneaIndex: 6 },
    });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-red');
    expect(screen.getByText('Multiple metrics are outside typical ranges')).toBeInTheDocument();
  });

  // Case 4: events bad + FL good → amber
  it('renders amber when events are elevated but IFL Risk is green', () => {
    // rera 12 (red), IFL ~12.7% (green)
    const night = makeNight({ ned: { reraIndex: 12, hypopneaIndex: 6 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
    expect(screen.getByText('Respiratory events to monitor')).toBeInTheDocument();
  });

  // Body text checks for dual framing
  it('body text includes "respiratory events" language when event control is good and FL is elevated', () => {
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20 } });
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/keeping respiratory events low/i)).toBeInTheDocument();
  });

  it('body text includes distinction between event control and flow limitation for dual framing', () => {
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20 } });
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/standard event counting doesn.t capture/i)).toBeInTheDocument();
  });

  // Edge case: undefined hypopneaIndex — rely on reraIndex only
  it('handles undefined hypopneaIndex gracefully — uses reraIndex for event control', () => {
    // rera 2 (green), no hypopneaIndex, FL amber
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20, hypopneaIndex: undefined } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toContain('border-amber');
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  // Edge case: RERA exactly on threshold boundary (5 = green)
  it('handles RERA index exactly on green threshold boundary', () => {
    // rera 5 (exactly green boundary), FL amber
    const night = makeNight({ glasgow: 1.5, wat: { flScore: 35 }, ned: { nedMean: 20, reraIndex: 5 } });
    const { container } = render(<NightSummaryHero night={night} />);
    const hero = container.firstChild as HTMLElement;
    // RERA 5 is <= 5 → green → event control good → dual framing
    expect(hero.className).toContain('border-amber');
    expect(screen.getByText(/good event control/i)).toBeInTheDocument();
  });

  // Medical disclaimer always present
  it('includes medical disclaimer on all hero variants', () => {
    const night = makeNight();
    render(<NightSummaryHero night={night} />);
    expect(screen.getByText(/discuss results with your sleep physician/i)).toBeInTheDocument();
  });
});
