'use client';

import { useEffect, useState } from 'react';
import { Cloud, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { uploadOrchestrator } from '@/lib/storage/upload-orchestrator';
import type { UploadState } from '@/lib/storage/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Slim banner showing cloud upload progress.
 * Auto-dismisses after upload completes successfully.
 */
export function StorageProgressBanner() {
  const [state, setState] = useState<UploadState>(uploadOrchestrator.getState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return uploadOrchestrator.subscribe(setState);
  }, []);

  // Auto-dismiss after 8 seconds on success
  useEffect(() => {
    if (state.status === 'complete' && state.result && state.result.failed === 0) {
      const timer = setTimeout(() => setDismissed(true), 8000);
      return () => clearTimeout(timer);
    }
    // Reset dismiss on new upload
    if (state.status === 'hashing' || state.status === 'uploading') {
      setDismissed(false);
    }
  }, [state.status, state.result]);

  // Don't show when idle or dismissed
  if (state.status === 'idle' || dismissed) return null;

  const { progress, result, error } = state;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs ${
      state.status === 'error'
        ? 'border-red-500/20 bg-red-500/5 text-red-400'
        : state.status === 'complete'
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
          : 'border-sky-500/20 bg-sky-500/5 text-sky-400'
    }`}>
      {/* Icon */}
      {state.status === 'error' ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : state.status === 'complete' ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      )}

      {/* Message */}
      <div className="flex-1 min-w-0">
        {state.status === 'hashing' && (
          <span>Preparing files... ({progress.current}/{progress.total})</span>
        )}
        {state.status === 'checking' && (
          <span>Checking for duplicates...</span>
        )}
        {state.status === 'uploading' && (
          <span>
            Syncing to cloud... {progress.current}/{progress.total} files
            ({formatBytes(progress.bytesUploaded)} / {formatBytes(progress.bytesTotal)})
          </span>
        )}
        {state.status === 'complete' && result && (
          <span>
            <Cloud className="inline h-3 w-3 mr-1" />
            {result.uploaded > 0 && `${result.uploaded} files synced. `}
            {result.skipped > 0 && `${result.skipped} already stored. `}
            {result.failed > 0 && `${result.failed} failed. `}
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
