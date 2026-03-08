'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import packageJson from '../../package.json';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Polls /api/version and shows a full-screen overlay when a newer
 * version is deployed. Forces reload so users never run stale code.
 */
export function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    const currentVersion = packageJson.version;

    const check = async () => {
      try {
        const res = await fetch('/api/version', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== currentVersion) {
          setNewVersion(data.version);
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
            AirwayLab {newVersion} is available. You&apos;re running {packageJson.version}.
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
