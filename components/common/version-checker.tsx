'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-2xl">
        <div className="rounded-full bg-primary/10 p-3">
          <RefreshCw className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">New Version Available</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A new version of AirwayLab has been deployed.
            Please refresh to get the latest features and fixes.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full gap-2 shadow-glow"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Now
        </Button>
        <p className="text-[10px] text-muted-foreground/50">
          Your analysis data is saved locally and will be restored after refresh.
        </p>
      </div>
    </div>
  );
}
