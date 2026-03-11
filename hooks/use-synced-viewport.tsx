'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useChartViewport } from './use-chart-viewport';
import type React from 'react';

// ── Context shape ────────────────────────────────────────────

export interface SyncedViewportValue {
  viewStart: number;
  viewEnd: number;
  clampedStart: number;
  clampedEnd: number;
  isFullView: boolean;
  minimapLeft: number;
  minimapWidth: number;
  panBy: (fraction: number) => void;
  zoomIn: (centerFraction?: number) => void;
  zoomOut: (centerFraction?: number) => void;
  resetZoom: () => void;
  zoomToPreset: (seconds: number) => void;
  setViewStart: React.Dispatch<React.SetStateAction<number>>;
  setViewEnd: React.Dispatch<React.SetStateAction<number>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  chartRef: (el: HTMLElement | null) => void;
  dataLength: number;
  bucketSeconds: number;
}

const SyncedViewportContext = createContext<SyncedViewportValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

interface ProviderProps {
  dataLength: number;
  bucketSeconds: number;
  dateStr: string;
  children: ReactNode;
}

export function SyncedViewportProvider({
  dataLength,
  bucketSeconds,
  dateStr,
  children,
}: ProviderProps) {
  const viewport = useChartViewport({ dataLength, bucketSeconds, dateStr });

  const value = useMemo<SyncedViewportValue>(() => ({
    ...viewport,
    dataLength,
    bucketSeconds,
  }), [viewport, dataLength, bucketSeconds]);

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
