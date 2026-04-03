'use client';

import { memo, useState, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, MessageSquare, Check, FileText, AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { exportCSV, exportJSON, downloadFile } from '@/lib/export';
import { exportForumMultiNight, exportForumSingleNight } from '@/lib/forum-export';
import { openPDFReport } from '@/lib/pdf-report';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  selectedNight?: NightResult;
}

function CopyForumButton({ nights, selectedNight }: Props) {
  const { tier } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      const text =
        nights.length === 1 || selectedNight
          ? exportForumSingleNight(selectedNight ?? nights[0]!, tier)
          : exportForumMultiNight(nights, tier);
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true);
          setCopyError(false);
          events.export('forum');
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
  }, [nights, selectedNight, tier]);

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

export const ExportButtons = memo(function ExportButtons({ nights, selectedNight }: Props) {
  const { tier } = useAuth();
  const pdfAllowed = canAccess('pdf_report', tier);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleCSV = useCallback(() => {
    try {
      const csv = exportCSV(nights);
      downloadFile(csv, 'airwaylab-results.csv', 'text/csv');
      events.export('csv');
      setDownloaded('csv');
      setExportError(null);
      setTimeout(() => setDownloaded(null), 2000);
    } catch (err) {
      console.error('CSV export failed:', err);
      setExportError('csv');
      setTimeout(() => setExportError(null), 5000);
    }
  }, [nights]);

  const handleJSON = useCallback(() => {
    try {
      const json = exportJSON(nights);
      downloadFile(json, 'airwaylab-results.json', 'application/json');
      events.export('json');
      setDownloaded('json');
      setExportError(null);
      setTimeout(() => setDownloaded(null), 2000);
    } catch (err) {
      console.error('JSON export failed:', err);
      setExportError('json');
      setTimeout(() => setExportError(null), 5000);
    }
  }, [nights]);

  const handlePDF = useCallback(() => {
    try {
      openPDFReport(nights);
      events.export('pdf');
    } catch (err) {
      console.error('PDF report failed:', err);
      setExportError('pdf');
      setTimeout(() => setExportError(null), 5000);
    }
  }, [nights]);

  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger
            onClick={handleCSV}
            aria-label={`Export ${nights.length} night${nights.length !== 1 ? 's' : ''} as CSV spreadsheet`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {exportError === 'csv' ? (
              <AlertCircle className="h-3 w-3 text-red-500" />
            ) : downloaded === 'csv' ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Spreadsheet </span>
            {exportError === 'csv' ? 'Failed' : downloaded === 'csv' ? 'Downloaded!' : 'CSV'}
          </TooltipTrigger>
          <TooltipContent>
            {exportError === 'csv'
              ? 'Export failed — try again or check available disk space'
              : `All metrics for ${nights.length} night${nights.length !== 1 ? 's' : ''} — opens in Excel, Google Sheets`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            onClick={handleJSON}
            aria-label={`Export ${nights.length} night${nights.length !== 1 ? 's' : ''} as JSON data`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {exportError === 'json' ? (
              <AlertCircle className="h-3 w-3 text-red-500" />
            ) : downloaded === 'json' ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Raw Data </span>
            {exportError === 'json' ? 'Failed' : downloaded === 'json' ? 'Downloaded!' : 'JSON'}
          </TooltipTrigger>
          <TooltipContent>
            {exportError === 'json'
              ? 'Export failed — try again or check available disk space'
              : 'Full structured data for programmatic use'}
          </TooltipContent>
        </Tooltip>

        {pdfAllowed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={handlePDF}
              aria-label={`Open printable PDF report for ${nights.length} night${nights.length !== 1 ? 's' : ''}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {exportError === 'pdf' ? (
                <AlertCircle className="h-3 w-3 text-red-500" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Report </span>
              {exportError === 'pdf' ? 'Failed' : 'PDF'}
            </TooltipTrigger>
            <TooltipContent>
              {exportError === 'pdf'
                ? 'PDF generation failed — try again'
                : 'Open print-ready report — save as PDF from print dialog'}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={<Link href="/pricing" />}
              aria-label="PDF reports available for supporters"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input/50 bg-background px-3 text-xs font-medium text-muted-foreground/80 transition-colors hover:border-input hover:text-muted-foreground"
            >
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Report </span>PDF
            </TooltipTrigger>
            <TooltipContent>
              PDF reports are available to supporters — help fund AirwayLab
            </TooltipContent>
          </Tooltip>
        )}

        <CopyForumButton nights={nights} selectedNight={selectedNight} />
      </div>
    </TooltipProvider>
  );
});
