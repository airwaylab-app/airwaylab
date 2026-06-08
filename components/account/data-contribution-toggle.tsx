'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { setConsentState } from '@/components/upload/contribution-consent-utils';

/**
 * Minimal account-settings control for anonymised research data contribution.
 *
 * Withdrawal must be as easy as granting (GDPR Art 7(3)) but is intentionally quiet -
 * a single settings toggle, not nagged elsewhere. The server flag
 * (profiles.data_contribution_consent) is the source of truth and is enforced by the
 * contribute-* routes; localStorage is kept in sync only as a UI cache. Withdrawal is
 * future-only: already-contributed anonymised data is retained.
 */
export function DataContributionToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!user || !profile) return null;

  const enabled = profile.data_contribution_consent;

  const toggle = async () => {
    if (busy) return;
    const next = !enabled;
    setBusy(true);
    try {
      const res = await fetch('/api/consent-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          consentType: 'data_contribution',
          action: next ? 'granted' : 'withdrawn',
        }),
      });
      if (!res.ok) throw new Error('Server error');
      setConsentState(next); // keep the localStorage UI cache in sync
      await refreshProfile();
    } catch {
      // Leave state unchanged on failure; the toggle reflects the (unchanged) server flag.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-3 cursor-pointer text-sm text-muted-foreground">
        <div
          role="switch"
          aria-checked={enabled}
          aria-label="Contribute anonymised data to research"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-sky-500' : 'bg-muted-foreground/30'
          } ${busy ? 'opacity-60' : ''}`}
        >
          <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </div>
        <span>Contribute anonymised data to research</span>
      </label>
      <p className="text-xs text-muted-foreground/70 pl-12">
        Turning this off stops future sharing. Data already contributed is anonymised and stays.
      </p>
    </div>
  );
}
