'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

interface Props {
  previousNights: number;
  onRegister: () => void;
}

/**
 * Banner for returning anonymous users above the upload area.
 * Shown when localStorage has past results but user is not signed in.
 * Dismissible once per session.
 */
export function ReturningUserNudge({ previousNights, onRegister }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    // Check if already dismissed this session
    try {
      if (sessionStorage.getItem('airwaylab_nudge_dismissed') === '1') {
        setDismissed(true);
        return;
      }
    } catch { /* noop */ }

    if (!tracked.current) {
      events.returningUserNudgeShown(previousNights);
      tracked.current = true;
    }
  }, [previousNights]);

  if (dismissed || previousNights === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem('airwaylab_nudge_dismissed', '1'); } catch { /* noop */ }
  };

  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
      <div className="flex items-start gap-2.5 pr-6 sm:pr-0">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          You&apos;ve analysed <span className="font-medium text-foreground">{previousNights} night{previousNights !== 1 ? 's' : ''}</span> with
          AirwayLab. Create a free account to keep your data safe, get AI insights, and skip
          re-uploading your SD card.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            events.returningUserNudgeClicked();
            onRegister();
          }}
          className="shrink-0 gap-1.5"
        >
          Create free account
        </Button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-muted-foreground/80 transition-colors hover:text-muted-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
