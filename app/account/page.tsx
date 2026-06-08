'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Disclaimer } from '@/components/common/disclaimer';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import { CloudSyncToggle } from '@/components/upload/cloud-sync-nudge';
import { DataContributionToggle } from '@/components/account/data-contribution-toggle';
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
  HardDrive,
} from 'lucide-react';
import { clearAllLocalData } from '@/lib/clear-local-data';

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

function DiscordStatusBanner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('discord');
  if (!status) return null;
  // Legacy OAuth callback params — kept for backwards compatibility
  const messages: Record<string, { text: string; color: string }> = {
    connected: { text: 'Discord connected successfully.', color: 'text-emerald-400' },
    error: { text: 'Could not connect Discord. Enter your username below to try again.', color: 'text-red-400' },
  };
  const msg = messages[status];
  if (!msg) return null;
  return <p className={`text-sm ${msg.color}`}>{msg.text}</p>;
}

/**
 * Auto-initiate Discord OAuth when arriving from email CTA (?connect=discord).
 * Only triggers for paid users who haven't connected Discord yet.
 */
function DiscordAutoConnect() {
  const searchParams = useSearchParams();
  const { profile, isPaid } = useAuth();
  const connectParam = searchParams.get('connect');

  useEffect(() => {
    if (connectParam !== 'discord') return;
    if (!isPaid) return;
    if (profile?.discord_id) return; // Already connected

    // Auto-redirect to Discord OAuth
    window.location.href = '/api/auth/discord';
  }, [connectParam, isPaid, profile?.discord_id]);

  return null;
}

export default function AccountPage() {
  const { user, profile, tier, isPaid } = useAuth();

  const [stats, setStats] = useState<UserDataStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteState, setDeleteState] = useState<
    'idle' | 'deleting' | 'success' | 'error'
  >('idle');

  const [clearState, setClearState] = useState<'idle' | 'clearing' | 'cleared' | 'error'>('idle');

  async function handleClearLocal() {
    setClearState('clearing');
    try {
      await clearAllLocalData();
      setClearState('cleared');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'clear-local-data-account' } });
      setClearState('error');
    }
  }

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
      // The auth user no longer exists — this session is now invalid. Send the
      // user home rather than leave them on a page logged into a deleted account.
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
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

      {/* Discord OAuth callback status + auto-connect from email */}
      <Suspense>
        <DiscordStatusBanner />
        <DiscordAutoConnect />
      </Suspense>

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
              <div className="pt-1">
                <DataContributionToggle />
              </div>
            </div>
          )}

          {/* Free up space — non-destructive, clears browser-local data only */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Browser storage
                </p>
                <p className="text-xs text-muted-foreground">
                  Frees local space on this device and fixes a &ldquo;Storage limit
                  reached&rdquo; message. Does <span className="font-medium">not</span> delete
                  your account or your data on our servers.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleClearLocal}
                disabled={clearState === 'clearing'}
              >
                {clearState === 'clearing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear browser storage'
                )}
              </Button>
            </div>
            {clearState === 'cleared' && (
              <p className="text-xs text-emerald-400">
                Browser storage cleared. Re-upload your SD card to view your data again.
              </p>
            )}
            {clearState === 'error' && (
              <p className="text-xs text-red-400">Could not clear browser storage. Please try again.</p>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            {deleteState === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Your account has been deleted. Redirecting...
              </div>
            )}

            {deleteState === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="h-4 w-4" />
                Could not delete data. Please try again or contact us.
              </div>
            )}

            {!showDeleteConfirm && deleteState !== 'deleting' && deleteState !== 'success' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete my account
              </Button>
            )}

            {showDeleteConfirm && deleteState !== 'success' && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      This deletes your entire account, not just files.
                    </p>
                    <p>
                      It permanently removes your AirwayLab account and all health
                      data on our servers &mdash; uploaded EDF files and stored
                      analysis results. You would need to sign up again to return.
                    </p>
                    {isPaid && (
                      <p className="font-medium text-red-400">
                        Your active {tierConfig.label} subscription will be
                        cancelled &mdash; paid features end immediately, you will
                        not be billed again, and you would need to subscribe again
                        to restore it.
                      </p>
                    )}
                    <p>
                      Anonymised research contributions are not affected. This does
                      not clear your browser-local data, so it will not fix a
                      &ldquo;Storage limit reached&rdquo; message (that is your
                      browser&rsquo;s cache, not your account). This cannot be undone.
                    </p>
                  </div>
                </div>
                {isPaid && (
                  <div className="space-y-1">
                    <label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
                      Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      autoComplete="off"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      disabled={deleteState === 'deleting'}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteData}
                    disabled={deleteState === 'deleting' || (isPaid && confirmText.trim().toUpperCase() !== 'DELETE')}
                    className="flex-1"
                  >
                    {deleteState === 'deleting' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete my account'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmText('');
                      setDeleteState('idle');
                    }}
                    disabled={deleteState === 'deleting'}
                    className="flex-1"
                  >
                    Keep my account
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
