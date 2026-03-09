'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cloud, Shield, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';

const CONSENT_KEY = 'airwaylab_storage_consent';

/**
 * Storage consent checkbox shown during the upload flow.
 * Only visible to authenticated supporter/champion tier users.
 * Syncs consent to server-side profile.
 */
export function StorageConsent({
  onChange,
}: {
  onChange: (consented: boolean) => void;
}) {
  const { user, tier } = useAuth();
  const [checked, setChecked] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load initial state from localStorage + server
  useEffect(() => {
    if (!user || !canAccess('raw_storage', tier)) return;

    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === '1') {
        setChecked(true);
        onChange(true);
      }
    } catch { /* noop */ }

    // Also check server state
    fetch('/api/files/consent', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.consent) {
          setChecked(true);
          onChange(true);
          try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* noop */ }
        }
      })
      .catch(() => { /* noop */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tier]);

  const toggle = useCallback(async () => {
    const next = !checked;
    setChecked(next);
    onChange(next);

    try {
      localStorage.setItem(CONSENT_KEY, next ? '1' : '0');
    } catch { /* noop */ }

    // Sync to server
    setSyncing(true);
    try {
      await fetch('/api/files/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ consent: next }),
      });
    } catch {
      // Revert on failure
      setChecked(!next);
      onChange(!next);
      try { localStorage.setItem(CONSENT_KEY, !next ? '1' : '0'); } catch { /* noop */ }
    } finally {
      setSyncing(false);
    }
  }, [checked, onChange]);

  // Don't render for non-eligible users
  if (!user || !canAccess('raw_storage', tier)) return null;

  return (
    <div
      className={`flex items-start gap-3.5 rounded-xl border bg-gradient-to-br px-5 py-4 cursor-pointer select-none transition-all ${
        checked
          ? 'border-sky-500/30 from-sky-500/[0.08] to-sky-500/[0.02] hover:border-sky-500/40'
          : 'border-border/50 from-card/50 to-card/20 hover:border-border/80'
      }`}
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={syncing}
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
          ? 'border-sky-500 bg-sky-500 text-white'
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
          <Cloud className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold text-foreground">
            Store my SD card data in the cloud
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Securely store your raw SD card files so you can view waveforms and re-analyze
          without re-uploading. Your data is encrypted and only accessible by you.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Encrypted at rest
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            EU servers · GDPR compliant
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Delete anytime
          </span>
        </div>
      </div>
    </div>
  );
}
