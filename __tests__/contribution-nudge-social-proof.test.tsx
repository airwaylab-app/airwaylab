import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContributionNudgeDialog } from '@/components/upload/contribution-nudge-dialog';

// Mock the focus trap hook — it just returns a ref
vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

// Helpers
function mockFetchStats(stats: { totalContributions: number; totalContributedNights: number }) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(stats),
  });
}

function mockFetchFailure() {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
}

function mockFetchZero() {
  mockFetchStats({ totalContributions: 0, totalContributedNights: 0 });
}

const defaultProps = {
  nightCount: 59,
  onContribute: vi.fn(),
  onDismiss: vi.fn(),
};

describe('ContributionNudgeDialog social proof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without social proof when stats fetch fails', async () => {
    mockFetchFailure();
    render(<ContributionNudgeDialog {...defaultProps} />);

    // Dialog renders
    expect(screen.getByText(/Help improve sleep analysis/)).toBeInTheDocument();

    // Wait for fetch to settle, then verify no social proof
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText(/people have contributed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/person has contributed/)).not.toBeInTheDocument();
  });

  it('renders social proof line when totalContributions > 0', async () => {
    mockFetchStats({ totalContributions: 42, totalContributedNights: 1280 });
    render(<ContributionNudgeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/people have contributed/)).toBeInTheDocument();
    });

    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/1,280/)).toBeInTheDocument();
  });

  it('hides social proof when totalContributions is 0', async () => {
    mockFetchZero();
    render(<ContributionNudgeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.queryByText(/people have contributed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/person has contributed/)).not.toBeInTheDocument();
  });

  it('uses singular grammar for 1 person and 1 night', async () => {
    mockFetchStats({ totalContributions: 1, totalContributedNights: 1 });
    render(<ContributionNudgeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/person has contributed/)).toBeInTheDocument();
    });

    // Should use "night" not "nights" — check the parent span's full text
    expect(screen.getByText(/night so far$/)).toBeInTheDocument();
    expect(screen.queryByText(/nights so far/)).not.toBeInTheDocument();
  });

  it('uses plural grammar for multiple people and nights', async () => {
    mockFetchStats({ totalContributions: 42, totalContributedNights: 1280 });
    render(<ContributionNudgeDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/people have contributed/)).toBeInTheDocument();
    });

    expect(screen.getByText(/nights so far/)).toBeInTheDocument();
  });

  it('contribute and dismiss callbacks work regardless of stats state', async () => {
    mockFetchStats({ totalContributions: 10, totalContributedNights: 50 });
    const onContribute = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ContributionNudgeDialog
        nightCount={59}
        onContribute={onContribute}
        onDismiss={onDismiss}
      />
    );

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText(/people have contributed/)).toBeInTheDocument();
    });

    // Click contribute
    fireEvent.click(screen.getByRole('button', { name: /share.*unlock/i }));
    expect(onContribute).toHaveBeenCalledOnce();

    // Click dismiss
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
