'use client';

import { useEffect } from 'react';
import { events } from '@/lib/analytics';

/** Fires the "Getting Started Viewed" Plausible event on mount. */
export function GettingStartedTracker() {
  useEffect(() => {
    events.gettingStartedViewed();
  }, []);
  return null;
}
