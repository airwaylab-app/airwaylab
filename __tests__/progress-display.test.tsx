import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ProgressDisplay } from '@/components/upload/progress-display';

describe('ProgressDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders progress bar with correct percentage', () => {
    render(<ProgressDisplay current={50} total={100} stage="Parsing settings" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows standard estimate text initially', () => {
    render(<ProgressDisplay current={10} total={100} stage="Analyzing night 1" />);
    expect(
      screen.getByText('Usually 30–90 seconds depending on SD card size'),
    ).toBeInTheDocument();
  });

  it('swaps to overdue message after 90 seconds', async () => {
    render(<ProgressDisplay current={10} total={100} stage="Analyzing night 1" />);

    expect(
      screen.getByText('Usually 30–90 seconds depending on SD card size'),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(
      screen.getByText('Taking a little longer than usual — hang tight, still working...'),
    ).toBeInTheDocument();
  });

  it('resets overdue flag when stage changes', async () => {
    const { rerender } = render(
      <ProgressDisplay current={10} total={100} stage="Analyzing night 1" />,
    );

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(
      screen.getByText('Taking a little longer than usual — hang tight, still working...'),
    ).toBeInTheDocument();

    act(() => {
      rerender(<ProgressDisplay current={20} total={100} stage="Finalizing" />);
    });

    expect(
      screen.getByText('Usually 30–90 seconds depending on SD card size'),
    ).toBeInTheDocument();
  });

  it('does not show research note when pct <= 30', () => {
    render(<ProgressDisplay current={30} total={100} stage="Parsing settings" isAuthenticated={false} />);
    expect(
      screen.queryByText(/contribute your anonymised scores/),
    ).not.toBeInTheDocument();
  });

  it('shows research note when pct > 30 and not authenticated', () => {
    render(<ProgressDisplay current={31} total={100} stage="Parsing settings" isAuthenticated={false} />);
    expect(
      screen.getByText(/contribute your anonymised scores/),
    ).toBeInTheDocument();
  });
});
