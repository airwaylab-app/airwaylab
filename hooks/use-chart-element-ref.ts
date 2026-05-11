'use client';

import { useCallback, useRef } from 'react';

/**
 * Returns a stable ref callback that calls `attachToElement` when an element
 * mounts and invokes the returned cleanup when it unmounts. Designed to work
 * with the multi-element `attachToElement` API on `useChartViewport`.
 */
export function useChartElementRef(
  attachToElement: (el: HTMLElement) => () => void,
): (el: HTMLElement | null) => void {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback(
    (el: HTMLElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (el) {
        cleanupRef.current = attachToElement(el);
      }
    },
    [attachToElement],
  );
}
