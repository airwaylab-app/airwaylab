'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth/auth-context';
import { X, Mail, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const focusTrapRef = useFocusTrap(open);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      const { error: signInError } = await signIn(trimmed);
      setLoading(false);

      if (signInError) {
        Sentry.captureMessage(`Auth modal sign-in error: ${signInError}`, {
          level: 'warning',
          tags: { context: 'auth-modal' },
          extra: { emailDomain: trimmed.split('@')[1] },
        });

        if (signInError.toLowerCase().includes('rate limit') || signInError.toLowerCase().includes('too many')) {
          setError('Too many sign-in attempts. Please wait a minute and try again.');
        } else if (signInError.toLowerCase().includes('invalid') && signInError.toLowerCase().includes('email')) {
          setError('Please enter a valid email address.');
        } else if (signInError.toLowerCase().includes('not allowed') || signInError.toLowerCase().includes('signup')) {
          setError('Sign-ups are temporarily disabled. Please try again later.');
        } else {
          setError('Could not send magic link. Please check your email and try again.');
        }
        return;
      }

      setSent(true);
      events.authMagicLinkSent();
    },
    [email, signIn]
  );

  const handleClose = useCallback(() => {
    setEmail('');
    setLoading(false);
    setSent(false);
    setError(null);
    setConsentChecked(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div
        ref={focusTrapRef}
        className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Mail className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
              Click the link to sign in.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
            <Button variant="ghost" size="sm" onClick={handleClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Sign in to AirwayLab</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a magic link — no password needed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="h-10 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              {/* Single consent checkbox */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md bg-muted/20 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    if (e.target.checked) {
                      events.authConsentChecked();
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <span className="text-[11px] leading-snug text-muted-foreground">
                  I agree to store my sleep data on AirwayLab&apos;s servers, including cloud backup of my SD card files, and have it processed by AI to generate insights. I can disable cloud backup and delete all data anytime.{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    Privacy Policy
                  </a>
                </span>
              </label>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <Button type="submit" disabled={loading || !email.trim() || !consentChecked}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  'Send magic link'
                )}
              </Button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2.5">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
              <p className="text-[11px] leading-snug text-muted-foreground/80">
                Your analysis runs in your browser. Registered accounts get cloud storage and AI insights. All data can be deleted anytime from Account Settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
