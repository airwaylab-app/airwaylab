'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Disclaimer } from '@/components/common/disclaimer';
import { events } from '@/lib/analytics';
import {
  User,
  CreditCard,
  Database,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const TIER_CONFIG = {
  community: { label: 'Community', color: 'text-muted-foreground' },
  supporter: { label: 'Supporter', color: 'text-emerald-400' },
  champion: { label: 'Champion', color: 'text-amber-400' },
} as const;

interface UserDataStats {
  fileCount: number;
  totalBytes: number;
  nightCount: number;
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function AccountPage() {
  const { user, profile, tier, isPaid } = useAuth();

  const [stats, setStats] = useState<UserDataStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteState, setDeleteState] = useState<
    'idle' | 'deleting' | 'success' | 'error'
  >('idle');

  useEffect(() => {
    if (!user) return;

    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(false);
      try {
        const res = await fetch('/api/user-data-stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = (await res.json()) as UserDataStats;
        setStats(data);
      } catch {
        setStatsError(true);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  async function handleDeleteData() {
    setDeleteState('deleting');
    events.dataDeletionRequested(stats?.fileCount ?? 0, stats?.nightCount ?? 0);
    try {
      const res = await fetch('/api/delete-user-data', { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteState('success');
      setShowDeleteConfirm(false);
      setStats({ fileCount: 0, totalBytes: 0, nightCount: 0 });
      events.dataDeletionCompleted();
    } catch {
      setDeleteState('error');
    }
  }

  if (!user) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">Account Settings</h1>
        <p className="text-muted-foreground">
          Sign in to view your account settings.
        </p>
      </main>
    );
  }

  const currentTier = tier ?? 'community';
  const tierConfig = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.community;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-16 space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Display name</span>
            <span>{profile?.display_name ?? 'Not set'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Current plan</span>
            <span className={`font-medium ${tierConfig.color}`}>
              {tierConfig.label}
            </span>
          </div>
          {isPaid ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                try {
                  const res = await fetch('/api/customer-portal', { method: 'POST', credentials: 'same-origin' });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch { /* noop */ }
              }}
            >
              Manage subscription
            </Button>
          ) : (
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="w-full">
                Upgrade
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Your Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statsLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading data stats...
            </div>
          )}

          {statsError && (
            <p className="text-muted-foreground">
              Could not load data stats. Please try again later.
            </p>
          )}

          {stats && !statsLoading && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cloud storage</span>
                <span>
                  {stats.fileCount} {stats.fileCount === 1 ? 'file' : 'files'} ({formatMB(stats.totalBytes)} MB)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analysis data</span>
                <span>
                  {stats.nightCount} {stats.nightCount === 1 ? 'night' : 'nights'}
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            {deleteState === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                All server-side data has been deleted.
              </div>
            )}

            {deleteState === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="h-4 w-4" />
                Could not delete data. Please try again or contact us.
              </div>
            )}

            {!showDeleteConfirm && deleteState !== 'deleting' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete all my data
              </Button>
            )}

            {showDeleteConfirm && deleteState !== 'success' && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    This permanently deletes all data on our servers &mdash; EDF
                    files, analysis data, and contributions. Browser-local data
                    is not affected. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteData}
                    disabled={deleteState === 'deleting'}
                    className="flex-1"
                  >
                    {deleteState === 'deleting' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete my data'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteState('idle');
                    }}
                    disabled={deleteState === 'deleting'}
                    className="flex-1"
                  >
                    Keep my data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Disclaimer />
    </main>
  );
}
