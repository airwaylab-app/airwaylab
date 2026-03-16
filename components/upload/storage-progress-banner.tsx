'use client';

import { useEffect, useState } from 'react';
import { Cloud, Check, AlertCircle, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { uploadOrchestrator } from '@/lib/storage/upload-orchestrator';
import type { UploadState } from '@/lib/storage/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Extract a human-readable error reason from the errors array.
 * Groups by error type and returns the most common one.
 */
function extractErrorSummary(errors: string[]): string | null {
  if (errors.length === 0) return null;

  const counts = new Map<string, number>();
  for (const err of errors) {
    // Strip file-specific prefix ("BRP.edf: ") to group by error type
    const normalized = err.replace(/^[^:]+:\s*/, '');
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  // Return the most common error
  let topError = '';
  let topCount = 0;
  counts.forEach((count, msg) => {
    if (count > topCount) {
      topError = msg;
      topCount = count;
    }
  });

  return topError || null;
}

/**
 * Slim banner showing cloud upload progress or existing sync status.
 * Shows "synced to cloud" when files exist, upload progress during sync,
 * and auto-dismisses after upload completes successfully.
 */
export function StorageProgressBanner() {
  const [state, setState] = useState<UploadState>(uploadOrchestrator.getState());
  const [dismissed, setDismissed] = useState(false);
  const [cloudFileCount, setCloudFileCount] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    return uploadOrchestrator.subscribe(setState);
  }, []);

  // Fetch cloud file count on mount for authenticated users
  useEffect(() => {
    if (!user) return;
    fetch('/api/files/usage', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fileCount > 0) {
          setCloudFileCount(data.fileCount);
        }
      })
      .catch(() => { /* noop */ });
  }, [user]);

  // Auto-dismiss after 8 seconds on full success (no failures)
  useEffect(() => {
    if (state.status === 'complete' && state.result && state.result.failed === 0) {
      // Update cloud file count after successful upload
      if (state.result.uploaded > 0 || state.result.skipped > 0) {
        setCloudFileCount(prev => (prev ?? 0) + (state.result?.uploaded ?? 0));
      }
      const timer = setTimeout(() => setDismissed(true), 8000);
      return () => clearTimeout(timer);
    }
    // Reset dismiss on new upload
    if (state.status === 'hashing' || state.status === 'uploading') {
      setDismissed(false);
    }
  }, [state.status, state.result]);

  // Show cloud sync status when idle with existing files
  const showSyncStatus = state.status === 'idle' && !dismissed && cloudFileCount !== null && cloudFileCount > 0;

  // Don't show when idle (no cloud files) or dismissed
  if (!showSyncStatus && (state.status === 'idle' || dismissed)) return null;

  // Sync status badge (no active upload)
  if (showSyncStatus) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sky-500/15 bg-sky-500/[0.03] px-3 py-1.5 text-xs text-sky-400/70">
        <Cloud className="h-3.5 w-3.5 shrink-0" />
        <span>{cloudFileCount} files synced to cloud</span>
      </div>
    );
  }

  const { progress, result, error } = state;
  const isAuthError = error?.includes('session') || error?.includes('sign in');
  const hasFailures = result && result.failed > 0;
  const isPartialSuccess = hasFailures && result.uploaded > 0;

  // Determine banner styling: failures use amber/warning, not green/success
  const bannerStyle = state.status === 'error'
    ? isAuthError
      ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
      : 'border-red-500/20 bg-red-500/5 text-red-400'
    : state.status === 'complete'
      ? hasFailures
        ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
        : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
      : 'border-sky-500/20 bg-sky-500/5 text-sky-400';

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs ${bannerStyle}`}>
      {/* Icon */}
      {state.status === 'error' ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : state.status === 'complete' ? (
        hasFailures ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <Check className="h-4 w-4 shrink-0" />
        )
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      )}

      {/* Message */}
      <div className="flex-1 min-w-0">
        {state.status === 'hashing' && (
          <span>
            Preparing files... ({progress.current}/{progress.total})
            <span className="hidden sm:inline text-sky-400/60"> — please don&apos;t close this page</span>
          </span>
        )}
        {state.status === 'checking' && (
          <span>Checking for duplicates...</span>
        )}
        {state.status === 'uploading' && (
          <span>
            Syncing to cloud... {progress.current}/{progress.total} files
            ({formatBytes(progress.bytesUploaded)} / {formatBytes(progress.bytesTotal)})
            {progress.skippedExisting > 0 && (
              <span className="hidden sm:inline text-sky-400/60"> — {progress.skippedExisting} already stored</span>
            )}
            {progress.skippedExisting === 0 && (
              <span className="hidden sm:inline text-sky-400/60"> — please don&apos;t close this page</span>
            )}
          </span>
        )}
        {state.status === 'complete' && result && (
          <span>
            {!hasFailures && <Cloud className="inline h-3 w-3 mr-1" />}
            {result.uploaded === 0 && result.skipped > 0 && result.failed === 0
              ? `All ${result.skipped} files already stored.`
              : <>
                  {result.uploaded > 0 && `${result.uploaded} synced. `}
                  {result.skipped > 0 && `${result.skipped} already stored. `}
                  {hasFailures && (
                    <>
                      {result.failed} failed
                      {isPartialSuccess ? '. ' : ' '}
                      {(() => {
                        const reason = extractErrorSummary(result.errors);
                        return reason ? (
                          <span className="hidden sm:inline text-amber-400/70">
                            — {reason}
                          </span>
                        ) : null;
                      })()}
                    </>
                  )}
                </>
            }
          </span>
        )}
        {state.status === 'error' && (
          <span>{error || 'Upload failed'}</span>
        )}
      </div>

      {/* Progress bar for uploading */}
      {state.status === 'uploading' && progress.bytesTotal > 0 && (
        <div className="hidden sm:block w-20 h-1.5 rounded-full bg-sky-500/20 overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.round((progress.bytesUploaded / progress.bytesTotal) * 100)}%` }}
          />
        </div>
      )}

      {/* Dismiss button */}
      {(state.status === 'complete' || state.status === 'error') && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
