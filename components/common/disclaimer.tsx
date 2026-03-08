'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Disclaimer() {
  const [state, setState] = useState<'loading' | 'visible' | 'dismissed'>('loading');

  useEffect(() => {
    const wasDismissed = localStorage.getItem('airwaylab-disclaimer-dismissed') === 'true';
    setState(wasDismissed ? 'dismissed' : 'visible');
  }, []);

  if (state !== 'visible') return null;

  return (
    <div className="border-y border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 sm:items-center">
        <div className="flex items-start gap-2.5 text-xs text-amber-300/90 sm:items-center sm:text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 sm:mt-0" />
          <span>
            Not medical advice. AirwayLab is a free research tool. Always consult
            qualified healthcare providers for treatment decisions.
          </span>
        </div>
        <button
          onClick={() => {
            setState('dismissed');
            localStorage.setItem('airwaylab-disclaimer-dismissed', 'true');
          }}
          className="shrink-0 rounded-md p-1 text-amber-500/70 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
