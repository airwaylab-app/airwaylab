import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartViewport } from '@/hooks/use-chart-viewport';
import { useChartElementRef } from '@/hooks/use-chart-element-ref';

// ── Helpers ────────────────────────────────────────────────────

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  // Minimal getBoundingClientRect so handlers can compute fractions
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, right: 800, top: 0, bottom: 200, width: 800, height: 200,
    x: 0, y: 0, toJSON: () => ({}),
  });
  return el;
}

function fireWheel(el: HTMLElement, deltaY: number, clientX = 400) {
  const event = new WheelEvent('wheel', { deltaY, clientX, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
}

function fireDblClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

// ── Tests ──────────────────────────────────────────────────────

describe('useChartViewport — multi-element attachToElement', () => {
  const opts = { durationSeconds: 3600, dateStr: '2024-01-01' };

  it('attaches wheel listeners to multiple elements independently', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    const el1 = makeEl();
    const el2 = makeEl();

    act(() => {
      result.current.attachToElement(el1);
      result.current.attachToElement(el2);
    });

    // Zoom in on el1
    act(() => { fireWheel(el1, -100); });
    const afterEl1Zoom = result.current.visibleDurationSec;
    expect(afterEl1Zoom).toBeLessThan(3600);

    // Zoom in on el2 — both elements can trigger zoom
    act(() => { fireWheel(el2, -100); });
    expect(result.current.visibleDurationSec).toBeLessThan(afterEl1Zoom);
  });

  it('cleanup removes listeners so wheel no longer zooms', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    const el = makeEl();

    let cleanup: (() => void) | undefined;
    act(() => { cleanup = result.current.attachToElement(el); });

    act(() => { fireWheel(el, -100); });
    const afterZoom = result.current.visibleDurationSec;

    act(() => { cleanup!(); });

    act(() => { fireWheel(el, -100); });
    // Duration should not change after cleanup
    expect(result.current.visibleDurationSec).toBe(afterZoom);
  });

  it('double-click resets zoom to full range', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    const el = makeEl();

    act(() => { result.current.attachToElement(el); });
    act(() => { fireWheel(el, -100); });
    expect(result.current.isFullView).toBe(false);

    act(() => { fireDblClick(el); });
    expect(result.current.isFullView).toBe(true);
  });
});

describe('useChartViewport — dragZoomMode', () => {
  const opts = { durationSeconds: 3600, dateStr: '2024-01-01' };

  it('dragZoomMode defaults to false', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    expect(result.current.dragZoomMode).toBe(false);
  });

  it('setDragZoomMode toggles the mode', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    act(() => { result.current.setDragZoomMode(true); });
    expect(result.current.dragZoomMode).toBe(true);
    act(() => { result.current.setDragZoomMode(false); });
    expect(result.current.dragZoomMode).toBe(false);
  });

  it('dragZoomOverlay defaults to inactive', () => {
    const { result } = renderHook(() => useChartViewport(opts));
    expect(result.current.dragZoomOverlay.active).toBe(false);
  });
});

describe('useChartElementRef', () => {
  it('calls attachToElement on mount and cleanup on unmount', () => {
    const cleanup = vi.fn();
    const attach = vi.fn().mockReturnValue(cleanup);

    const { result } = renderHook(() => useChartElementRef(attach));
    const el = makeEl();

    act(() => { result.current(el); });
    expect(attach).toHaveBeenCalledWith(el);
    expect(cleanup).not.toHaveBeenCalled();

    act(() => { result.current(null); });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('cleans up previous element before attaching new one', () => {
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();
    const attach = vi.fn()
      .mockReturnValueOnce(cleanup1)
      .mockReturnValueOnce(cleanup2);

    const { result } = renderHook(() => useChartElementRef(attach));
    const el1 = makeEl();
    const el2 = makeEl();

    act(() => { result.current(el1); });
    act(() => { result.current(el2); });

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenNthCalledWith(2, el2);
  });
});
