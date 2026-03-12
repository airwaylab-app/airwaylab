'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportForumSingleNight } from '@/lib/forum-export';
import { openPDFReport } from '@/lib/pdf-report';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  open: boolean;
  onClose: () => void;
}

/**
 * Post-analysis share prompts displayed as a centered modal overlay.
 * 1. Community sharing (copy for Reddit / ApneaBoard)
 * 2. Clinician sharing (PDF report)
 *
 * Controlled modal — parent manages open/close state.
 */
export function SharePrompts({ nights, selectedNight, open, onClose }: Props) {
  const { tier } = useAuth();
  const pdfAllowed = canAccess('pdf_report', tier);
  const [copied, setCopied] = useState<string | null>(null);

  const focusTrapRef = useFocusTrap(open);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share your analysis"
    >
      <div
        ref={focusTrapRef}
        className="relative mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Dismiss share prompts"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-5 text-lg font-semibold">Share Your Analysis</h2>

        <div className="flex flex-col gap-4">
          {/* Community share */}
          <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3">
            <div className="flex items-start gap-3">
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
                <p className="text-[10px] text-muted-foreground/70">
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
                <p className="text-[10px] text-muted-foreground/70">
                  The report includes key metrics, traffic-light indicators, and a medical disclaimer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
