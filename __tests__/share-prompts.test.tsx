import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';

// ── Mock sessionStorage ──────────────────────────────────────
const sessionStore = new Map<string, string>();
const sessionStorageMock: Storage = {
  getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { sessionStore.delete(key); }),
  clear: vi.fn(() => { sessionStore.clear(); }),
  get length() { return sessionStore.size; },
  key: vi.fn((index: number) => Array.from(sessionStore.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });

// ── Mock clipboard ───────────────────────────────────────────
const writeTextMock = vi.fn(() => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
});

// ── Mock auth ────────────────────────────────────────────────
let mockTier = 'community';
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ tier: mockTier }),
}));

// ── Mock feature gate ────────────────────────────────────────
vi.mock('@/lib/auth/feature-gate', () => ({
  canAccess: (feature: string, tier: string) => {
    if (feature === 'pdf_report') return tier === 'supporter' || tier === 'champion';
    return false;
  },
}));

// ── Mock forum export ────────────────────────────────────────
vi.mock('@/lib/forum-export', () => ({
  exportForumSingleNight: vi.fn(() => 'mock forum text'),
}));

// ── Mock PDF report ──────────────────────────────────────────
vi.mock('@/lib/pdf-report', () => ({
  openPDFReport: vi.fn(),
}));

import { SharePrompts } from '@/components/dashboard/share-prompts';

// ── Helpers ──────────────────────────────────────────────────
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

describe('SharePrompts', () => {
  const nights = [makeNight('2025-01-01')];
  const selectedNight = nights[0];

  beforeEach(() => {
    sessionStore.clear();
    vi.clearAllMocks();
    mockTier = 'community';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Modal renders centered with items-center justify-center
  it('renders as a centered modal overlay with correct positioning classes', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    const overlay = container.querySelector('[role="dialog"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'items-center', 'justify-center');
  });

  // Test 2: Clicking backdrop closes the modal
  it('closes when backdrop is clicked', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    const overlay = container.querySelector('[role="dialog"]');
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay!);

    // After clicking backdrop, the modal should no longer render
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  // Test 3: Pressing Escape closes the modal
  it('closes when Escape key is pressed', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  // Test 4: Not rendered in demo mode
  it('does not render when isDemo is true', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={true} />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  // Test 5: Not rendered when sessionStorage dismiss key is set
  it('does not render when sessionStorage dismiss key is set', () => {
    sessionStore.set('airwaylab_share_dismissed', '1');

    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  // Test 6: Forum copy button copies text
  it('copies forum text to clipboard when Copy for Forum Post is clicked', async () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    const copyButton = screen.getByText('Copy for Forum Post');
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('mock forum text');
  });

  // Test 7: PDF button gated by canAccess
  it('shows PDF button for supporter tier', () => {
    mockTier = 'supporter';

    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    expect(screen.getByText('Download PDF Report')).toBeInTheDocument();
  });

  it('shows gated text for community tier', () => {
    mockTier = 'community';

    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    expect(screen.getByText('PDF reports are available on the Supporter plan.')).toBeInTheDocument();
  });

  // Test 8: Accessibility attributes
  it('has aria-modal and role="dialog" on the overlay', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    const overlay = container.querySelector('[role="dialog"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveAttribute('role', 'dialog');
  });

  // Test: X button closes the modal
  it('closes when X button is clicked', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={false} />
    );

    const closeButton = screen.getByLabelText('Dismiss share prompts');
    fireEvent.click(closeButton);

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
