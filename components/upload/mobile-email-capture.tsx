'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface MobileEmailCaptureProps {
  className?: string;
}

export function MobileEmailCapture({ className }: MobileEmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [suppressed, setSuppressed] = useState(true); // default hidden to avoid SSR flash
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem('airwaylab_remind_submitted')) {
      setSuppressed(true);
    } else {
      setSuppressed(false);
      events.mobileReminderShown();
    }
  }, []);

  if (suppressed) return null;

  async function handleSubmit() {
    if (!email.includes('@') || !consent || status !== 'idle') return;
    setStatus('sending');
    events.mobileReminderSubmitted();
    try {
      const res = await fetch('/api/remind-desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      });
      if (res.ok) {
        localStorage.setItem('airwaylab_remind_submitted', Date.now().toString());
        setStatus('success');
        events.mobileReminderSuccess();
      } else {
        setStatus('error');
        emailInputRef.current?.focus();
        events.mobileReminderError();
      }
    } catch {
      setStatus('error');
      emailInputRef.current?.focus();
      events.mobileReminderError();
    }
  }

  if (status === 'success') {
    return (
      <div className={cn('rounded-xl border border-border/60 bg-card/40 p-5 text-center', className)}>
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" aria-hidden="true" />
        <p className="text-base font-semibold text-foreground">Check your inbox</p>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll send desktop instructions within 24 hours. The link works on any browser.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card/40 p-5 text-center', className)}>
      <Monitor className="h-8 w-8 text-primary mx-auto mb-3" aria-hidden="true" />
      <p className="text-base font-semibold text-foreground">
        We&apos;ll remind you when you&apos;re at your desktop
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Paste a folder, see your flow patterns. Glasgow Index scoring, overnight trends,
        and flow limitation data -- processed entirely in your browser. No data leaves your device.
      </p>
      <label htmlFor="reminder-email" className="sr-only">
        Email address
      </label>
      <input
        ref={emailInputRef}
        id="reminder-email"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'sending'}
        className="mt-4 h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
      />
      <label
        htmlFor="reminder-consent"
        className="flex items-center gap-3 mt-3 text-left cursor-pointer min-h-[44px] py-1"
      >
        <input
          type="checkbox"
          id="reminder-consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={status === 'sending'}
          className="h-5 w-5 shrink-0 accent-primary"
        />
        <span className="text-xs text-muted-foreground">
          I agree to receive a one-time reminder email. No marketing. Unsubscribe any time.
        </span>
      </label>
      <Button
        onClick={handleSubmit}
        disabled={!email.includes('@') || !consent || status !== 'idle'}
        aria-disabled={!email.includes('@') || !consent || status !== 'idle'}
        aria-label={status === 'sending' ? 'Sending reminder...' : undefined}
        className="mt-4 w-full"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> Sending...
          </>
        ) : (
          'Email me a reminder'
        )}
      </Button>
      {status === 'error' && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 mt-2 justify-center">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Something went wrong -- try again.
        </p>
      )}
    </div>
  );
}
