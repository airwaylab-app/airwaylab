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
const MIN_VISIBLE_SECONDS = 20;
export const PAN_STEP_FRACTION = 0.25;
const ZOOM_FACTOR = 0.8;

// ── Types ──────────────────────────────────────────────────────

interface ChartViewportOpts {
  /** Total waveform duration in seconds */
  durationSeconds: number;
  dateStr: string;
}

export interface DragSelectState {
  leftFraction: number;
  widthFraction: number;
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
  /** Non-null while the user is shift+dragging to select a zoom range. */
  dragSelectState: DragSelectState | null;
}

// ── Hook ───────────────────────────────────────────────────────

export function useChartViewport(opts: ChartViewportOpts): ChartViewportReturn {
  const { durationSeconds, dateStr } = opts;

  // Viewport state: time in seconds
  const [viewStartSec, setViewStartSec] = useState(0);
  const [viewEndSec, setViewEndSec] = useState(Infinity);

  // Drag-range-select overlay state (shift+drag)
  const [dragSelectState, setDragSelectState] = useState<DragSelectState | null>(null);
  const dragSelectStateRef = useRef<DragSelectState | null>(null);
  dragSelectStateRef.current = dragSelectState;

  // Refs for drag-to-pan
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });

  // Refs for drag-range-select
  const isDragSelecting = useRef(false);
  const dragSelectStartFraction = useRef(0);
  const dragSelectActiveEl = useRef<HTMLElement | null>(null);

  // Refs for touch gestures
  const isTouchPanning = useRef(false);
  const isPinching = useRef(false);
  const touchStartX = useRef(0);
  const pinchStartDist = useRef(0);
  const touchStartView = useRef({ start: 0, end: 0 });

  // Set of all registered chart elements (one per chart component using this viewport)
  const elementsRef = useRef<Set<HTMLElement>>(new Set());
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

  // ── Chart ref callback — registers multiple chart elements ──

  // Store navigation functions in refs so event handlers stay stable
  const zoomInRef = useRef(zoomIn);
  const zoomOutRef = useRef(zoomOut);
  zoomInRef.current = zoomIn;
  zoomOutRef.current = zoomOut;

  const resetZoomRef = useRef(resetZoom);
  resetZoomRef.current = resetZoom;

  const panByRef = useRef(panBy);
  panByRef.current = panBy;

  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  // Each chart element calls chartRef(el) on mount and chartRef(null) on unmount.
  // We track all connected elements so wheel events fire on whichever chart the
  // cursor is over — not just the last one to mount.
  const chartRef = useCallback((el: HTMLElement | null) => {
    if (el) {
      elementsRef.current.add(el);
    } else {
      // Remove any element that is no longer in the DOM
      for (const e of elementsRef.current) {
        if (!e.isConnected) elementsRef.current.delete(e);
      }
    }
    setElementVersion((v) => v + 1);
  }, []);

  // ── Attach wheel + drag + touch listeners to all chart elements ──

  useEffect(() => {
    const elements = [...elementsRef.current].filter((e) => e.isConnected);
    if (elements.length === 0) return;

    // Window-level drag tracking: only one element active at a time
    let activePanEl: HTMLElement | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current && activePanEl) {
        const rect = activePanEl.getBoundingClientRect();
        const dx = e.clientX - dragStartX.current;
        const visible = dragStartView.current.end - dragStartView.current.start;
        const timeDelta = (-dx / rect.width) * visible;
        const newStart = Math.max(0, Math.min(
          dragStartView.current.start + timeDelta,
          durationRef.current - visible,
        ));
        setViewStartSec(newStart);
        setViewEndSec(newStart + visible);
      } else if (isDragSelecting.current && dragSelectActiveEl.current) {
        const rect = dragSelectActiveEl.current.getBoundingClientRect();
        const cur = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const left = Math.min(dragSelectStartFraction.current, cur);
        const width = Math.abs(cur - dragSelectStartFraction.current);
        const next = { leftFraction: left, widthFraction: width };
        dragSelectStateRef.current = next;
        setDragSelectState(next);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        if (activePanEl) {
          activePanEl.style.cursor = '';
          activePanEl = null;
        }
      }
      if (isDragSelecting.current) {
        isDragSelecting.current = false;
        const sel = dragSelectStateRef.current;
        // Only zoom if the selection is at least 1% of the chart width
        if (sel && sel.widthFraction > 0.01) {
          const cs = clampedRef.current.start;
          const ce = clampedRef.current.end;
          const visible = ce - cs;
          setViewStartSec(Math.max(0, cs + sel.leftFraction * visible));
          setViewEndSec(Math.min(durationRef.current, cs + (sel.leftFraction + sel.widthFraction) * visible));
        }
        if (dragSelectActiveEl.current) {
          dragSelectActiveEl.current.style.cursor = '';
          dragSelectActiveEl.current = null;
        }
        setDragSelectState(null);
      }
    };

    const getTouchDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    // Per-element listeners: wheel, dblclick, mousedown, touch
    const perElementCleanups = elements.map((el) => {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const centerFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (e.deltaY < 0) zoomInRef.current(centerFraction);
        else zoomOutRef.current(centerFraction);
      };

      const handleDblClick = (e: MouseEvent) => {
        e.preventDefault();
        resetZoomRef.current();
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (e.shiftKey) {
          // Shift+drag: range-select zoom (OSCAR/SleepHQ style)
          isDragSelecting.current = true;
          isDragging.current = false;
          const rect = el.getBoundingClientRect();
          dragSelectStartFraction.current = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          dragSelectActiveEl.current = el;
          el.style.cursor = 'crosshair';
          setDragSelectState({ leftFraction: dragSelectStartFraction.current, widthFraction: 0 });
          e.preventDefault();
        } else {
          // Regular drag: pan
          isDragging.current = true;
          isDragSelecting.current = false;
          activePanEl = el;
          dragStartX.current = e.clientX;
          dragStartView.current = {
            start: clampedRef.current.start,
            end: clampedRef.current.end,
          };
          el.style.cursor = 'grabbing';
          e.preventDefault();
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          isPinching.current = true;
          isTouchPanning.current = false;
          pinchStartDist.current = getTouchDistance(e.touches[0]!, e.touches[1]!);
          touchStartView.current = {
            start: clampedRef.current.start,
            end: clampedRef.current.end,
          };
          e.preventDefault();
        } else if (e.touches.length === 1) {
          isTouchPanning.current = true;
          isPinching.current = false;
          touchStartX.current = e.touches[0]!.clientX;
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
          const dist = getTouchDistance(e.touches[0]!, e.touches[1]!);
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
          const dx = e.touches[0]!.clientX - touchStartX.current;
          const visible = touchStartView.current.end - touchStartView.current.start;
          const timeDelta = (-dx / rect.width) * visible;
          const newStart = Math.max(0, Math.min(
            touchStartView.current.start + timeDelta,
            durationRef.current - visible,
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
          touchStartX.current = e.touches[0]!.clientX;
          touchStartView.current = {
            start: clampedRef.current.start,
            end: clampedRef.current.end,
          };
        }
      };

      el.addEventListener('wheel', handleWheel, { passive: false });
      el.addEventListener('dblclick', handleDblClick);
      el.addEventListener('mousedown', handleMouseDown);
      el.addEventListener('touchstart', handleTouchStart, { passive: false });
      el.addEventListener('touchmove', handleTouchMove, { passive: false });
      el.addEventListener('touchend', handleTouchEnd);

      return () => {
        el.removeEventListener('wheel', handleWheel);
        el.removeEventListener('dblclick', handleDblClick);
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
      };
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      perElementCleanups.forEach((fn) => fn());
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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
    dragSelectState,
  };
}
