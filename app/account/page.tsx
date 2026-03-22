'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Disclaimer } from '@/components/common/disclaimer';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import { CloudSyncToggle } from '@/components/upload/cloud-sync-nudge';
import { DiscordCard } from '@/components/auth/discord-card';
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

const DISCORD_STATUS_MESSAGES: Record<string, { text: string; color: string }> = {
  connected: { text: 'Discord connected successfully.', color: 'text-emerald-400' },
  error: { text: 'Could not connect Discord. Please try again.', color: 'text-red-400' },
  cancelled: { text: 'Discord connection cancelled.', color: 'text-muted-foreground' },
  already_linked: { text: 'This Discord account is already linked to another user.', color: 'text-red-400' },
};

export default function AccountPage() {
  const { user, profile, tier, isPaid } = useAuth();
  const searchParams = useSearchParams();

  const [stats, setStats] = useState<UserDataStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(false);

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
        const res = await fetch('/api/user-data-stats', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`Failed to fetch stats (${res.status})`);
        const data = (await res.json()) as UserDataStats;
        setStats(data);
      } catch (err) {
        Sentry.captureException(err, { tags: { action: 'fetch-user-stats' } });
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
      const res = await fetch('/api/delete-user-data', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error || `Delete failed (${res.status})`);
      }
      setDeleteState('success');
      setShowDeleteConfirm(false);
      setStats({ fileCount: 0, totalBytes: 0, nightCount: 0 });
      events.dataDeletionCompleted();
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'delete-user-data' } });
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

      {/* Discord OAuth callback status */}
      {searchParams.get('discord') && DISCORD_STATUS_MESSAGES[searchParams.get('discord')!] && (
        <p className={`text-sm ${DISCORD_STATUS_MESSAGES[searchParams.get('discord')!]!.color}`}>
          {DISCORD_STATUS_MESSAGES[searchParams.get('discord')!]!.text}
        </p>
      )}

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
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={portalLoading}
                onClick={async () => {
                  setPortalLoading(true);
                  setPortalError(false);
                  try {
                    const res = await fetch('/api/customer-portal', { method: 'POST', credentials: 'same-origin' });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      setPortalError(true);
                    }
                  } catch (err) {
                    Sentry.captureException(err, { tags: { action: 'customer-portal' } });
                    setPortalError(true);
                  } finally {
                    setPortalLoading(false);
                  }
                }}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening portal...
                  </>
                ) : (
                  'Manage subscription'
                )}
              </Button>
              {portalError && (
                <p className="text-sm text-red-400 text-center">
                  Could not open billing portal. Please try again or contact us via the <a href="/contact" className="underline">contact form</a>.
                </p>
              )}
            </div>
          ) : (
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="w-full">
                Upgrade
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Discord Community */}
      <DiscordCard />

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
              <div className="flex justify-between items-center pt-1">
                <CloudSyncToggle />
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
                    This permanently deletes your health data from our servers
                    &mdash; uploaded EDF files and stored analysis results.
                    Anonymised research contributions are not affected.
                    Browser-local data is not affected. This cannot be undone.
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
