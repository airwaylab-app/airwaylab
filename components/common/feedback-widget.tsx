'use client';

import { useState, useCallback } from 'react';
import { MessageSquarePlus, X, Loader2, CheckCircle, Lightbulb, Bug, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPES = [
  { value: 'feature', label: 'Feature request', icon: Lightbulb },
  { value: 'bug', label: 'Bug report', icon: Bug },
  { value: 'support', label: 'Question', icon: HelpCircle },
] as const;

type FeedbackType = (typeof TYPES)[number]['value'];

/**
 * Floating feedback widget (bottom-right).
 * Lets users submit feature requests, bug reports, or support questions.
 * No account required. Stores in Supabase `feedback` table.
 */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = useCallback(async () => {
    if (message.trim().length < 5) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          type,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('[feedback]', data.error || 'Unknown error');
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [message, email, type]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setStatus('idle');
    }, 200);
  }, []);

  // Success state in panel
  if (open && status === 'success') {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card p-5 shadow-lg animate-fade-in-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="text-sm font-medium">Thank you!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your feedback has been submitted. We read everything.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Panel
  if (open) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card shadow-lg animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h3 className="text-sm font-medium">Send feedback</h3>
          <button
            onClick={handleClose}
            className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                    type === t.value
                      ? 'border-primary/30 bg-primary/5 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'feature'
                ? 'What feature would make AirwayLab more useful for you?'
                : type === 'bug'
                  ? 'Describe what went wrong and what you expected...'
                  : 'What can we help you with?'
            }
            className="h-24 w-full resize-none rounded-md border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20"
            maxLength={2000}
          />

          {/* Email (optional) */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional — for follow-up)"
            className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />

          {/* Submit */}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={message.trim().length < 5 || status === 'sending'}
            className="w-full gap-1.5"
          >
            {status === 'sending' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Sending…
              </>
            ) : status === 'error' ? (
              'Retry'
            ) : (
              'Submit'
            )}
          </Button>

          {status === 'error' && (
            <p className="text-center text-[10px] text-red-400">
              Something went wrong — please try again.
            </p>
          )}

          <p className="text-center text-[10px] text-muted-foreground/40">
            You can also{' '}
            <a
              href="https://github.com/airwaylab-app/airwaylab/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/60 hover:text-primary"
            >
              open a GitHub issue
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Floating trigger button
  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-50 flex h-10 items-center gap-2 rounded-full border border-border/50 bg-card px-4 shadow-md transition-all hover:border-border hover:shadow-lg"
      aria-label="Send feedback"
    >
      <MessageSquarePlus className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium text-muted-foreground">Feedback</span>
    </button>
  );
}
