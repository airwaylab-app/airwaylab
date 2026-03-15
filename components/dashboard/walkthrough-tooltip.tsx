'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  targetSelector: string;
  text: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  isLast?: boolean;
}

export function WalkthroughTooltip({
  targetSelector,
  text,
  step,
  totalSteps,
  onNext,
  onSkip,
  isLast = false,
}: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipSide, setTooltipSide] = useState<'below' | 'above'>('below');

  const recalc = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

    // Determine tooltip side: prefer below, switch to above if near bottom
    const spaceBelow = window.innerHeight - rect.bottom;
    setTooltipSide(spaceBelow < 200 ? 'above' : 'below');

    // Scroll into view if needed
    if (rect.top < 80 || rect.bottom > window.innerHeight - 20) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetSelector]);

  useEffect(() => {
    recalc();
    // Small delay to re-calc after scroll settles
    const timer = setTimeout(recalc, 350);
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc);
    };
  }, [recalc]);

  // Keyboard: Escape to skip, Enter/Space on focused buttons
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSkip]);

  if (!pos) return null;

  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top - 6,
    left: pos.left - 6,
    width: pos.width + 12,
    height: pos.height + 12,
    borderRadius: '12px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    pointerEvents: 'none',
  };

  const tooltipTop = tooltipSide === 'below'
    ? pos.top + pos.height + 16
    : pos.top - 16;

  // Clamp tooltip left so it doesn't overflow viewport
  const tooltipWidth = 340;
  const rawLeft = pos.left + pos.width / 2 - tooltipWidth / 2;
  const clampedLeft = Math.max(12, Math.min(rawLeft, window.innerWidth - tooltipWidth - 12));

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: clampedLeft,
    width: tooltipWidth,
    zIndex: 9999,
    ...(tooltipSide === 'below'
      ? { top: tooltipTop }
      : { bottom: window.innerHeight - tooltipTop }),
  };

  return (
    <>
      {/* Spotlight overlay */}
      <div style={spotlightStyle} aria-hidden="true" />

      {/* Click catcher -- clicking outside advances */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={onNext}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={`Tour step ${step} of ${totalSteps}`}
        style={tooltipStyle}
        className="animate-fade-in-up rounded-xl border border-border/50 bg-card p-4 shadow-lg"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">
            {step} of {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              Skip tour
            </button>
            <Button size="sm" onClick={onNext}>
              {isLast ? 'Got it' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
