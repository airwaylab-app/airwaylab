'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Build ID is set at build time in next.config — unique per deployment
const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? '';

/**
 * Polls /api/version and shows a full-screen overlay when a newer
 * version is deployed. Compares build IDs (which change on every build)
 * so users never run stale code.
 */
export function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID) return; // No build ID — skip checking

    const check = async () => {
      try {
        const res = await fetch('/api/version', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.buildId && data.buildId !== CURRENT_BUILD_ID) {
          setUpdateAvailable(true);
        }
      } catch {
        // Network errors are non-critical — skip this check
      }
    };

    // First check after 30s (don't block initial load)
    const initialTimer = setTimeout(check, 30_000);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card px-4 py-3 shadow-xl">
        <div className="rounded-full bg-primary/10 p-1.5">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium">New version available</p>
          <p className="text-[11px] text-muted-foreground">Your data is saved locally.</p>
        </div>
        <Button size="sm" className="ml-2 gap-1.5" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="ml-1 rounded p-1 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          aria-label="Dismiss update notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
