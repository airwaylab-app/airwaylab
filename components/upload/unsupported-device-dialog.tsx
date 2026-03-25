'use client';

import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';

interface Props {
  fileStructure: {
    totalFiles: number;
    extensions: Record<string, number>;
    folderStructure: string[];
    totalSizeBytes: number;
  };
  onClose: () => void;
}

export function UnsupportedDeviceDialog({ fileStructure, onClose }: Props) {
  const [deviceName, setDeviceName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const extensionSummary = Object.entries(fileStructure.extensions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([ext, count]) => `${count} .${ext}`)
    .join(', ');

  const totalSizeMB = (fileStructure.totalSizeBytes / (1024 * 1024)).toFixed(1);

  const handleSubmit = async () => {
    if (!consent) return;
    setStatus('sending');

    try {
      const res = await fetch('/api/submit-device-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileStructure,
          deviceGuess: deviceName || undefined,
          email: email || undefined,
          consent: true,
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        const data = await res.json().catch(() => null);
        Sentry.captureMessage(
          `Device data submission failed: ${data?.error || res.status}`,
          { level: 'warning', tags: { route: 'submit-device-data' } }
        );
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Data received</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We will analyse your device format and notify you when support is added.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-400">
            Device not yet supported
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            AirwayLab currently supports ResMed AirSense 10/11 and BMC Luna 2 / RESmart G2.
            Help us add support for your device by sharing your SD card structure.
          </p>

          <div className="mt-3 rounded-lg bg-card/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground/70">Your SD card:</p>
            <p className="mt-1">{fileStructure.totalFiles} files ({totalSizeMB} MB)</p>
            <p className="mt-0.5">File types: {extensionSummary}</p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="device-name" className="text-xs font-medium text-muted-foreground">
                Device name (optional)
              </label>
              <input
                id="device-name"
                type="text"
                placeholder="e.g. Philips DreamStation 2, Lowenstein Prisma"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label htmlFor="device-email" className="text-xs font-medium text-muted-foreground">
                Email (optional, to notify when support is added)
              </label>
              <input
                id="device-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border/50 bg-background px-3 py-1.5 text-xs"
              />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-muted-foreground">
                I consent to sharing my SD card file structure (file names, sizes, folder layout) with AirwayLab.
                No personal health data or file contents are shared.
              </span>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              size="sm"
              disabled={!consent || status === 'sending'}
              onClick={handleSubmit}
            >
              {status === 'sending' ? (
                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-1.5 h-3 w-3" /> Submit</>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {status === 'error' && (
              <span className="text-xs text-red-400">Failed to submit. Please try again.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
