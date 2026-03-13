'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link2, Check, AlertCircle, Loader2, X, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { ShareConsentModal } from './share-consent-modal';
import { AuthModal } from '@/components/auth/auth-modal';
import {
  getShareConsent,
  setShareConsent,
} from '@/lib/share-consent';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

/**
 * Strip bulky per-breath arrays and oximetry traces before sharing.
 * Same logic as stripBulkData in persistence.ts — these fields can be
 * tens of MB for multi-night shares but are not needed for the shared view.
 */
function stripForShare(nights: NightResult[]): NightResult[] {
  return nights.map((n) => ({
    ...n,
    ned: {
      ...n.ned,
      breaths: [],
    },
    oximetryTrace: null,
    settingsMetrics: null,
  }));
}

interface FileUploadProgress {
  status: 'idle' | 'uploading' | 'done' | 'error';
  uploaded: number;
  total: number;
  errorMessage?: string;
}

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  sdFiles?: File[];
}

type ShareState =
  | { step: 'idle' }
  | { step: 'auth' }
  | { step: 'consent' }
  | { step: 'scope' }
  | { step: 'loading' }
  | { step: 'success'; shareUrl: string; expiresAt: string; nightsCount: number; shareScope: string; shareId: string }
  | { step: 'error'; message: string };

export const ShareButton = memo(function ShareButton({
  nights,
  selectedNight,
  sdFiles,
}: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<ShareState>({ step: 'idle' });
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [fileUpload, setFileUpload] = useState<FileUploadProgress>({ status: 'idle', uploaded: 0, total: 0 });
  const focusTrapRef = useFocusTrap(state.step === 'success' || state.step === 'error');
  const pendingScopeRef = useRef<'single' | 'all' | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Clear copy feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const hasFiles = (sdFiles?.length ?? 0) > 0;

  const uploadFilesToShare = useCallback(async (shareId: string, files: File[]) => {
    if (files.length === 0) return;

    setFileUpload({ status: 'uploading', uploaded: 0, total: files.length });

    try {
      // Get presigned upload URLs
      const presignRes = await fetch('/api/share/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId,
          files: files.map((f) => ({ fileName: f.name, fileSize: f.size })),
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Could not prepare file upload');
      }

      const { uploadUrls } = await presignRes.json() as {
        uploadUrls: { fileName: string; uploadUrl: string; storagePath: string }[];
      };

      // Upload files in batches of 3
      const storagePaths: string[] = [];
      const batchSize = 3;

      for (let i = 0; i < uploadUrls.length; i += batchSize) {
        const batch = uploadUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (entry) => {
            const file = files.find((f) => f.name === entry.fileName);
            if (!file) return;

            const uploadRes = await fetch(entry.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: file,
            });

            if (uploadRes.ok) {
              storagePaths.push(entry.storagePath);
              setFileUpload((prev) => ({ ...prev, uploaded: prev.uploaded + 1 }));
            }
          })
        );
      }

      if (storagePaths.length === 0) {
        throw new Error('No files could be uploaded');
      }

      // Finalise upload
      await fetch('/api/share/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, filePaths: storagePaths }),
      });

      const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
      events.shareFilesUploaded(storagePaths.length, totalBytes);
      setFileUpload({ status: 'done', uploaded: storagePaths.length, total: files.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'File upload failed';
      console.error('[share-button] file upload failed:', message);
      events.shareFilesUploadFailed(message);
      setFileUpload((prev) => ({ ...prev, status: 'error', errorMessage: message }));
    }
  }, []);

  const createShareLink = useCallback(
    async (scope: 'single' | 'all') => {
      setState({ step: 'loading' });

      const rawData =
        scope === 'single' ? [selectedNight] : nights;
      const stripped = stripForShare(rawData);
      const analysisData = scope === 'single' ? stripped[0] : stripped;
      const nightsCount =
        scope === 'single' ? 1 : nights.length;
      const machineInfo = selectedNight.settings ?? null;

      try {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisData,
            machineInfo,
            nightsCount,
            shareScope: scope,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          // If 401, prompt auth
          if (res.status === 401) {
            pendingScopeRef.current = scope;
            setState({ step: 'auth' });
            return;
          }

          setState({
            step: 'error',
            message:
              (data as { error?: string }).error ??
              'Something went wrong creating the share link. Please try again.',
          });
          return;
        }

        const data = await res.json() as {
          shareId: string;
          shareUrl: string;
          expiresAt: string;
          nightsCount: number;
          shareScope: string;
        };

        events.shareCreated(data.nightsCount, data.shareScope);

        setState({
          step: 'success',
          shareUrl: data.shareUrl,
          expiresAt: data.expiresAt,
          nightsCount: data.nightsCount,
          shareScope: data.shareScope,
          shareId: data.shareId,
        });

        // Upload files in background if available
        if (sdFiles && sdFiles.length > 0) {
          uploadFilesToShare(data.shareId, sdFiles);
        }
      } catch {
        setState({
          step: 'error',
          message:
            'Something went wrong creating the share link. Please try again.',
        });
      }
    },
    [nights, selectedNight, sdFiles, uploadFilesToShare]
  );

  const handleShareClick = useCallback(() => {
    // Auth check — share creation requires login
    if (!user) {
      events.authStarted('share');
      setState({ step: 'auth' });
      return;
    }

    const consent = getShareConsent();

    if (!consent || !consent.dataShareConsent) {
      events.shareOptinShown();
      setState({ step: 'consent' });
    } else if (consent.rememberedChoice) {
      createShareLink(consent.shareScope);
    } else {
      setState({ step: 'scope' });
    }
  }, [user, createShareLink]);

  const handleConsentConfirm = useCallback(
    (scope: 'single' | 'all', remember: boolean) => {
      setShareConsent({
        dataShareConsent: true,
        shareScope: scope,
        rememberedChoice: remember,
      });
      createShareLink(scope);
    },
    [createShareLink]
  );

  const handleCopy = useCallback(async () => {
    if (state.step !== 'success') return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(state.shareUrl);
      setCopied(true);
      setCopyError(false);
      events.shareCopied();
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      copyTimerRef.current = setTimeout(() => setCopyError(false), 3000);
    }
  }, [state]);

  const handleClose = useCallback(() => {
    setState({ step: 'idle' });
    setCopied(false);
    setCopyError(false);
    setFileUpload({ status: 'idle', uploaded: 0, total: 0 });
  }, []);

  const handleAuthClose = useCallback(() => {
    setState({ step: 'idle' });
    pendingScopeRef.current = null;
  }, []);

  const handleChangePreferences = useCallback(() => {
    events.shareOptinShown();
    setState({ step: 'consent' });
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={handleShareClick}
          aria-label="Share analysis via link"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/[0.04] px-3 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.08]"
        >
          <Link2 className="h-3 w-3" />
          <span className="hidden sm:inline">Share</span>
        </TooltipTrigger>
        <TooltipContent>Share analysis via link</TooltipContent>
      </Tooltip>

      {/* Auth modal */}
      <AuthModal
        open={state.step === 'auth'}
        onClose={handleAuthClose}
      />

      {/* Consent modal (full) */}
      <ShareConsentModal
        open={state.step === 'consent'}
        onClose={handleClose}
        onConfirm={handleConsentConfirm}
        nightsCount={nights.length}
        hasFiles={hasFiles}
      />

      {/* Scope picker (simplified — consent already given) */}
      <ShareConsentModal
        open={state.step === 'scope'}
        onClose={handleClose}
        onConfirm={handleConsentConfirm}
        nightsCount={nights.length}
        hasFiles={hasFiles}
        simplified
      />

      {/* Loading / Success / Error dialog */}
      {(state.step === 'loading' ||
        state.step === 'success' ||
        state.step === 'error') && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Share link"
        >
          <div
            ref={focusTrapRef}
            className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {state.step === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Creating share link...
                </p>
              </div>
            )}

            {state.step === 'success' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">Share Link Created</h3>

                {/* URL + copy */}
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2">
                  <p className="flex-1 truncate font-mono text-xs text-muted-foreground">
                    {state.shareUrl}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                    aria-label="Copy share link"
                  >
                    {copyError ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="h-3 w-3" /> Failed
                      </span>
                    ) : copied ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="h-3 w-3" /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" /> Copy
                      </span>
                    )}
                  </button>
                </div>

                {/* File upload progress */}
                {fileUpload.status === 'uploading' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Uploading waveform data ({fileUpload.uploaded}/{fileUpload.total} files)...</span>
                  </div>
                )}
                {fileUpload.status === 'done' && (
                  <p className="text-xs text-emerald-400">
                    Waveform data uploaded ({fileUpload.uploaded} files) &mdash; consultants can view the Graphs tab.
                  </p>
                )}
                {fileUpload.status === 'error' && (
                  <p className="text-xs text-amber-400">
                    Waveform data could not be uploaded. Your share link still works for metrics.
                  </p>
                )}

                {/* Meta */}
                <p className="text-xs text-muted-foreground">
                  {state.nightsCount} night
                  {state.nightsCount !== 1 ? 's' : ''} &middot; Expires{' '}
                  {new Date(state.expiresAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>

                {/* Provider cross-link */}
                <p className="text-xs text-muted-foreground">
                  Sharing with a sleep consultant?{' '}
                  <Link
                    href="/providers"
                    className="text-primary underline decoration-primary/50 underline-offset-2 transition-colors hover:text-foreground"
                    onClick={handleClose}
                  >
                    Tell them about AirwayLab
                  </Link>
                </p>

                {/* Change preferences */}
                <button
                  onClick={handleChangePreferences}
                  className="text-left text-[11px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                >
                  Change sharing preferences
                </button>
              </div>
            )}

            {state.step === 'error' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <p className="text-sm text-muted-foreground">
                  {state.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareClick}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </TooltipProvider>
  );
});
