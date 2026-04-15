/**
 * Tests for first-run onboarding UX (AIR-393)
 * Covers: FirstRunWelcome, CommunityJoinPrompt components and analytics hooks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommunityJoinPrompt } from '@/components/dashboard/community-join-prompt';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/analytics', () => ({
  events: {
    communityPromptShown: vi.fn(),
    communityPromptDismissed: vi.fn(),
    communityPromptGitHubClicked: vi.fn(),
    communityPromptDiscordClicked: vi.fn(),
  },
}));

// ── CommunityJoinPrompt ────────────────────────────────────────────────────────

describe('CommunityJoinPrompt', () => {
  const DISMISSED_KEY = 'airwaylab_community_prompt_dismissed';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders for new users (session count <= 5) who have not dismissed', () => {
    render(<CommunityJoinPrompt sessionCount={2} isDemo={false} />);
    expect(screen.getByText(/Join the AirwayLab community/i)).toBeDefined();
  });

  it('does not render when isDemo is true', () => {
    render(<CommunityJoinPrompt sessionCount={1} isDemo={true} />);
    expect(screen.queryByText(/Join the AirwayLab community/i)).toBeNull();
  });

  it('does not render when session count > 5', () => {
    render(<CommunityJoinPrompt sessionCount={6} isDemo={false} />);
    expect(screen.queryByText(/Join the AirwayLab community/i)).toBeNull();
  });

  it('does not render when already dismissed', () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    render(<CommunityJoinPrompt sessionCount={2} isDemo={false} />);
    expect(screen.queryByText(/Join the AirwayLab community/i)).toBeNull();
  });

  it('sets localStorage and hides on dismiss click', () => {
    render(<CommunityJoinPrompt sessionCount={2} isDemo={false} />);
    const dismissBtn = screen.getByRole('button', { name: /Dismiss community prompt/i });
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('1');
    expect(screen.queryByText(/Join the AirwayLab community/i)).toBeNull();
  });

  it('has accessible dismiss button with aria-label', () => {
    render(<CommunityJoinPrompt sessionCount={1} isDemo={false} />);
    expect(screen.getByRole('button', { name: /Dismiss community prompt/i })).toBeDefined();
  });

  it('renders GitHub Discussions link opening in new tab', () => {
    render(<CommunityJoinPrompt sessionCount={1} isDemo={false} />);
    const githubLink = screen.getByText(/GitHub Discussions/i).closest('a');
    expect(githubLink?.getAttribute('target')).toBe('_blank');
    expect(githubLink?.getAttribute('rel')).toContain('noopener');
  });

  it('renders Discord link opening in new tab', () => {
    render(<CommunityJoinPrompt sessionCount={1} isDemo={false} />);
    const discordLink = screen.getByText(/Discord/i).closest('a');
    expect(discordLink?.getAttribute('target')).toBe('_blank');
    expect(discordLink?.getAttribute('rel')).toContain('noopener');
  });
});
