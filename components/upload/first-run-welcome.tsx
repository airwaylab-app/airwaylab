'use client';

import { useEffect, useState } from 'react';
import { Play, Shield, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from './file-upload';
import { MobileEmailCapture } from './mobile-email-capture';
import { isIOSDevice } from '@/lib/directory-traversal';

interface FirstRunWelcomeProps {
  onLoadDemo: () => void;
  onFilesSelected: (sdFiles: File[], oxFiles: File[], deviceType?: string, bmcSerial?: string) => void;
}

const BENEFITS = [
  { icon: Shield, label: 'Privacy-first — all analysis stays on your device' },
  { icon: Zap, label: 'Results in seconds via four independent engines' },
  { icon: BarChart3, label: 'AHI, flow limitation, Glasgow Index, and oximetry' },
] as const;

export function FirstRunWelcome({ onLoadDemo, onFilesSelected }: FirstRunWelcomeProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  const demoCta = (
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
        <div className="h-px flex-1 bg-border/50" />
        <span>or</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <Button
        variant="outline"
        size="default"
        onClick={onLoadDemo}
        aria-label="Load 7-night sample dataset"
        className="gap-2"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Try sample data
      </Button>
      <p className="text-[11px] text-muted-foreground/50">
        7 nights of example BiPAP data - no file needed
      </p>
    </div>
  );

  if (isIOS) {
    return (
      <div className="mx-auto max-w-lg">
        <MobileEmailCapture className="mb-4" />
        {demoCta}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Mobile: 3 benefit pills instead of left column */}
      <div className="mb-4 flex flex-col gap-2 sm:hidden">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {/* LEFT: value prop — desktop only */}
        <div className="hidden sm:flex sm:w-60 sm:shrink-0 sm:flex-col sm:gap-5 sm:pt-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Understand your PAP therapy</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload your SD card for detailed sleep analysis — processed entirely in your browser.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            No account required. No data ever leaves your device.
          </p>
        </div>

        {/* RIGHT: upload zone + demo CTA */}
        <div className="min-w-0 flex-1">
          <FileUpload onFilesSelected={onFilesSelected} />
          {demoCta}
        </div>
      </div>
    </div>
  );
}
