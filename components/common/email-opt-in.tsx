'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';

interface EmailOptInProps {
  variant: 'hero' | 'post-analysis' | 'footer' | 'inline';
  source: string;
}

/**
 * Email opt-in that doubles as a registration flow.
 * Sends a Supabase magic link. On callback, sets email_opt_in = true.
 * For already-authenticated users, toggles opt-in directly.
 */
export function EmailOptIn({ variant, source }: EmailOptInProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { user, signIn } = useAuth();

  // Authenticated users don't need the registration form (except inline which is handled by parent)
  if (user && variant !== 'inline') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return;

    setStatus('loading');
    setErrorMsg('');

    // Already signed in: just toggle email opt-in
    if (user) {
      try {
        const res = await fetch('/api/email/opt-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ opt_in: true }),
        });
        if (res.ok) {
          setStatus('success');
          events.emailSubscribe(source);
        } else {
          setStatus('error');
          setErrorMsg('Could not update your preference. Please try again.');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Something went wrong. Please try again.');
      }
      return;
    }

    // Not signed in: send magic link (registers or logs in)
    try {
      // Store intent so auth callback knows to enable email_opt_in
      try { localStorage.setItem('airwaylab_email_opt_in_pending', '1'); } catch { /* noop */ }

      const { error } = await signIn(trimmed);
      if (!error) {
        setStatus('success');
        events.emailSubscribe(source);
      } else {
        setStatus('error');
        setErrorMsg(error);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    // Authenticated users: confirmed
    if (user) {
      return (
        <div aria-live="polite" className={`flex items-center gap-2 text-sm text-emerald-400 ${
          variant === 'footer' ? '' : 'py-2'
        }`}>
          <CheckCircle2 className="h-4 w-4" />
          <span>Email updates enabled!</span>
        </div>
      );
    }
    // Anonymous users: magic link sent
    return (
      <div aria-live="polite" className={`flex items-center gap-2 text-sm text-emerald-400 ${
        variant === 'footer' ? '' : 'py-2'
      }`}>
        <Mail className="h-4 w-4" />
        <span>Check your email for a sign-in link!</span>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card/50 p-4 sm:p-6">
        <p className="mb-1 text-xs font-medium sm:text-sm">
          Create a free account to unlock cloud sync, AI insights, and email updates
        </p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          We&apos;ll send you a magic link. No password needed.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email address"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sign Up Free'
            )}
          </Button>
        </form>
        {status === 'error' && (
          <p aria-live="polite" className="mt-2 text-xs text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
        )}
      </div>
    );
  }

  if (variant === 'post-analysis') {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
        <p className="mb-1 text-sm font-medium">Save your results and get therapy tips by email</p>
        <p className="mb-3 text-xs text-muted-foreground sm:mb-4">
          Create a free account to keep your analysis history and get updates on your therapy progress.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email address"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Free Account'
            )}
          </Button>
        </form>
        {status === 'error' && (
          <p aria-live="polite" className="mt-2 text-xs text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="h-7 w-40 rounded-md border border-border bg-background px-2 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sign Up'}
        </Button>
        {status === 'error' && (
          <span aria-live="polite" className="text-[10px] text-red-400">{errorMsg || 'Error'}</span>
        )}
      </form>
    );
  }

  // footer variant
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" variant="ghost" size="sm" className="h-8 text-xs" disabled={status === 'loading'}>
          Sign Up
        </Button>
      </form>
      {status === 'error' && (
        <p aria-live="polite" className="mt-1 text-[10px] text-red-400">{errorMsg || 'Something went wrong. Please try again.'}</p>
      )}
    </div>
  );
}
