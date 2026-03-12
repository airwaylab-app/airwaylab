'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type React from 'react';

// ── Constants ──────────────────────────────────────────────────

export const ZOOM_PRESETS = [
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '2h', seconds: 7200 },
] as const;

/** Minimum visible time window in seconds (~20s shows individual breaths) */
export const MIN_VISIBLE_SECONDS = 20;
export const PAN_STEP_FRACTION = 0.25;
export const ZOOM_FACTOR = 0.8;

// ── Types ──────────────────────────────────────────────────────

interface ChartViewportOpts {
  /** Total waveform duration in seconds */
  durationSeconds: number;
  dateStr: string;
}

export interface ChartViewportReturn {
  viewStartSec: number;
  viewEndSec: number;
  clampedStartSec: number;
  clampedEndSec: number;
  visibleDurationSec: number;
  isFullView: boolean;
  durationSeconds: number;
  minimapLeft: number;
  minimapWidth: number;
  panBy: (fraction: number) => void;
  zoomIn: (centerFraction?: number) => void;
  zoomOut: (centerFraction?: number) => void;
  resetZoom: () => void;
  zoomToPreset: (seconds: number) => void;
  setViewStartSec: React.Dispatch<React.SetStateAction<number>>;
  setViewEndSec: React.Dispatch<React.SetStateAction<number>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  chartRef: (el: HTMLElement | null) => void;
}

// ── Hook ───────────────────────────────────────────────────────

export function useChartViewport(opts: ChartViewportOpts): ChartViewportReturn {
  const { durationSeconds, dateStr } = opts;

  // Viewport state: time in seconds
  const [viewStartSec, setViewStartSec] = useState(0);
  const [viewEndSec, setViewEndSec] = useState(Infinity);

  // Refs for drag-to-pan
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });

  // Refs for touch gestures
  const isTouchPanning = useRef(false);
  const isPinching = useRef(false);
  const touchStartX = useRef(0);
  const pinchStartDist = useRef(0);
  const touchStartView = useRef({ start: 0, end: 0 });

  // Ref for the chart container element + version counter to trigger effect
  const elementRef = useRef<HTMLElement | null>(null);
  const [elementVersion, setElementVersion] = useState(0);

  // Store latest clamped values in a ref so event listeners always
  // see current values without needing to re-attach.
  const clampedRef = useRef({ start: 0, end: 0 });

  // Reset viewport when dateStr changes
  useEffect(() => {
    setViewStartSec(0);
    setViewEndSec(Infinity);
  }, [dateStr]);

  // ── Clamping ────────────────────────────────────────────────

  const clampedStartSec = Math.max(0, Math.min(viewStartSec, durationSeconds - MIN_VISIBLE_SECONDS));
  const clampedEndSec = Math.min(durationSeconds, Math.max(viewEndSec, clampedStartSec + MIN_VISIBLE_SECONDS));
  const visibleDurationSec = clampedEndSec - clampedStartSec;
  const isFullView = clampedStartSec === 0 && clampedEndSec >= durationSeconds;

  // Keep ref in sync
  clampedRef.current = { start: clampedStartSec, end: clampedEndSec };

  // ── Minimap ─────────────────────────────────────────────────

  const minimapLeft = durationSeconds > 0 ? (clampedStartSec / durationSeconds) * 100 : 0;
  const minimapWidth = durationSeconds > 0 ? (visibleDurationSec / durationSeconds) * 100 : 100;

  // ── Navigation helpers ──────────────────────────────────────

  const panBy = useCallback((fraction: number) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visible = ce - cs;
    const step = Math.max(1, visible * fraction);
    const newStart = Math.max(0, Math.min(cs + step, durationSeconds - MIN_VISIBLE_SECONDS));
    setViewStartSec(newStart);
    setViewEndSec(Math.min(durationSeconds, newStart + visible));
  }, [durationSeconds]);

  const zoomIn = useCallback((centerFraction = 0.5) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visible = ce - cs;
    const newVisible = Math.max(MIN_VISIBLE_SECONDS, visible * ZOOM_FACTOR);
    const reduction = visible - newVisible;
    const leftReduction = reduction * centerFraction;
    const rightReduction = reduction - leftReduction;
    setViewStartSec(Math.max(0, cs + leftReduction));
    setViewEndSec(Math.min(durationSeconds, ce - rightReduction));
  }, [durationSeconds]);

  const zoomOut = useCallback((centerFraction = 0.5) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visible = ce - cs;
    const newVisible = Math.min(durationSeconds, visible / ZOOM_FACTOR);
    const expansion = newVisible - visible;
    const leftExpansion = expansion * centerFraction;
    const rightExpansion = expansion - leftExpansion;
    setViewStartSec(Math.max(0, cs - leftExpansion));
    setViewEndSec(Math.min(durationSeconds, ce + rightExpansion));
  }, [durationSeconds]);

  const resetZoom = useCallback(() => {
    setViewStartSec(0);
    setViewEndSec(Infinity);
  }, []);

  const zoomToPreset = useCallback((seconds: number) => {
    const targetVisible = Math.max(MIN_VISIBLE_SECONDS, seconds);
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const currentCenter = (cs + ce) / 2;
    const halfVisible = targetVisible / 2;
    const tentativeStart = Math.max(0, currentCenter - halfVisible);
    const newEnd = Math.min(durationSeconds, tentativeStart + targetVisible);
    const newStart = newEnd - targetVisible < 0 ? 0 : newEnd - targetVisible;
    setViewStartSec(newStart);
    setViewEndSec(newEnd);
  }, [durationSeconds]);

  // ── Keyboard navigation ─────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        panBy(-PAN_STEP_FRACTION);
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        panBy(PAN_STEP_FRACTION);
        break;
      case 'ArrowUp':
      case '+':
      case '=':
        e.preventDefault();
        e.stopPropagation();
        zoomIn();
        break;
      case 'ArrowDown':
      case '-':
        e.preventDefault();
        e.stopPropagation();
        zoomOut();
        break;
      case 'Escape':
      case '0':
        e.preventDefault();
        e.stopPropagation();
        resetZoom();
        break;
    }
  }, [panBy, zoomIn, zoomOut, resetZoom]);

  // ── Chart ref callback ──────────────────────────────────────

  // Store navigation functions in refs so event handlers stay stable
  const zoomInRef = useRef(zoomIn);
  const zoomOutRef = useRef(zoomOut);
  zoomInRef.current = zoomIn;
  zoomOutRef.current = zoomOut;

  const panByRef = useRef(panBy);
  panByRef.current = panBy;

  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  const chartRef = useCallback((el: HTMLElement | null) => {
    if (elementRef.current === el) return;
    elementRef.current = el;
    setElementVersion((v) => v + 1);
  }, []);

  // ── Attach wheel + drag + touch listeners to chart element ──

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Wheel zoom (passive: false to allow preventDefault)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const centerFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (e.deltaY < 0) {
        zoomInRef.current(centerFraction);
      } else {
        zoomOutRef.current(centerFraction);
      }
    };

    // Drag to pan (maps pixel delta to time delta)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartView.current = {
        start: clampedRef.current.start,
        end: clampedRef.current.end,
      };
      el.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - dragStartX.current;
      const visible = dragStartView.current.end - dragStartView.current.start;
      const timeDelta = (-dx / rect.width) * visible;
      const newStart = Math.max(0, Math.min(
        dragStartView.current.start + timeDelta,
        durationRef.current - visible
      ));
      setViewStartSec(newStart);
      setViewEndSec(newStart + visible);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        el.style.cursor = 'grab';
      }
    };

    // Touch gesture handlers
    const getTouchDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching.current = true;
        isTouchPanning.current = false;
        pinchStartDist.current = getTouchDistance(e.touches[0], e.touches[1]);
        touchStartView.current = {
          start: clampedRef.current.start,
          end: clampedRef.current.end,
        };
        e.preventDefault();
      } else if (e.touches.length === 1) {
        isTouchPanning.current = true;
        isPinching.current = false;
        touchStartX.current = e.touches[0].clientX;
        touchStartView.current = {
          start: clampedRef.current.start,
          end: clampedRef.current.end,
        };
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching.current && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchStartDist.current;
        if (ratio > 1.05) {
          zoomInRef.current(0.5);
          pinchStartDist.current = dist;
        } else if (ratio < 0.95) {
          zoomOutRef.current(0.5);
          pinchStartDist.current = dist;
        }
      } else if (isTouchPanning.current && e.touches.length === 1) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const dx = e.touches[0].clientX - touchStartX.current;
        const visible = touchStartView.current.end - touchStartView.current.start;
        const timeDelta = (-dx / rect.width) * visible;
        const newStart = Math.max(0, Math.min(
          touchStartView.current.start + timeDelta,
          durationRef.current - visible
        ));
        setViewStartSec(newStart);
        setViewEndSec(newStart + visible);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isTouchPanning.current = false;
        isPinching.current = false;
      } else if (e.touches.length === 1 && isPinching.current) {
        isPinching.current = false;
        isTouchPanning.current = true;
        touchStartX.current = e.touches[0].clientX;
        touchStartView.current = {
          start: clampedRef.current.start,
          end: clampedRef.current.end,
        };
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementVersion]);

  return {
    viewStartSec,
    viewEndSec,
    clampedStartSec,
    clampedEndSec,
    visibleDurationSec,
    isFullView,
    durationSeconds,
    minimapLeft,
    minimapWidth,
    panBy,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToPreset,
    setViewStartSec,
    setViewEndSec,
    handleKeyDown,
    chartRef,
  };
}
