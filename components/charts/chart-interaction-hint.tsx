'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useSyncedViewport } from '@/hooks/use-synced-viewport';

const STORAGE_KEY = 'airwaylab_chart_hint_dismissed';

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // localStorage full or unavailable — hint will show again next session
  }
}

export function ChartInteractionHint() {
  const viewport = useSyncedViewport();
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Show hint only if not previously dismissed
  useEffect(() => {
    if (!isDismissed()) {
      setVisible(true);
    }
    // Detect touch capability
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Auto-dismiss when user zooms or pans (viewport changes from full view)
  const dismiss = useCallback(() => {
    setVisible(false);
    persistDismiss();
  }, []);

  useEffect(() => {
    if (visible && !viewport.isFullView) {
      dismiss();
    }
  }, [visible, viewport.isFullView, dismiss]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[11px] text-muted-foreground">
      <span>
        {isTouch
          ? 'Pinch to zoom \u00b7 Swipe to pan \u00b7 Tap time presets above for quick ranges'
          : 'Scroll to zoom \u00b7 Drag to pan \u00b7 Use time presets above for quick ranges'}
      </span>
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
        aria-label="Dismiss chart controls hint"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
