import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TrackProgressPrompt } from '@/components/dashboard/track-progress-prompt';

// Mock analytics to isolate event tracking
vi.mock('@/lib/analytics', () => ({
  events: {
    trackProgressShown: vi.fn(),
    trackProgressBookmarkClicked: vi.fn(),
    trackProgressEmailClicked: vi.fn(),
    trackProgressDismissed: vi.fn(),
    emailSubscribe: vi.fn(),
  },
}));

// Mock EmailOptIn to keep tests simple
vi.mock('@/components/common/email-opt-in', () => ({
  EmailOptIn: ({ source }: { variant: string; source: string }) => (
    <div data-testid="email-opt-in" data-source={source}>email form</div>
  ),
}));

const LS_KEY = 'airwaylab_seenReturnPrompt';
const CONTRIB_KEY = 'airwaylab_contribute_dismissed';

function setupStorage({ lsSeen = false, sessionDismissed = false } = {}) {
  localStorage.clear();
  sessionStorage.clear();
  if (lsSeen) localStorage.setItem(LS_KEY, '1');
  if (sessionDismissed) sessionStorage.setItem(CONTRIB_KEY, '1');
}

beforeEach(() => {
  vi.useFakeTimers();
  setupStorage();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

describe('TrackProgressPrompt', () => {
  it('renders for new users who have not dismissed', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    expect(screen.getByText('Track your progress')).toBeInTheDocument();
    expect(screen.getByText(/Upload tomorrow/)).toBeInTheDocument();
  });

  it('does not render for demo mode', () => {
    render(<TrackProgressPrompt isNewUser isDemo />);
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
  });

  it('does not render when isNewUser is false', () => {
    render(<TrackProgressPrompt isNewUser={false} isDemo={false} />);
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
  });

  it('does not render when already dismissed via localStorage', () => {
    setupStorage({ lsSeen: true });
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
  });

  it('does not render when contribution nudge dismissed this session', () => {
    setupStorage({ sessionDismissed: true });
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
  });

  it('shows both action buttons', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    expect(screen.getByRole('button', { name: /bookmark this page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get an email reminder/i })).toBeInTheDocument();
  });

  it('dismiss button hides the card and sets localStorage', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
    expect(localStorage.getItem(LS_KEY)).toBe('1');
  });

  it('bookmark button shows hint text and auto-dismisses', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    fireEvent.click(screen.getByRole('button', { name: /bookmark this page/i }));
    expect(screen.getByText(/Ctrl\+D/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByText('Track your progress')).not.toBeInTheDocument();
    expect(localStorage.getItem(LS_KEY)).toBe('1');
  });

  it('email button reveals email form', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    fireEvent.click(screen.getByRole('button', { name: /get an email reminder/i }));
    expect(screen.getByTestId('email-opt-in')).toBeInTheDocument();
    expect(screen.getByTestId('email-opt-in')).toHaveAttribute('data-source', 'track_progress_prompt');
  });

  it('email button hides action buttons once clicked', () => {
    render(<TrackProgressPrompt isNewUser isDemo={false} />);
    fireEvent.click(screen.getByRole('button', { name: /get an email reminder/i }));
    expect(screen.queryByRole('button', { name: /bookmark this page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get an email reminder/i })).not.toBeInTheDocument();
  });
});
