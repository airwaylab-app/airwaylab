'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Disclaimer() {
  const [state, setState] = useState<'loading' | 'visible' | 'dismissed'>('loading');

  useEffect(() => {
    try {
      // Migrate old key → new key
      const oldVal = localStorage.getItem('airwaylab-disclaimer-dismissed');
      if (oldVal !== null) {
        localStorage.setItem('airwaylab_disclaimer_dismissed', oldVal);
        localStorage.removeItem('airwaylab-disclaimer-dismissed');
      }
      const wasDismissed = localStorage.getItem('airwaylab_disclaimer_dismissed') === 'true';
      setState(wasDismissed ? 'dismissed' : 'visible');
    } catch {
      // localStorage unavailable (Safari private browsing, quota exceeded)
      setState('visible');
    }
  }, []);

  if (state !== 'visible') return null;

  return (
    <div className="border-y border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 sm:items-center">
        <div className="flex items-start gap-2.5 text-xs text-amber-300/90 sm:items-center sm:text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 sm:mt-0" />
          <span>
            Not medical advice. AirwayLab is not a medical device and is not FDA/CE cleared.
            Always consult qualified healthcare providers for treatment decisions.{' '}
            <a href="/terms#medical-disclaimer" className="underline underline-offset-2 hover:text-amber-200">Learn more</a>
          </span>
        </div>
        <button
          onClick={() => {
            setState('dismissed');
            try {
              localStorage.setItem('airwaylab_disclaimer_dismissed', 'true');
            } catch {
              // Dismiss works for this session even if storage fails
            }
          }}
          className="shrink-0 rounded-md p-1 text-amber-500/70 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
          aria-label="Dismiss disclaimer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
