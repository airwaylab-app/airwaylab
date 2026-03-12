import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';

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
  let onClose: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTier = 'community';
    onClose = vi.fn() as unknown as () => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Modal renders when open=true (portaled to document.body)
  it('renders as a centered modal overlay when open', () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    const overlay = document.body.querySelector('[role="dialog"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50', 'items-center', 'justify-center');
  });

  // Test 2: Does not render when open=false
  it('does not render when open is false', () => {
    const { container } = render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={false} onClose={onClose} />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  // Test 3: Clicking backdrop calls onClose (portaled to document.body)
  it('calls onClose when backdrop is clicked', () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    const overlay = document.body.querySelector('[role="dialog"]');
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Test 4: Pressing Escape calls onClose
  it('calls onClose when Escape key is pressed', () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Test 5: X button calls onClose
  it('calls onClose when X button is clicked', () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    const closeButton = screen.getByLabelText('Dismiss share prompts');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Test 6: Forum copy button copies text
  it('copies forum text to clipboard when Copy for Forum Post is clicked', async () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    const copyButton = screen.getByText('Copy for Forum Post');
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('mock forum text');
  });

  // Test 7: PDF button gated by canAccess
  it('shows PDF button for supporter tier', () => {
    mockTier = 'supporter';

    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    expect(screen.getByText('Download PDF Report')).toBeInTheDocument();
  });

  it('shows gated text for community tier', () => {
    mockTier = 'community';

    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    expect(screen.getByText('PDF reports are available on the Supporter plan.')).toBeInTheDocument();
  });

  // Test 8: Accessibility attributes (portaled to document.body)
  it('has aria-modal and role="dialog" on the overlay', () => {
    render(
      <SharePrompts nights={nights} selectedNight={selectedNight} open={true} onClose={onClose} />
    );

    const overlay = document.body.querySelector('[role="dialog"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveAttribute('role', 'dialog');
  });
});
