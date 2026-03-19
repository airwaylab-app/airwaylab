'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WalkthroughTooltip } from '@/components/dashboard/walkthrough-tooltip';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';
import { Compass, Sparkles } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  {
    selector: '[data-walkthrough="summary-hero"]',
    name: 'summary-hero',
    text: 'This is your headline result. Green means therapy looks effective, amber means worth monitoring, red means discuss with your clinician.',
  },
  {
    selector: '[data-walkthrough="metrics-grid"]',
    name: 'metrics-grid',
    text: 'These are your key metrics for tonight. Click any card to see how the metric has changed over time.',
  },
  {
    selector: '[data-walkthrough="tab-bar"]',
    name: 'tab-bar',
    text: 'Switch between views here. Start with Overview, then check Graphs and Trends when you\'re ready.',
  },
  {
    selector: '[data-walkthrough="night-selector"]',
    name: 'night-selector',
    text: 'Uploaded multiple nights? Use this to switch between them. The most recent night is shown first.',
  },
  {
    selector: '[data-walkthrough="next-steps"]',
    name: 'next-steps',
    text: 'When you\'re ready, share your results with your clinician or the sleep community. You can always revisit the Getting Started guide.',
  },
];

type WalkthroughPhase = 'hidden' | 'prompt' | 'touring' | 'done';

interface Props {
  isComplete: boolean;
}

export function GuidedWalkthrough({ isComplete }: Props) {
  const { profile, markWalkthroughComplete, isPaid } = useAuth();
  const [phase, setPhase] = useState<WalkthroughPhase>('hidden');
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Portal needs to mount after hydration
  useEffect(() => { setMounted(true); }, []);

  // Determine if walkthrough should show
  useEffect(() => {
    if (!isComplete || phase !== 'hidden') return;

    // Server-side check for logged-in users
    if (profile?.walkthrough_completed) return;

    // localStorage fallback for anonymous users
    try {
      if (localStorage.getItem('airwaylab_walkthrough_done') === '1') return;
    } catch { /* noop */ }

    // Show the prompt
    setPhase('prompt');
  }, [isComplete, profile?.walkthrough_completed, phase]);

  const startTour = useCallback((source: 'prompt' | 'restart') => {
    setCurrentStep(0);
    setPhase('touring');
    events.walkthroughStarted(source);
    events.walkthroughStepViewed(1, STEPS[0]!.name);
  }, []);

  const dismiss = useCallback((atStep: number) => {
    setPhase('done');
    events.walkthroughSkipped(atStep);
    markWalkthroughComplete();
  }, [markWalkthroughComplete]);

  const next = useCallback(() => {
    if (currentStep >= STEPS.length - 1) {
      // Tour complete
      setPhase('done');
      events.walkthroughCompleted();
      markWalkthroughComplete();
    } else {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      events.walkthroughStepViewed(nextIdx + 1, STEPS[nextIdx]!.name);
    }
  }, [currentStep, markWalkthroughComplete]);

  /** Allow re-starting the tour from external triggers */
  const restart = useCallback(() => {
    // Clear the server/localStorage flag so it can be re-shown
    try { localStorage.removeItem('airwaylab_walkthrough_done'); } catch { /* noop */ }
    startTour('restart');
  }, [startTour]);

  // Expose restart function globally so NextSteps can call it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, () => void>).__airwaylab_restart_walkthrough = restart;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, () => void>).__airwaylab_restart_walkthrough;
      }
    };
  }, [restart]);

  if (!mounted) return null;

  // Prompt card (inline, not a portal)
  if (phase === 'prompt') {
    return (
      <div className="animate-fade-in-up rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">First time here?</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Take a 30-second tour of your results.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={() => startTour('prompt')} className="gap-1.5">
                <Compass className="h-3 w-3" /> Show me around
              </Button>
              <button
                onClick={() => dismiss(0)}
                className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                I&apos;ll explore on my own
              </button>
            </div>
            {!isPaid && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                <Sparkles className="h-3 w-3 shrink-0 text-primary/40" />
                <span>
                  Supporters get personalized AI-powered explanations of every metric.{' '}
                  <Link href="/pricing" className="text-primary/60 hover:underline">Learn more</Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active tour (portal to body for correct z-index stacking)
  if (phase === 'touring' && currentStep < STEPS.length) {
    const step = STEPS[currentStep]!;
    return createPortal(
      <WalkthroughTooltip
        targetSelector={step.selector}
        text={step.text}
        step={currentStep + 1}
        totalSteps={STEPS.length}
        onNext={next}
        onSkip={() => dismiss(currentStep + 1)}
        isLast={currentStep === STEPS.length - 1}
      />,
      document.body,
    );
  }

  return null;
}
