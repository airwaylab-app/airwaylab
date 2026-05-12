import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNudgeSequencer } from '@/hooks/use-nudge-sequencer';

const RESULTS_KEY = 'airwaylab_results';
const STATE_KEY = 'airwaylab_nudge_sequencer_state';

const defaults = {
  isAnalysisComplete: true,
  isAuthenticated: false,
  tier: 'community',
  hasContributeOptIn: false,
  hasCloudSyncConsent: false,
  hasEmailOptIn: false,
  walkthroughDone: false,
};

function renderSequencer(overrides?: Partial<typeof defaults>) {
  return renderHook(() => useNudgeSequencer({ ...defaults, ...overrides }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('first-session detection', () => {
  it('returns isFirstSession=true when airwaylab_results is absent at mount', () => {
    const { result } = renderSequencer();
    expect(result.current.isFirstSession).toBe(true);
  });

  it('returns isFirstSession=false when airwaylab_results exists at mount', () => {
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ nights: [] }));
    const { result } = renderSequencer();
    expect(result.current.isFirstSession).toBe(false);
  });
});

describe('initial active nudge', () => {
  it('activates walkthrough on first session when not done', () => {
    const { result } = renderSequencer();
    expect(result.current.activeNudge).toBe('walkthrough');
  });

  it('returns null when analysis is not complete', () => {
    const { result } = renderSequencer({ isAnalysisComplete: false });
    expect(result.current.activeNudge).toBeNull();
  });

  it('skips walkthrough for returning user (walkthroughDone=true)', () => {
    // First session (no RESULTS_KEY) so upgrade is suppressed — only contribution is next
    // but with contribute opted in too → null
    const { result } = renderSequencer({ walkthroughDone: true, hasContributeOptIn: true });
    // walkthrough done, contribute opted in, no auth, first session → null
    expect(result.current.activeNudge).toBeNull();
  });

  it('moves to contribution after walkthrough dismissed when step1 acknowledged', () => {
    const { result } = renderSequencer();
    expect(result.current.activeNudge).toBe('walkthrough');

    act(() => { result.current.advanceNudge('walkthrough'); });
    // gate still closed — no step1 yet → null
    expect(result.current.activeNudge).toBeNull();

    act(() => { result.current.onWalkthroughStep1Complete(); });
    expect(result.current.activeNudge).toBe('contribution');
  });
});

describe('walkthrough gates contribution', () => {
  it('does not show contribution before walkthrough gate opens', () => {
    const { result } = renderSequencer();
    act(() => { result.current.advanceNudge('walkthrough'); });
    expect(result.current.activeNudge).toBeNull();
  });

  it('opens contribution after scroll gate (onWalkthroughStep1Complete)', () => {
    const { result } = renderSequencer();
    act(() => { result.current.advanceNudge('walkthrough'); });
    act(() => { result.current.onWalkthroughStep1Complete(); });
    expect(result.current.activeNudge).toBe('contribution');
  });

  it('opens contribution immediately for returning user (walkthroughDone=true)', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({ walkthroughDone: true });
    expect(result.current.activeNudge).toBe('contribution');
  });
});

describe('queue advancement', () => {
  it('advances to cloud-sync after contribution (authenticated)', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: true,
    });
    expect(result.current.activeNudge).toBe('contribution');
    act(() => { result.current.advanceNudge('contribution'); });
    expect(result.current.activeNudge).toBe('cloud-sync');
  });

  it('skips cloud-sync for unauthenticated users', () => {
    // First session (no RESULTS_KEY) so upgrade is suppressed after contribution
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: false,
    });
    act(() => { result.current.advanceNudge('contribution'); });
    // No auth → cloud-sync skipped; upgrade suppressed (first session); email skipped (no auth) → null
    expect(result.current.activeNudge).toBeNull();
  });

  it('advances to upgrade after cloud-sync (returning session)', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: true,
    });
    act(() => { result.current.advanceNudge('contribution'); });
    act(() => { result.current.advanceNudge('cloud-sync'); });
    expect(result.current.activeNudge).toBe('upgrade');
  });

  it('advances to email-opt-in after upgrade (authenticated, no email)', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: true,
      hasEmailOptIn: false,
    });
    act(() => { result.current.advanceNudge('contribution'); });
    act(() => { result.current.advanceNudge('cloud-sync'); });
    act(() => { result.current.advanceNudge('upgrade'); });
    expect(result.current.activeNudge).toBe('email-opt-in');
  });
});

describe('upgrade suppression on first session', () => {
  it('suppresses upgrade on first session (airwaylab_results absent)', () => {
    // First session: results key absent
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: true,
      hasContributeOptIn: true,
      hasCloudSyncConsent: true,
    });
    // isFirstSession=true → upgrade skipped
    expect(result.current.activeNudge).toBe('email-opt-in');
  });

  it('shows upgrade on returning session (airwaylab_results present)', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({
      walkthroughDone: true,
      isAuthenticated: true,
      hasContributeOptIn: true,
      hasCloudSyncConsent: true,
    });
    expect(result.current.activeNudge).toBe('upgrade');
  });
});

describe('state persistence', () => {
  it('persists completedNudges to localStorage', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({ walkthroughDone: true });
    act(() => { result.current.advanceNudge('contribution'); });
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}');
    expect(saved.completedNudges).toContain('contribution');
  });

  it('does not duplicate a nudge in completedNudges', () => {
    localStorage.setItem(RESULTS_KEY, 'x');
    const { result } = renderSequencer({ walkthroughDone: true });
    act(() => { result.current.advanceNudge('contribution'); });
    act(() => { result.current.advanceNudge('contribution'); });
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}');
    expect(saved.completedNudges.filter((n: string) => n === 'contribution')).toHaveLength(1);
  });
});
