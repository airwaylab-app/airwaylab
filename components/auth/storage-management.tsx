'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cloud, Trash2, Loader2, AlertCircle, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';
import type { StorageUsage } from '@/lib/storage/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Storage management panel for account settings.
 * Shows usage, allows deletion of stored files.
 */
export function StorageManagement() {
  const { user, tier } = useAuth();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/files/usage', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && canAccess('raw_storage', tier)) {
      fetchUsage();
    } else {
      setLoading(false);
    }
  }, [user, tier, fetchUsage]);

  const handleDeleteAll = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ deleteAll: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(data.error);
      }

      setConfirmDelete(false);
      await fetchUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setDeleting(false);
    }
  }, [fetchUsage]);

  if (!user || !canAccess('raw_storage', tier)) return null;
  if (loading) return null;

  const usagePercent = usage && usage.quotaBytes > 0
    ? Math.round((usage.totalBytes / usage.quotaBytes) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-4 w-4 text-sky-400" />
        <h3 className="text-sm font-medium">Cloud Storage</h3>
      </div>

      {usage && usage.fileCount > 0 ? (
        <>
          {/* Usage bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{formatBytes(usage.totalBytes)} of {formatBytes(usage.quotaBytes)} used</span>
              <span>{usage.fileCount} files</span>
            </div>
            <div className="h-2 rounded-full bg-border/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          </div>

          {/* Delete all */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-red-400">This will permanently delete all your stored files.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="gap-1.5 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Confirm delete
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="h-3 w-3" />
              Delete all stored files
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" />
          <span>
            No files stored yet. Enable &quot;Store my SD card data&quot; on your next upload to keep your waveforms in the cloud.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
