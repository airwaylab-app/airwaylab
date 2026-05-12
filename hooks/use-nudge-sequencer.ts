'use client';

import { useState, useEffect, useCallback } from 'react';

export type NudgeId = 'walkthrough' | 'contribution' | 'cloud-sync' | 'upgrade' | 'email-opt-in';

interface SequencerState {
  firstSessionComplete: boolean;
  completedNudges: NudgeId[];
}

export interface UseNudgeSequencerInput {
  isAnalysisComplete: boolean;
  isAuthenticated: boolean;
  tier: string;
  hasContributeOptIn: boolean;
  hasCloudSyncConsent: boolean;
  hasEmailOptIn: boolean;
  walkthroughDone: boolean;
}

export interface UseNudgeSequencerResult {
  isFirstSession: boolean;
  activeNudge: NudgeId | null;
  advanceNudge: (id: NudgeId) => void;
  onWalkthroughStep1Complete: () => void;
}

const STATE_KEY = 'airwaylab_nudge_sequencer_state';
const RESULTS_KEY = 'airwaylab_results';

function loadState(): SequencerState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SequencerState>;
      return {
        firstSessionComplete: parsed.firstSessionComplete ?? false,
        completedNudges: Array.isArray(parsed.completedNudges) ? (parsed.completedNudges as NudgeId[]) : [],
      };
    }
  } catch { /* noop */ }
  return { firstSessionComplete: false, completedNudges: [] };
}

function saveState(state: SequencerState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch { /* noop */ }
}

export function useNudgeSequencer({
  isAnalysisComplete,
  isAuthenticated,
  tier,
  hasContributeOptIn,
  hasCloudSyncConsent,
  hasEmailOptIn,
  walkthroughDone,
}: UseNudgeSequencerInput): UseNudgeSequencerResult {
  // First session: airwaylab_results key absent when hook initializes (before new results saved)
  const [isFirstSession] = useState(() => {
    try {
      return localStorage.getItem(RESULTS_KEY) === null;
    } catch {
      return false;
    }
  });

  const [state, setState] = useState<SequencerState>(() => loadState());
  const [walkthroughStep1Done, setWalkthroughStep1Done] = useState(false);
  const [activeNudge, setActiveNudge] = useState<NudgeId | null>(null);

  // Mark first session complete once analysis finishes
  useEffect(() => {
    if (!isAnalysisComplete || !isFirstSession || state.firstSessionComplete) return;
    const next: SequencerState = { ...state, firstSessionComplete: true };
    setState(next);
    saveState(next);
  }, [isAnalysisComplete, isFirstSession, state]);

  // Determine active nudge based on current state
  useEffect(() => {
    if (!isAnalysisComplete) {
      setActiveNudge(null);
      return;
    }

    const completed = state.completedNudges;

    // Step 1: walkthrough — activate if not previously done and not yet completed this session
    if (!walkthroughDone && !completed.includes('walkthrough')) {
      setActiveNudge('walkthrough');
      return;
    }

    // Walkthrough gate: contribution only eligible after step 1 acknowledged or returning user
    const walkthroughGatePassed = walkthroughDone || walkthroughStep1Done;
    if (!walkthroughGatePassed) {
      setActiveNudge(null);
      return;
    }

    // Step 2: contribution
    if (!hasContributeOptIn && !completed.includes('contribution')) {
      setActiveNudge('contribution');
      return;
    }

    // Step 3: cloud sync (authenticated users only)
    if (isAuthenticated && !hasCloudSyncConsent && !completed.includes('cloud-sync')) {
      setActiveNudge('cloud-sync');
      return;
    }

    // Step 4: upgrade — authenticated users only, suppressed on first session
    if (isAuthenticated && !isFirstSession && tier === 'community' && !completed.includes('upgrade')) {
      setActiveNudge('upgrade');
      return;
    }

    // Step 5: email opt-in (authenticated users only)
    if (isAuthenticated && !hasEmailOptIn && !completed.includes('email-opt-in')) {
      setActiveNudge('email-opt-in');
      return;
    }

    setActiveNudge(null);
  }, [
    isAnalysisComplete,
    state.completedNudges,
    walkthroughDone,
    walkthroughStep1Done,
    hasContributeOptIn,
    hasCloudSyncConsent,
    isAuthenticated,
    isFirstSession,
    tier,
    hasEmailOptIn,
  ]);

  const advanceNudge = useCallback((id: NudgeId) => {
    setState((prev) => {
      if (prev.completedNudges.includes(id)) return prev;
      const next: SequencerState = {
        ...prev,
        completedNudges: [...prev.completedNudges, id],
      };
      saveState(next);
      return next;
    });
  }, []);

  const onWalkthroughStep1Complete = useCallback(() => {
    setWalkthroughStep1Done(true);
  }, []);

  return {
    isFirstSession,
    activeNudge,
    advanceNudge,
    onWalkthroughStep1Complete,
  };
}
