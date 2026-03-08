'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { THRESHOLDS, type ThresholdDef } from '@/lib/thresholds';
import {
  loadOverrides,
  saveOverrides,
  clearOverrides,
  getMergedThresholds,
  type ThresholdOverrides,
} from '@/lib/threshold-overrides';

interface ThresholdsContextValue {
  thresholds: Record<string, ThresholdDef>;
  overrides: ThresholdOverrides;
  setOverride: (key: string, def: ThresholdDef) => void;
  resetOne: (key: string) => void;
  resetAll: () => void;
  isCustomised: (key: string) => boolean;
}

const ThresholdsContext = createContext<ThresholdsContextValue>({
  thresholds: THRESHOLDS,
  overrides: {},
  setOverride: () => {},
  resetOne: () => {},
  resetAll: () => {},
  isCustomised: () => false,
});

export function ThresholdsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ThresholdOverrides>({});

  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  const thresholds = getMergedThresholds(overrides);

  const setOverride = useCallback((key: string, def: ThresholdDef) => {
    setOverrides((prev) => {
      const next = { ...prev, [key]: def };
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetOne = useCallback((key: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    clearOverrides();
    setOverrides({});
  }, []);

  const isCustomised = useCallback(
    (key: string) => key in overrides,
    [overrides]
  );

  return (
    <ThresholdsContext.Provider
      value={{ thresholds, overrides, setOverride, resetOne, resetAll, isCustomised }}
    >
      {children}
    </ThresholdsContext.Provider>
  );
}

/** Returns the merged thresholds (defaults + user overrides). */
export function useThresholds(): Record<string, ThresholdDef> {
  return useContext(ThresholdsContext).thresholds;
}

/** Returns actions to modify threshold overrides. */
export function useThresholdActions() {
  const { setOverride, resetOne, resetAll, isCustomised } = useContext(ThresholdsContext);
  return { setOverride, resetOne, resetAll, isCustomised };
}
