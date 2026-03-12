'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { events } from '@/lib/analytics';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: 'single' | 'all', remember: boolean) => void;
  nightsCount: number;
  /** If true, skip consent text and show only scope picker */
  simplified?: boolean;
}

/**
 * Modal for share link consent + scope selection.
 *
 * Full mode: shows privacy explanation + scope picker + remember checkbox.
 * Simplified mode: scope picker only (user already consented).
 */
export function ShareConsentModal({
  open,
  onClose,
  onConfirm,
  nightsCount,
  simplified = false,
}: Props) {
  const [scope, setScope] = useState<'single' | 'all'>('single');
  const [remember, setRemember] = useState(false);
  const focusTrapRef = useFocusTrap(open);

  if (!open) return null;

  const handleConfirm = () => {
    if (scope === 'single') {
      events.shareOptinSingle();
    } else {
      events.shareOptinAll();
    }
    if (remember) {
      events.shareOptinRemembered();
    }
    onConfirm(scope, remember);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share your analysis"
    >
      <div
        ref={focusTrapRef}
        className="relative mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-semibold">
          {simplified ? 'Choose what to share' : 'Share Your Analysis'}
        </h2>

        {!simplified && (
          <div className="mb-5 space-y-2">
            <p className="text-sm text-muted-foreground">
              To create a share link, your analysis results will be stored on our
              servers for 30 days.
            </p>
            <p className="text-sm text-muted-foreground">
              Raw SD card data is never uploaded — only processed metrics and
              scores.
            </p>
          </div>
        )}

        {/* Scope selection */}
        <div className="mb-4 space-y-2">
          {!simplified && (
            <p className="text-xs font-medium text-muted-foreground">
              Choose what to share:
            </p>
          )}

          <button
            type="button"
            onClick={() => setScope('single')}
            className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              scope === 'single'
                ? 'border-primary/50 bg-primary/[0.06]'
                : 'border-border/50 bg-card/50 hover:border-border'
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                scope === 'single'
                  ? 'border-primary'
                  : 'border-muted-foreground/40'
              }`}
            >
              {scope === 'single' && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">This night only</p>
              <p className="text-xs text-muted-foreground">
                Only the currently selected night&apos;s analysis.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setScope('all')}
            className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
              scope === 'all'
                ? 'border-primary/50 bg-primary/[0.06]'
                : 'border-border/50 bg-card/50 hover:border-border'
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                scope === 'all'
                  ? 'border-primary'
                  : 'border-muted-foreground/40'
              }`}
            >
              {scope === 'all' && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">All uploaded nights</p>
              <p className="text-xs text-muted-foreground">
                All {nightsCount} night{nightsCount !== 1 ? 's' : ''} from this
                session. Your consultant can see trends across nights.
              </p>
            </div>
          </button>
        </div>

        {/* Remember checkbox */}
        <label className="mb-5 flex cursor-pointer items-center gap-2.5">
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              remember
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40 bg-background'
            }`}
          >
            {remember && (
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="text-xs text-muted-foreground">
            Remember my choice for future shares
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Share
          </Button>
        </div>

        {/* Privacy footer */}
        {!simplified && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
            <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
            <p className="text-[11px] text-muted-foreground/80">
              EU servers · Encrypted · Expires in 30 days
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
