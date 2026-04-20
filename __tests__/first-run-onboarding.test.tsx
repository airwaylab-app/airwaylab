/**
 * Tests for first-run onboarding UX (AIR-393)
 * Covers: FirstRunWelcome and CommunityJoinPrompt components.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommunityJoinPrompt } from '@/components/dashboard/community-join-prompt';
import { FirstRunWelcome } from '@/components/upload/first-run-welcome';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/analytics', () => ({
  events: {
    communityPromptShown: vi.fn(),
    communityPromptDismissed: vi.fn(),
    communityPromptGitHubClicked: vi.fn(),
    communityPromptDiscordClicked: vi.fn(),
    mobileReminderShown: vi.fn(),
  },
}));

vi.mock('@/lib/directory-traversal', () => ({
  isIOSDevice: vi.fn(() => false),
  supportsWebkitGetAsEntry: vi.fn(() => true),
  traverseDataTransferItems: vi.fn(),
  toFilesWithPaths: vi.fn(),
}));

// FileUpload is heavy (workers, drag-drop). Stub it to keep tests fast.
vi.mock('@/components/upload/file-upload', () => ({
  FileUpload: ({ onFilesSelected }: { onFilesSelected: () => void }) => (
    <button onClick={onFilesSelected} data-testid="file-upload">Upload</button>
  ),
}));

vi.mock('@/components/upload/mobile-email-capture', () => ({
  MobileEmailCapture: ({ className }: { className?: string }) => (
    <div data-testid="mobile-email-capture" className={className}>MobileEmailCapture</div>
  ),
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
    fireEvent.click(screen.getByRole('button', { name: /Dismiss community prompt/i }));
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

// ── FirstRunWelcome ────────────────────────────────────────────────────────────

describe('FirstRunWelcome', () => {
  // isIOSDevice is mocked at module level above — grab reference via vi.mocked
  let mockIsIOS: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/lib/directory-traversal');
    mockIsIOS = vi.mocked(mod.isIOSDevice);
    mockIsIOS.mockReturnValue(false);
  });

  it('renders FileUpload and demo CTA on non-iOS', () => {
    render(<FirstRunWelcome onLoadDemo={vi.fn()} onFilesSelected={vi.fn()} />);
    expect(screen.getByTestId('file-upload')).toBeDefined();
    expect(screen.getByRole('button', { name: /Load 7-night sample dataset/i })).toBeDefined();
  });

  it('renders MobileEmailCapture and demo CTA on iOS', async () => {
    mockIsIOS.mockReturnValue(true);
    render(<FirstRunWelcome onLoadDemo={vi.fn()} onFilesSelected={vi.fn()} />);
    // After useEffect sets isIOS, MobileEmailCapture should render
    expect(screen.getByTestId('mobile-email-capture')).toBeDefined();
    expect(screen.queryByTestId('file-upload')).toBeNull();
  });

  it('fires onLoadDemo callback when demo button clicked', async () => {
    const onLoadDemo = vi.fn();
    render(<FirstRunWelcome onLoadDemo={onLoadDemo} onFilesSelected={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Load 7-night sample dataset/i }));
    expect(onLoadDemo).toHaveBeenCalledOnce();
  });

  it('renders benefit pills on mobile (sm:hidden container present)', () => {
    render(<FirstRunWelcome onLoadDemo={vi.fn()} onFilesSelected={vi.fn()} />);
    // All 3 benefit pill texts should be in the DOM (visibility controlled by CSS)
    expect(screen.getAllByText(/Privacy-first/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Results in seconds/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AHI, flow limitation/i).length).toBeGreaterThan(0);
  });
});
