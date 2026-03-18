'use client';

import { useState, useCallback } from 'react';
import { HelpCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFilePath } from '@/lib/file-path-utils';

interface Props {
  error: string;
  files: File[];
}

/**
 * Shown in the error state when analysis fails.
 * Offers to submit file metadata so we can add support for new devices.
 */
export function ErrorDataSubmission({ error, files }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = useCallback(async () => {
    setStatus('sending');
    try {
      const fileNames = files.slice(0, 50).map((f) => getFilePath(f));

      const res = await fetch('/api/submit-error-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileNames,
          errorMessage: error,
          email: email.trim() || undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      });

      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }, [files, error, email]);

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-foreground">Thanks for submitting!</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            We&apos;ll review your data format and work on adding support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Help us support your device</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;re constantly adding support for more devices. Submit your file info so we can
            work on compatibility with your machine.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Only file names and folder structure are shared — no personal or medical data.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional — for follow-up)"
              className="flex-1 rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={status === 'sending'}
              className="gap-1.5"
            >
              {status === 'sending' ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Submitting…</>
              ) : status === 'error' ? (
                'Retry'
              ) : (
                'Submit Data Info'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
