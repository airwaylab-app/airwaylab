'use client';

import { useState, useCallback } from 'react';
import { MessageSquare, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportForumSingleNight } from '@/lib/forum-export';
import { openPDFReport } from '@/lib/pdf-report';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';
import type { NightResult } from '@/lib/types';

const DISMISS_KEY = 'airwaylab_share_dismissed';

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  isDemo: boolean;
}

/**
 * Post-analysis share prompts:
 * 1. Community sharing (copy for Reddit / ApneaBoard)
 * 2. Clinician sharing (PDF report)
 *
 * Only shown for real data (not demo). Dismissable via sessionStorage.
 */
export function SharePrompts({ nights, selectedNight, isDemo }: Props) {
  const { tier } = useAuth();
  const pdfAllowed = canAccess('pdf_report', tier);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState<string | null>(null);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* noop */ }
  }, []);

  const handleCopyForum = useCallback(async () => {
    const text = exportForumSingleNight(selectedNight);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('forum');
      setTimeout(() => setCopied(null), 2000);
    } catch { /* noop */ }
  }, [selectedNight]);

  const handlePDF = useCallback(() => {
    openPDFReport(nights);
  }, [nights]);

  // Only show for real data
  if (isDemo || dismissed) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Community share */}
      <div className="relative rounded-lg border border-border/50 bg-card/50 px-4 py-3">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          aria-label="Dismiss share prompts"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium">Share with the community</p>
              <p className="text-xs text-muted-foreground">
                Posting your results on ApneaBoard, Reddit, CPAPtalk, or your favourite sleep community helps others understand their data too.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleCopyForum}
              >
                {copied === 'forum' ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" /> Copied!
                  </>
                ) : (
                  'Copy for Forum Post'
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50">
              Results are anonymised — only metrics are shared, never raw data.
            </p>
          </div>
        </div>
      </div>

      {/* Doctor share */}
      <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium">Share with your clinician</p>
              <p className="text-xs text-muted-foreground">
                Taking these results to your sleep doctor? Export a PDF report they can review.
              </p>
            </div>
            {pdfAllowed ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-fit gap-1.5 text-xs"
                onClick={handlePDF}
              >
                <FileText className="h-3 w-3" /> Download PDF Report
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground/70">
                PDF reports are available on the Supporter plan.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/50">
              The report includes key metrics, traffic-light indicators, and a medical disclaimer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
