'use client';

import { useState, useEffect } from 'react';
import { Upload, X, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

const STORAGE_KEY = 'airwaylab_upload_again_cta_dismissed';

interface Props {
  isComplete: boolean;
  sessionCount: number;
  onUploadAnother: () => void;
}

export function UploadAgainCta({ isComplete, sessionCount, onUploadAnother }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isComplete || sessionCount !== 1) return;

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }

    setVisible(true);
  }, [isComplete, sessionCount]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* noop */ }
    events.upgradeNudgeDismissed('upload_again_cta');
  };

  const handleUploadClick = () => {
    dismiss();
    events.upgradeNudgeClicked('upload_again_cta');
    onUploadAnother();
  };

  return (
    <div className="animate-fade-in-up rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <TrendingUp className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Your first upload is a snapshot. Upload again to see what changed.
            </h3>
            <button
              onClick={dismiss}
              className="rounded p-2.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Users who track two or more uploads have more to discuss with their clinician.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUploadClick}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload another file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
