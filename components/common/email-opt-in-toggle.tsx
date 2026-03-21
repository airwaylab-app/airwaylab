'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Bell, BellOff, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

/**
 * Email opt-in toggle for authenticated users.
 * Sets email_opt_in on the user's profile. Email sequences are triggered
 * by user actions (upload, signup), not by the opt-in toggle itself.
 */
export function EmailOptInToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user || !profile) return null;

  const handleToggle = async () => {
    const newValue = !profile.email_opt_in;
    setLoading(true);

    try {
      const res = await fetch('/api/email/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ opt_in: newValue }),
      });

      if (res.ok) {
        await refreshProfile();
        if (newValue) {
          events.emailSubscribe('opt-in-toggle');
        }
      }
    } catch {
      // Silently fail -- profile state will be stale but harmless
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-1.5 text-xs"
      title={profile.email_opt_in ? 'Email updates enabled' : 'Enable email updates'}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : profile.email_opt_in ? (
        <Bell className="h-3 w-3 text-primary" />
      ) : (
        <BellOff className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">
        {profile.email_opt_in ? 'Emails on' : 'Emails off'}
      </span>
    </Button>
  );
}

/**
 * One-time email opt-in nudge banner.
 * Shows after first analysis for authenticated users who haven't opted in.
 */
export function EmailOptInNudge() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('airwaylab_email_nudge_dismissed') === '1';
    } catch {
      return false;
    }
  });

  if (!user || !profile || profile.email_opt_in || dismissed) return null;

  const handleOptIn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ opt_in: true }),
      });

      if (res.ok) {
        await refreshProfile();
        events.emailSubscribe('opt-in-nudge');
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('airwaylab_email_nudge_dismissed', '1');
    } catch { /* noop */ }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
      <div className="flex items-start gap-2.5">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm text-foreground font-medium">
            Get therapy progress updates by email?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;ll email you when your trends change, explain what your metrics mean, and share tips for getting the most from your therapy. No health data in emails.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Not now
        </button>
        <Button size="sm" onClick={handleOptIn} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes, sign me up'}
        </Button>
      </div>
    </div>
  );
}
