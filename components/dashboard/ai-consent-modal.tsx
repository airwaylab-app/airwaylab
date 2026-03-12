'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Shield, ExternalLink, X } from 'lucide-react';

const CONSENT_KEY = 'airwaylab_ai_insights_consent';

/**
 * Returns whether the user has previously given AI insights consent.
 */
export function hasAIInsightsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'granted';
}

/**
 * Saves the AI insights consent state.
 */
export function setAIInsightsConsent(granted: boolean): void {
  localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
}

interface AIConsentModalProps {
  open: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

/**
 * Modal that explains what data is sent to Claude for AI insights and
 * requires explicit consent before the first API call.
 *
 * Shown once — consent is persisted in localStorage.
 */
export function AIConsentModal({ open, onConsent, onDecline }: AIConsentModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay for enter animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const handleConsent = useCallback(() => {
    setAIInsightsConsent(true);
    // Fire-and-forget: log consent to server audit trail
    fetch('/api/consent-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ consentType: 'ai_insights', action: 'granted' }),
    }).catch(() => { /* non-blocking */ });
    onConsent();
  }, [onConsent]);

  const handleDecline = useCallback(() => {
    setAIInsightsConsent(false);
    onDecline();
  }, [onDecline]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <button
          onClick={handleDecline}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 id="ai-consent-title" className="text-base font-semibold text-foreground">
            AI-Powered Insights
          </h2>
        </div>

        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          AI insights use Anthropic&rsquo;s Claude to analyse your therapy data and find patterns
          the rule-based system might miss.
        </p>

        <div className="mb-4 rounded-lg border border-border/50 bg-muted/20 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            What is sent to Claude
          </h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              Aggregate scores (Glasgow, WAT, NED, oximetry)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              Machine settings (pressure, EPR, mask type)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              Night notes you entered (if any)
            </li>
          </ul>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
            <Shield className="h-3 w-3 shrink-0" />
            <span>Raw waveforms and per-breath data are never sent.</span>
          </div>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-muted-foreground/70">
          Data is processed by Anthropic (US) under their{' '}
          <a
            href="https://www.anthropic.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80"
          >
            privacy policy <ExternalLink className="h-2.5 w-2.5" />
          </a>
          . See our{' '}
          <a
            href="/privacy"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Privacy Policy
          </a>{' '}
          for full details. You can withdraw consent at any time.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            No thanks
          </button>
          <button
            onClick={handleConsent}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Enable AI Insights
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
