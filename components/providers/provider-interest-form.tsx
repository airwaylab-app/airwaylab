'use client';

import { useState, useCallback } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

const PRACTICE_TYPES = [
  { value: 'independent_sleep_consultant', label: 'Independent sleep consultant' },
  { value: 'respiratory_therapist', label: 'Respiratory therapist' },
  { value: 'sleep_physician', label: 'Sleep physician' },
  { value: 'other', label: 'Other' },
] as const;

export function ProviderInterestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [practiceType, setPracticeType] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (trimmedName.length < 2) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;

      setStatus('submitting');
      setErrorMessage('');

      try {
        const res = await fetch('/api/provider-interest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            practiceType: practiceType || undefined,
            message: message.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMessage(
            (data as { error?: string }).error ??
              'Something went wrong. Please try again or email us at dev@airwaylab.app'
          );
          setStatus('error');
          return;
        }

        setStatus('success');
        events.providersContactSubmit();
      } catch {
        setErrorMessage(
          'Something went wrong. Please try again or email us at dev@airwaylab.app'
        );
        setStatus('error');
      }
    },
    [name, email, practiceType, message]
  );

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        <p className="text-sm font-medium">
          Thanks — we&apos;ll be in touch within a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label
          htmlFor="provider-name"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="provider-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Your name"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="provider-email"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="provider-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="you@practice.com"
        />
      </div>

      {/* Practice type */}
      <div>
        <label
          htmlFor="provider-practice-type"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Practice type
        </label>
        <select
          id="provider-practice-type"
          value={practiceType}
          onChange={(e) => setPracticeType(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Select...</option>
          {PRACTICE_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="provider-message"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Tell us about your workflow
        </label>
        <textarea
          id="provider-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="What tools do you use today? What's painful about your current workflow?"
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}

      <Button
        type="submit"
        disabled={status === 'submitting' || name.trim().length < 2 || !email.trim()}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Get in Touch'
        )}
      </Button>
    </form>
  );
}
