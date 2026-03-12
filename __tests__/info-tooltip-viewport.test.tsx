import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Minimal mock for thresholds ─────────────────────────────
vi.mock('@/lib/thresholds', () => ({
  getTrafficLight: () => 'good',
  getTrafficDotColor: () => 'bg-emerald-500',
  getTrafficBg: () => 'bg-card',
}));

import { MetricCard } from '@/components/common/metric-card';

// ── Helpers ─────────────────────────────────────────────────

function mockButtonRect(rect: Partial<DOMRect>) {
  // Mock getBoundingClientRect on the info button after render
  const buttons = document.querySelectorAll('button[aria-label="More info"]');
  buttons.forEach((btn) => {
    vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 112,
      left: 200,
      right: 212,
      width: 12,
      height: 12,
      x: 200,
      y: 100,
      toJSON: () => ({}),
      ...rect,
    });
  });
}

function getTooltipPopover(): HTMLElement | null {
  // The tooltip popover is the div inside the relative container with z-50
  return document.querySelector('[class*="z-50"][class*="rounded-lg"]');
}

describe('InfoTooltip viewport-aware positioning', () => {
  beforeEach(() => {
    // Default viewport height
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders tooltip below when ample space exists below the trigger', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Trigger is near top of viewport — plenty of room below
    mockButtonRect({ top: 100, bottom: 112 });

    fireEvent.click(screen.getByLabelText('More info'));

    const popover = getTooltipPopover();
    expect(popover).toBeInTheDocument();
    expect(popover?.className).toContain('top-full');
    expect(popover?.className).not.toContain('bottom-full');
  });

  it('renders tooltip above when trigger is near viewport bottom', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Trigger is near bottom of viewport — not enough room below
    mockButtonRect({ top: 750, bottom: 762 });

    fireEvent.click(screen.getByLabelText('More info'));

    const popover = getTooltipPopover();
    expect(popover).toBeInTheDocument();
    expect(popover?.className).toContain('bottom-full');
    expect(popover?.className).not.toContain('top-full');
  });

  it('methodology section expands correctly in above position', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        methodology="Detailed calculation method"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Near bottom — should flip above
    mockButtonRect({ top: 750, bottom: 762 });

    fireEvent.click(screen.getByLabelText('More info'));

    const popover = getTooltipPopover();
    expect(popover?.className).toContain('bottom-full');

    // Expand methodology
    fireEvent.click(screen.getByText('How is this calculated?'));
    expect(screen.getByText('Detailed calculation method')).toBeInTheDocument();

    // Still positioned above after expanding
    const popoverAfter = getTooltipPopover();
    expect(popoverAfter?.className).toContain('bottom-full');
  });

  it('outside click dismisses tooltip in both positions', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Open in above position
    mockButtonRect({ top: 750, bottom: 762 });
    fireEvent.click(screen.getByLabelText('More info'));
    expect(getTooltipPopover()).toBeInTheDocument();

    // Click outside to dismiss
    fireEvent.mouseDown(document.body);
    expect(getTooltipPopover()).not.toBeInTheDocument();

    // Open in below position
    mockButtonRect({ top: 100, bottom: 112 });
    fireEvent.click(screen.getByLabelText('More info'));
    expect(getTooltipPopover()).toBeInTheDocument();

    // Click outside to dismiss
    fireEvent.mouseDown(document.body);
    expect(getTooltipPopover()).not.toBeInTheDocument();
  });

  it('horizontal centering is maintained in both positions', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Below position
    mockButtonRect({ top: 100, bottom: 112 });
    fireEvent.click(screen.getByLabelText('More info'));
    let popover = getTooltipPopover();
    expect(popover?.className).toContain('left-1/2');
    expect(popover?.className).toContain('-translate-x-1/2');

    // Dismiss
    fireEvent.mouseDown(document.body);

    // Above position
    mockButtonRect({ top: 750, bottom: 762 });
    fireEvent.click(screen.getByLabelText('More info'));
    popover = getTooltipPopover();
    expect(popover?.className).toContain('left-1/2');
    expect(popover?.className).toContain('-translate-x-1/2');
  });

  it('biases toward flipping above when methodology is present', () => {
    render(
      <MetricCard
        label="Test Metric"
        value={42}
        tooltip="Test tooltip text"
        methodology="Detailed calculation method"
        threshold={{ green: 20, amber: 45, lowerIsBetter: true }}
      />
    );

    // Trigger in middle zone — with methodology the tooltip is taller (~200px),
    // so even with moderate space below it should flip above
    mockButtonRect({ top: 620, bottom: 632 });

    fireEvent.click(screen.getByLabelText('More info'));

    const popover = getTooltipPopover();
    expect(popover).toBeInTheDocument();
    expect(popover?.className).toContain('bottom-full');
  });
});
