'use client';

import { memo, useState, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, MessageSquare, Check, FileText, AlertCircle } from 'lucide-react';
import { exportCSV, exportJSON, downloadFile } from '@/lib/export';
import { exportForumMultiNight, exportForumSingleNight } from '@/lib/forum-export';
import { openPDFReport } from '@/lib/pdf-report';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  selectedNight?: NightResult;
}

function CopyForumButton({ nights, selectedNight }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      const text =
        nights.length === 1 || selectedNight
          ? exportForumSingleNight(selectedNight ?? nights[0])
          : exportForumMultiNight(nights);
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true);
          setCopyError(false);
          setTimeout(() => setCopied(false), 2000);
        },
        () => {
          // Clipboard write failed (e.g. permissions denied, insecure context)
          setCopyError(true);
          setTimeout(() => setCopyError(false), 3000);
        }
      );
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }, [nights, selectedNight]);

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleCopy}
        aria-label="Copy forum-formatted summary to clipboard"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/[0.04] px-3 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.08]"
      >
        {copyError ? (
          <AlertCircle className="h-3 w-3 text-red-500" />
        ) : copied ? (
          <Check className="h-3 w-3 text-emerald-500" />
        ) : (
          <MessageSquare className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">Forum </span>
        {copyError ? 'Failed' : copied ? 'Copied!' : 'Post'}
      </TooltipTrigger>
      <TooltipContent>
        {copyError
          ? 'Clipboard access denied — try using HTTPS'
          : 'Copy markdown summary for ApneaBoard or Reddit'}
      </TooltipContent>
    </Tooltip>
  );
}

function safeExportCSV(nights: NightResult[]): void {
  try {
    const csv = exportCSV(nights);
    downloadFile(csv, 'airwaylab-results.csv', 'text/csv');
  } catch (err) {
    console.error('CSV export failed:', err);
  }
}

function safeExportJSON(nights: NightResult[]): void {
  try {
    const json = exportJSON(nights);
    downloadFile(json, 'airwaylab-results.json', 'application/json');
  } catch (err) {
    console.error('JSON export failed:', err);
  }
}

function safeOpenPDF(nights: NightResult[]): void {
  try {
    openPDFReport(nights);
  } catch (err) {
    console.error('PDF report failed:', err);
  }
}

export const ExportButtons = memo(function ExportButtons({ nights, selectedNight }: Props) {
  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger
            onClick={() => safeExportCSV(nights)}
            aria-label={`Export ${nights.length} night${nights.length !== 1 ? 's' : ''} as CSV spreadsheet`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Spreadsheet </span>CSV
          </TooltipTrigger>
          <TooltipContent>
            All metrics for {nights.length} night{nights.length !== 1 ? 's' : ''} — opens in Excel, Google Sheets
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => safeExportJSON(nights)}
            aria-label={`Export ${nights.length} night${nights.length !== 1 ? 's' : ''} as JSON data`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Raw Data </span>JSON
          </TooltipTrigger>
          <TooltipContent>
            Full structured data for programmatic use
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={() => safeOpenPDF(nights)}
            aria-label={`Open printable PDF report for ${nights.length} night${nights.length !== 1 ? 's' : ''}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Report </span>PDF
          </TooltipTrigger>
          <TooltipContent>
            Open print-ready report — save as PDF from print dialog
          </TooltipContent>
        </Tooltip>

        <CopyForumButton nights={nights} selectedNight={selectedNight} />
      </div>
    </TooltipProvider>
  );
});
