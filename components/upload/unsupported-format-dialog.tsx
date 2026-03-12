'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Send, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface Props {
  files: { fileName: string; headerSample: string }[];
  onClose: () => void;
}

export function UnsupportedFormatDialog({ files, onClose }: Props) {
  const [deviceName, setDeviceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const focusTrapRef = useFocusTrap(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const fileDetails = files
        .map((f) => `File: ${f.fileName}\nHeader:\n${f.headerSample}`)
        .join('\n\n---\n\n');

      const message = [
        `Oximetry format request${deviceName ? ` (device: ${deviceName})` : ''}`,
        '',
        `${files.length} unsupported file${files.length !== 1 ? 's' : ''} uploaded.`,
        '',
        fileDetails,
      ].join('\n');

      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.slice(0, 2000),
          type: 'feature',
          page: '/analyze',
        }),
      });

      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      // Silently fail — don't block the user
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [files, deviceName, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="unsupported-format-title">
      <div ref={focusTrapRef} className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 id="unsupported-format-title" className="text-sm font-semibold">
              Oximetry format not recognised
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {files.length === 1
                ? `"${files[0].fileName}" doesn't match any supported pulse oximeter format.`
                : `${files.length} files don't match any supported format.`}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          AirwayLab currently supports <strong className="text-foreground">Viatom</strong> and{' '}
          <strong className="text-foreground">Checkme O2 Max</strong> CSV exports.
          If you&apos;d like us to add support for your device, we can look at the
          file structure to check compatibility.
        </p>

        {submitted ? (
          <div className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-400">
            Thanks! We&apos;ll review this format and reach out if we add support.
          </div>
        ) : (
          <>
            <div className="mt-4">
              <label htmlFor="device-name" className="text-xs font-medium text-muted-foreground">
                What device/app exported this file? (optional)
              </label>
              <input
                id="device-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Wellue O2 Ring, SleepU, Emay"
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={100}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {submitting ? 'Sending…' : 'Request support for this format'}
              </button>
              <button
                onClick={onClose}
                className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Skip
              </button>
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground/80">
              Only the first 5 lines of your file (column headers) will be sent — no personal health data is included.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
