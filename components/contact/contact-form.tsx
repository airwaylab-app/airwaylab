'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'privacy', label: 'Privacy & data request' },
  { value: 'billing', label: 'Billing & subscriptions' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'security', label: 'Security vulnerability' },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]['value'];

function isValidCategory(v: string): v is CategoryValue {
  return CATEGORIES.some((c) => c.value === v);
}

export function ContactForm() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-select category from query param
  useEffect(() => {
    const param = searchParams.get('category');
    if (param && isValidCategory(param)) {
      setCategory(param);
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;
      if (message.trim().length < 10) return;

      setStatus('submitting');
      setErrorMessage('');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email: trimmedEmail,
            category,
            message: message.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMessage(
            (data as { error?: string }).error ?? 'Something went wrong. Please try again.'
          );
          setStatus('error');
          return;
        }

        setStatus('success');
      } catch {
        setErrorMessage('Something went wrong. Please try again.');
        setStatus('error');
      }
    },
    [name, email, category, message]
  );

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        <p className="text-sm font-medium">Message sent. We aim to respond within 2 business days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Your name (optional)"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="you@example.com"
        />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="contact-category"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Category
        </label>
        <select
          id="contact-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="How can we help?"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground/50">
          {message.length}/2000
        </p>
      </div>

      {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

      <Button
        type="submit"
        disabled={status === 'submitting' || !email.trim() || message.trim().length < 10}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>
    </form>
  );
}
