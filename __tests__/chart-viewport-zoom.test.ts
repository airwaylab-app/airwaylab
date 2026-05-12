import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartViewport } from '@/hooks/use-chart-viewport';

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'isConnected', { get: () => true, configurable: true });
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 800, bottom: 200, width: 800, height: 200,
    x: 0, y: 0, toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

function fireWheel(el: HTMLElement, deltaY: number, clientX = 400) {
  const event = new WheelEvent('wheel', { deltaY, clientX, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
}

function fireDblClick(el: HTMLElement) {
  const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
}

function fireMouseDown(el: HTMLElement, clientX: number, shiftKey = false) {
  const event = new MouseEvent('mousedown', { button: 0, clientX, shiftKey, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
}

function fireMouseMove(clientX: number) {
  const event = new MouseEvent('mousemove', { clientX, bubbles: true });
  window.dispatchEvent(event);
}

function fireMouseUp() {
  const event = new MouseEvent('mouseup', { bubbles: true });
  window.dispatchEvent(event);
}

const DURATION = 3600; // 1-hour session

describe('useChartViewport — multi-element wheel zoom', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('wheel zoom works on the first chart element registered', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    act(() => { fireWheel(el, -100, 400); }); // zoom in at center

    expect(result.current.clampedEndSec).toBeLessThan(DURATION);
    expect(result.current.isFullView).toBe(false);
  });

  it('wheel zoom works on a second chart element registered after the first', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el1 = makeEl();
    const el2 = makeEl();
    act(() => {
      result.current.chartRef(el1);
      result.current.chartRef(el2);
    });

    // Zoom on the second element — previously this was broken (only first/last mounted worked)
    act(() => { fireWheel(el1, -100, 400); });

    expect(result.current.isFullView).toBe(false);
  });

  it('wheel zoom on either of three elements zooms the shared viewport', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const els = [makeEl(), makeEl(), makeEl()];
    act(() => { els.forEach((e) => result.current.chartRef(e)); });

    // Zoom on middle element
    act(() => { fireWheel(els[1]!, -100, 400); });
    const afterFirst = result.current.clampedEndSec;
    expect(afterFirst).toBeLessThan(DURATION);

    // Zoom on last element
    act(() => { fireWheel(els[2]!, -100, 400); });
    expect(result.current.clampedEndSec).toBeLessThan(afterFirst);
  });
});

describe('useChartViewport — double-click reset', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('double-click resets zoom to full view', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    // Zoom in first
    act(() => { fireWheel(el, -100, 400); });
    expect(result.current.isFullView).toBe(false);

    // Double-click resets
    act(() => { fireDblClick(el); });
    expect(result.current.isFullView).toBe(true);
  });
});

describe('useChartViewport — shift+drag range-select zoom', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('shift+drag shows drag select overlay state', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    expect(result.current.dragSelectState).toBeNull();

    act(() => { fireMouseDown(el, 200, true); }); // shift+drag start at 25%
    expect(result.current.dragSelectState).not.toBeNull();

    act(() => { fireMouseMove(400); }); // drag to 50%
    expect(result.current.dragSelectState?.widthFraction).toBeGreaterThan(0);
  });

  it('shift+drag mouseup zooms viewport to selected range', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    // Drag from 25% (x=200) to 75% (x=600) of 800px chart
    act(() => { fireMouseDown(el, 200, true); });
    act(() => { fireMouseMove(600); });
    act(() => { fireMouseUp(); });

    // Viewport should now cover the 25%–75% range of full duration
    const expectedStart = DURATION * 0.25;
    const expectedEnd = DURATION * 0.75;

    expect(result.current.clampedStartSec).toBeCloseTo(expectedStart, 0);
    expect(result.current.clampedEndSec).toBeCloseTo(expectedEnd, 0);
    expect(result.current.dragSelectState).toBeNull();
  });

  it('shift+drag smaller than 1% does not zoom', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    // Tiny drag (< 1% of 800px = 8px)
    act(() => { fireMouseDown(el, 400, true); });
    act(() => { fireMouseMove(404); }); // 4px = 0.5%
    act(() => { fireMouseUp(); });

    expect(result.current.isFullView).toBe(true);
    expect(result.current.dragSelectState).toBeNull();
  });

  it('regular drag (no shift) still pans instead of zoom-selecting', () => {
    const { result } = renderHook(() =>
      useChartViewport({ durationSeconds: DURATION, dateStr: '2024-01-01' }),
    );

    const el = makeEl();
    act(() => { result.current.chartRef(el); });

    // First zoom in so we have room to pan
    act(() => {
      result.current.zoomToPreset(1800);
    });
    const startBefore = result.current.clampedStartSec;

    // Regular drag (no shift): should pan, not zoom-select
    act(() => { fireMouseDown(el, 400, false); });
    expect(result.current.dragSelectState).toBeNull();
    act(() => { fireMouseMove(200); }); // drag left = pan right
    act(() => { fireMouseUp(); });

    // View should have panned (start moved), not zoomed
    expect(result.current.clampedStartSec).toBeGreaterThan(startBefore);
    expect(result.current.dragSelectState).toBeNull();
  });
});
