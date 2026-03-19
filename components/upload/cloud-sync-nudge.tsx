'use client';

import { useState, useEffect } from 'react';
import { Cloud, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

const CONSENT_KEY = 'airwaylab_storage_consent';

/** Check if cloud sync consent has been granted. */
export function hasCloudSyncConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Set cloud sync consent state. */
function setCloudSyncConsent(enabled: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? '1' : '0');
  } catch { /* noop */ }
}

/**
 * Prominent nudge card shown on the dashboard when cloud sync
 * is not yet enabled. One-click to activate. Disappears after opt-in.
 */
export function CloudSyncNudge({
  onEnable,
}: {
  onEnable: () => void;
}) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Only show if not already opted in
    if (!hasCloudSyncConsent()) {
      setVisible(true);
    }
  }, [user]);

  if (!visible || !user) return null;

  const handleEnable = async () => {
    setCloudSyncConsent(true);
    setVisible(false);

    // Sync consent to server (fire-and-forget — presign also checks DB)
    try {
      await fetch('/api/files/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ consent: true }),
      });
    } catch {
      // Non-blocking — the migration backfill handles most users
    }

    onEnable();
  };

  return (
    <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.06] to-sky-500/[0.01] p-4 animate-fade-in-up">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
          <Cloud className="h-5 w-5 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Back up your SD card data to the cloud
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Securely store your raw files so you can view waveforms and re-analyse without re-uploading.
            Encrypted, EU servers, only accessible by you.
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            What gets stored?
          </button>

          {expanded && (
            <div className="mt-2 rounded-lg border border-border/30 bg-background/50 px-3 py-2.5 text-xs text-muted-foreground/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-sky-400 shrink-0" />
                <span>Your raw EDF files — encrypted at rest on EU servers</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-sky-400 shrink-0" />
                <span>Only you can access your files — delete anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-sky-400 shrink-0" />
                <span>Not shared with anyone — this is your personal backup</span>
              </div>
            </div>
          )}

          <div className="mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Cloud className="mr-1.5 h-3.5 w-3.5" />
              Enable Cloud Sync
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal toggle for settings/profile — lets users disable cloud sync.
 * Not prominent by design.
 */
export function CloudSyncToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEnabled(hasCloudSyncConsent());
  }, [user]);

  if (!user) return null;

  const toggle = async () => {
    const next = !enabled;
    setCloudSyncConsent(next);
    setEnabled(next);

    // Sync to server — revert on any failure (network error or non-OK response)
    try {
      const res = await fetch('/api/files/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ consent: next }),
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      // Revert on failure
      setCloudSyncConsent(!next);
      setEnabled(!next);
    }
  };

  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-muted-foreground">
      <div
        role="switch"
        aria-checked={enabled}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          enabled ? 'bg-sky-500' : 'bg-muted-foreground/30'
        }`}
      >
        <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
      <span>Cloud backup</span>
    </label>
  );
}
