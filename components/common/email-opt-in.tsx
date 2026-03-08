'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface EmailOptInProps {
  variant: 'hero' | 'post-analysis' | 'footer' | 'inline';
  source: string;
}

export function EmailOptIn({ variant, source }: EmailOptInProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    // RFC-friendly check: user@domain.tld, max 254 chars
    if (!trimmed || trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 text-sm text-emerald-400 ${
        variant === 'footer' ? '' : 'py-2'
      }`}>
        <CheckCircle2 className="h-4 w-4" />
        <span>You&apos;re on the list!</span>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card/50 p-4 sm:p-6">
        <p className="mb-1 text-xs font-medium sm:text-sm">
          Get notified when we add AI-powered therapy insights and multi-device support
        </p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Join other CPAP users shaping the future of breathing data analysis. No spam, ever.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Notify Me'
            )}
          </Button>
        </form>
        {status === 'error' && (
          <p className="mt-2 text-xs text-red-400">Something went wrong. Please try again.</p>
        )}
      </div>
    );
  }

  if (variant === 'post-analysis') {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-6">
        <p className="mb-1 text-sm font-medium">AI-powered therapy insights are coming</p>
        <p className="mb-3 text-xs text-muted-foreground sm:mb-4">
          Sign up for early access — and help us keep AirwayLab free for everyone.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={status === 'loading'} className="w-full sm:w-auto">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Get Early Access'
            )}
          </Button>
        </form>
        {status === 'error' && (
          <p className="mt-2 text-xs text-red-400">Something went wrong. Please try again.</p>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="h-7 w-40 rounded-md border border-border bg-background px-2 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Notify'}
        </Button>
        {status === 'error' && (
          <span className="text-[10px] text-red-400">Error</span>
        )}
      </form>
    );
  }

  // footer variant
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <Button type="submit" variant="ghost" size="sm" className="h-8 text-xs" disabled={status === 'loading'}>
        Subscribe
      </Button>
    </form>
  );
}
