'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useChartViewport, type ChartViewportReturn } from './use-chart-viewport';

// ── Context shape ────────────────────────────────────────────

type SyncedViewportValue = ChartViewportReturn;

const SyncedViewportContext = createContext<SyncedViewportValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

interface ProviderProps {
  durationSeconds: number;
  dateStr: string;
  children: ReactNode;
}

export function SyncedViewportProvider({
  durationSeconds,
  dateStr,
  children,
}: ProviderProps) {
  const viewport = useChartViewport({ durationSeconds, dateStr });

  const value = useMemo<SyncedViewportValue>(() => ({
    ...viewport,
  }), [viewport]);

  return (
    <SyncedViewportContext.Provider value={value}>
      {children}
    </SyncedViewportContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useSyncedViewport(): SyncedViewportValue {
  const ctx = useContext(SyncedViewportContext);
  if (!ctx) {
    throw new Error('useSyncedViewport must be used within a SyncedViewportProvider');
  }
  return ctx;
}
