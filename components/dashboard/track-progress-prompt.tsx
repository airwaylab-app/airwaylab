'use client';

import { useState, useEffect, useRef } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { events } from '@/lib/analytics';

const LS_KEY = 'airwaylab_seenReturnPrompt';
const CONTRIBUTION_DISMISS_KEY = 'airwaylab_contribute_dismissed';

interface Props {
  isDemo?: boolean;
  isNewUser?: boolean;
}

/**
 * Return prompt shown at the bottom of the Overview tab for first-time analysers.
 * Encourages users to come back tomorrow with more data.
 *
 * Hidden when:
 * - isDemo is true
 * - isNewUser is false
 * - user already dismissed (localStorage airwaylab_seenReturnPrompt)
 * - user dismissed the contribution nudge this session (don't stack prompts)
 */
export function TrackProgressPrompt({ isDemo = false, isNewUser = false }: Props) {
  // SSR-safe: all browser state initialised to hidden defaults
  const [visible, setVisible] = useState(false);
  const [showBookmarkHint, setShowBookmarkHint] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (!isNewUser || isDemo) return;

    // Don't stack with contribution nudge dismissed this session
    try {
      if (sessionStorage.getItem(CONTRIBUTION_DISMISS_KEY) === '1') return;
    } catch { /* noop */ }

    // Already dismissed permanently
    try {
      if (localStorage.getItem(LS_KEY) === '1') return;
    } catch { /* noop */ }

    setVisible(true);
    if (!tracked.current) {
      events.trackProgressShown();
      tracked.current = true;
    }
  }, [isNewUser, isDemo]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(LS_KEY, '1'); } catch { /* noop */ }
  };

  const handleBookmark = () => {
    events.trackProgressBookmarkClicked();
    setShowBookmarkHint(true);
    setTimeout(dismiss, 2500);
  };

  const handleEmailClick = () => {
    events.trackProgressEmailClicked();
    setShowEmailForm(true);
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">Track your progress</p>
              <p className="text-xs leading-relaxed text-muted-foreground mb-3">
                Upload tomorrow&apos;s data after your next therapy night to see how tonight compares.
              </p>

              {showBookmarkHint && (
                <p
                  className="text-xs text-primary mb-3 animate-fade-in-up"
                  aria-live="polite"
                >
                  Press <kbd className="rounded border border-border px-1 font-mono text-[10px]">Ctrl+D</kbd>{' '}
                  (<kbd className="rounded border border-border px-1 font-mono text-[10px]">Cmd+D</kbd> on Mac) to bookmark this page.
                </p>
              )}

              {showEmailForm ? (
                <div className="mt-1">
                  <EmailOptIn variant="inline" source="track_progress_prompt" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs"
                    onClick={handleBookmark}
                    disabled={showBookmarkHint}
                  >
                    Bookmark this page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs"
                    onClick={handleEmailClick}
                  >
                    Get an email reminder
                  </Button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => { events.trackProgressDismissed(); dismiss(); }}
            className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
