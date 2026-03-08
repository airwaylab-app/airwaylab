'use client';

import { useState, useEffect } from 'react';
import { Heart, Shield } from 'lucide-react';

const OPTED_IN_KEY = 'airwaylab-contribute-optin';

/**
 * Contribution opt-in checkbox shown during the upload flow.
 * Unchecked by default. Stores preference in localStorage.
 */
export function ContributionOptIn({
  onChange,
}: {
  onChange: (optedIn: boolean) => void;
}) {
  const [checked, setChecked] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(OPTED_IN_KEY);
      // Default to false (opt-out) if never set
      return stored === '1';
    } catch {
      return false;
    }
  });

  // Notify parent of initial state
  useEffect(() => {
    onChange(checked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onChange(next);
    try {
      localStorage.setItem(OPTED_IN_KEY, next ? '1' : '0');
    } catch { /* noop */ }
  };

  return (
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
            Help fellow CPAP users — share your scores
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Your anonymised analysis scores help us build the first open CPAP dataset — so everyone
          can benchmark their therapy and researchers can improve treatment for millions.
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <Shield className="h-3 w-3" />
          <span>No raw data shared · Fully anonymous · Cannot be traced back to you</span>
        </div>
      </div>
    </div>
  );
}
