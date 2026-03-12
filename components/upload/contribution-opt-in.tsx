'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Heart, Shield } from 'lucide-react';
import {
  migrateConsentKey,
  getConsentState,
  hasExplicitConsent,
  setConsentState,
} from './contribution-consent-utils';

/**
 * Contribution opt-in component shown during the upload flow.
 *
 * Two modes:
 * - **Compact:** When user has previously opted in, shows a green checkmark
 *   with "Contributing data, thank you" and a subtle "Manage" link.
 * - **Full:** When user has NOT opted in (or explicitly opted out and wants
 *   to change), shows the full checkbox with description.
 */
export function ContributionOptIn({
  onChange,
}: {
  onChange: (optedIn: boolean) => void;
}) {
  const [checked, setChecked] = useState(() => {
    if (typeof window === 'undefined') return false;
    migrateConsentKey();
    return getConsentState();
  });

  // Whether the user had already opted in when the component mounted
  const [wasOptedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getConsentState() && hasExplicitConsent();
  });

  // Controls whether the compact bar is expanded to show the full checkbox
  const [expanded, setExpanded] = useState(false);

  // Notify parent of initial state
  useEffect(() => {
    onChange(checked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onChange(next);
    setConsentState(next);
  };

  // Compact mode: user previously opted in, not expanded
  if (wasOptedIn && !expanded) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-5 py-3.5 transition-all">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {checked ? 'Contributing data, thank you' : 'Not contributing'}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <Shield className="h-3 w-3 shrink-0" />
            <span>Fully anonymous · cannot be traced back to you</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 rounded px-2 py-1.5 text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground hover:bg-muted/30"
        >
          {checked ? 'Manage' : 'Change'}
        </button>
      </div>
    );
  }

  // Full mode: first-time user or expanded from compact
  return (
    <div>
      <div
        className="flex items-start gap-3.5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] px-5 py-4 cursor-pointer select-none transition-all hover:border-primary/40 hover:from-primary/[0.1] hover:to-primary/[0.04]"
        onClick={toggle}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 bg-background'
        }`}>
          {checked && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Help fellow PAP users — share your data
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Your anonymised scores and breathing patterns help build the largest PAP therapy dataset
            — so everyone can benchmark their therapy and researchers can train AI to improve treatment
            for millions.
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Shield className="h-3 w-3" />
            <span>No personal info shared · Fully anonymous · Cannot be traced back to you</span>
          </div>
        </div>
      </div>
      {/* If expanded from compact mode, allow collapsing back */}
      {wasOptedIn && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded px-2 py-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
