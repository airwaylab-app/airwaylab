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

export const MIN_VISIBLE_POINTS = 20;
export const PAN_STEP_FRACTION = 0.25;
export const ZOOM_FACTOR = 0.8;

// ── Types ──────────────────────────────────────────────────────

interface ChartViewportOpts {
  dataLength: number;
  bucketSeconds: number;
  dateStr: string;
}

interface ChartViewportReturn {
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
}

// ── Hook ───────────────────────────────────────────────────────

export function useChartViewport(opts: ChartViewportOpts): ChartViewportReturn {
  const { dataLength, bucketSeconds, dateStr } = opts;

  // Viewport state: indices into the data array
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(Infinity);

  // Refs for drag-to-pan
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });

  // Ref for the chart container element + version counter to trigger effect
  const elementRef = useRef<HTMLElement | null>(null);
  const [elementVersion, setElementVersion] = useState(0);

  // Store latest clamped values in a ref so event listeners always
  // see current values without needing to re-attach.
  const clampedRef = useRef({ start: 0, end: 0 });

  // Reset viewport when dateStr changes
  useEffect(() => {
    setViewStart(0);
    setViewEnd(Infinity);
  }, [dateStr]);

  // ── Clamping ────────────────────────────────────────────────

  const clampedStart = Math.max(0, Math.min(viewStart, dataLength - MIN_VISIBLE_POINTS));
  const clampedEnd = Math.min(dataLength, Math.max(viewEnd, clampedStart + MIN_VISIBLE_POINTS));
  const isFullView = clampedStart === 0 && clampedEnd >= dataLength;

  // Keep ref in sync
  clampedRef.current = { start: clampedStart, end: clampedEnd };

  // ── Minimap ─────────────────────────────────────────────────

  const minimapLeft = dataLength > 0 ? (clampedStart / dataLength) * 100 : 0;
  const minimapWidth = dataLength > 0 ? ((clampedEnd - clampedStart) / dataLength) * 100 : 100;

  // ── Navigation helpers ──────────────────────────────────────

  const panBy = useCallback((fraction: number) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visibleCount = ce - cs;
    const step = Math.max(1, Math.round(visibleCount * fraction));
    const newStart = Math.max(0, Math.min(cs + step, dataLength - MIN_VISIBLE_POINTS));
    setViewStart(newStart);
    setViewEnd(Math.min(dataLength, newStart + visibleCount));
  }, [dataLength]);

  const zoomIn = useCallback((centerFraction = 0.5) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visibleCount = ce - cs;
    const newCount = Math.max(MIN_VISIBLE_POINTS, Math.round(visibleCount * ZOOM_FACTOR));
    const reduction = visibleCount - newCount;
    const leftReduction = Math.round(reduction * centerFraction);
    const rightReduction = reduction - leftReduction;
    setViewStart(Math.max(0, cs + leftReduction));
    setViewEnd(Math.min(dataLength, ce - rightReduction));
  }, [dataLength]);

  const zoomOut = useCallback((centerFraction = 0.5) => {
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const visibleCount = ce - cs;
    const newCount = Math.min(dataLength, Math.round(visibleCount / ZOOM_FACTOR));
    const expansion = newCount - visibleCount;
    const leftExpansion = Math.round(expansion * centerFraction);
    const rightExpansion = expansion - leftExpansion;
    setViewStart(Math.max(0, cs - leftExpansion));
    setViewEnd(Math.min(dataLength, ce + rightExpansion));
  }, [dataLength]);

  const resetZoom = useCallback(() => {
    setViewStart(0);
    setViewEnd(Infinity);
  }, []);

  const zoomToPreset = useCallback((seconds: number) => {
    const bs = bucketSeconds > 0 ? bucketSeconds : 2;
    const pointsNeeded = Math.max(MIN_VISIBLE_POINTS, Math.round(seconds / bs));
    const cs = clampedRef.current.start;
    const ce = clampedRef.current.end;
    const currentCenter = Math.round((cs + ce) / 2);
    const halfPoints = Math.round(pointsNeeded / 2);
    const tentativeStart = Math.max(0, currentCenter - halfPoints);
    const newEnd = Math.min(dataLength, tentativeStart + pointsNeeded);
    const newStart = newEnd - pointsNeeded < 0 ? 0 : newEnd - pointsNeeded;
    setViewStart(newStart);
    setViewEnd(newEnd);
  }, [dataLength, bucketSeconds]);

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

  const dataLengthRef = useRef(dataLength);
  dataLengthRef.current = dataLength;

  const chartRef = useCallback((el: HTMLElement | null) => {
    if (elementRef.current === el) return;
    elementRef.current = el;
    setElementVersion((v) => v + 1);
  }, []);

  // ── Attach wheel + drag listeners to chart element ──────────

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

    // Drag to pan
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
      const visibleCount = dragStartView.current.end - dragStartView.current.start;
      const indexDelta = Math.round((-dx / rect.width) * visibleCount);
      const newStart = Math.max(0, Math.min(
        dragStartView.current.start + indexDelta,
        dataLengthRef.current - visibleCount
      ));
      setViewStart(newStart);
      setViewEnd(newStart + visibleCount);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        el.style.cursor = 'grab';
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [elementVersion]);

  return {
    viewStart,
    viewEnd,
    clampedStart,
    clampedEnd,
    isFullView,
    minimapLeft,
    minimapWidth,
    panBy,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToPreset,
    setViewStart,
    setViewEnd,
    handleKeyDown,
    chartRef,
  };
}
