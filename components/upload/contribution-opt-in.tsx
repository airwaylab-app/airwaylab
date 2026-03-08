'use client';

import { useState, useEffect } from 'react';
import { Heart, Shield } from 'lucide-react';

const OPTED_IN_KEY = 'airwaylab-contribute-optin';

/**
 * Contribution opt-in checkbox shown during the upload flow.
 * Pre-checked by default. Stores preference in localStorage.
 */
export function ContributionOptIn({
  onChange,
}: {
  onChange: (optedIn: boolean) => void;
}) {
  const [checked, setChecked] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(OPTED_IN_KEY);
      // Default to true (opt-in) if never set
      return stored !== '0';
    } catch {
      return true;
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
      className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/[0.03] px-4 py-3 cursor-pointer select-none"
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
      <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground/30 bg-background'
      }`}>
        {checked && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">Contribute anonymised data to research</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Share your analysis scores (no raw data, no personal info) to help build the largest open CPAP dataset.
        </p>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Shield className="h-2.5 w-2.5" />
          <span>Only anonymised metrics · Cannot be traced back to you</span>
        </div>
      </div>
    </div>
  );
}
