'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as Sentry from '@sentry/nextjs';
import { Loader2 } from 'lucide-react';

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? '';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  );
}

type LinkStatus = 'idle' | 'loading' | 'connected' | 'not_found' | 'already_linked' | 'discord_error' | 'error';

export function DiscordCard() {
  const { profile, tier, isPaid, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.discord_username ?? '');
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState(false);

  const isConnected = !!profile?.discord_id;
  const isFreeUser = !isPaid;

  async function handleLink() {
    const trimmed = username.trim();
    if (!trimmed) return;

    setLinkStatus('loading');
    setStatusMessage('');
    try {
      const res = await fetch('/api/auth/discord/link-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json() as {
        status?: string;
        message?: string;
        error?: string;
        discord_username?: string;
      };

      if (!res.ok) {
        setLinkStatus('error');
        setStatusMessage(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      if (data.status === 'connected') {
        setLinkStatus('connected');
        setStatusMessage('');
        await refreshProfile();
      } else if (data.status === 'not_found') {
        setLinkStatus('not_found');
        setStatusMessage(data.message ?? 'Username not found in the Discord server.');
      } else if (data.status === 'already_linked') {
        setLinkStatus('already_linked');
        setStatusMessage(data.message ?? 'This Discord account is already linked to another user.');
      } else if (data.status === 'discord_error') {
        setLinkStatus('discord_error');
        setStatusMessage(data.message ?? 'Could not reach Discord. Please try again in a few minutes.');
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'discord-link-username' } });
      setLinkStatus('error');
      setStatusMessage('Could not connect to Discord. Please try again.');
    }
  }

  async function handleUnlink() {
    setUnlinkLoading(true);
    setUnlinkError(false);
    try {
      const res = await fetch('/api/auth/discord/unlink', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Unlink failed (${res.status})`);
      setUsername('');
      setLinkStatus('idle');
      setStatusMessage('');
      await refreshProfile();
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'discord-unlink' } });
      setUnlinkError(true);
    } finally {
      setUnlinkLoading(false);
    }
  }

  // State 1: Free user -- faded card with upgrade nudge
  if (isFreeUser) {
    return (
      <Card className="opacity-60 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DiscordIcon className="h-5 w-5" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Join 100+ PAP users on Discord. Share insights, get help, and connect with the AirwayLab community.
          </p>
          <p className="text-xs text-muted-foreground">
            Available with Supporter and Champion plans.
          </p>
          <Link href="/pricing">
            <Button variant="outline" size="sm" className="w-full">
              View plans
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // State 3: Connected -- show username + disconnect
  if (isConnected) {
    return (
      <Card className="border-emerald-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DiscordIcon className="h-5 w-5 text-emerald-400" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Connected as</span>
            <span className="text-sm font-medium">{profile.discord_username}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You have access to the AirwayLab Discord
            {tier === 'champion' ? ', including the feature request channel' : ''}.
          </p>
          <div className="flex gap-2">
            {DISCORD_INVITE_URL && (
              <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Open Discord
                </Button>
              </a>
            )}
          </div>
          {unlinkError && (
            <p className="text-sm text-red-400 text-center">
              Could not disconnect. Please try again.
            </p>
          )}
          <button
            onClick={handleUnlink}
            disabled={unlinkLoading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            {unlinkLoading ? 'Disconnecting...' : 'Disconnect Discord'}
          </button>
        </CardContent>
      </Card>
    );
  }

  // State 2: Paid user, not connected -- username entry form
  return (
    <Card className="border-[hsl(var(--brand))]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DiscordIcon className="h-5 w-5 text-[hsl(var(--brand))]" />
          Community
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Join the AirwayLab Discord. Share insights, get help, and connect with the AirwayLab community.
        </p>

        {/* Step 1: Join the server */}
        {DISCORD_INVITE_URL && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Step 1: Join the server</p>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white">
                <DiscordIcon className="h-4 w-4 mr-2" />
                Join Discord Server
              </Button>
            </a>
          </div>
        )}

        {/* Step 2: Enter username */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {DISCORD_INVITE_URL ? 'Step 2: Enter your Discord username' : 'Enter your Discord username'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                // Reset status when user edits
                if (linkStatus !== 'idle' && linkStatus !== 'loading') {
                  setLinkStatus('idle');
                  setStatusMessage('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && username.trim() && linkStatus !== 'loading') {
                  handleLink();
                }
              }}
              placeholder="your_username"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={linkStatus === 'loading'}
              aria-label="Discord username"
            />
            <Button
              size="sm"
              onClick={handleLink}
              disabled={!username.trim() || linkStatus === 'loading'}
              className="shrink-0"
            >
              {linkStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Connect'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your Discord username (not your display name). Find it in Discord under Settings &gt; My Account.
          </p>
        </div>

        {/* Status messages */}
        {linkStatus === 'not_found' && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-sm text-amber-400">{statusMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your username has been saved. Once you join the server, come back and click Connect again.
            </p>
          </div>
        )}

        {linkStatus === 'discord_error' && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-sm text-amber-400">{statusMessage}</p>
          </div>
        )}

        {linkStatus === 'already_linked' && (
          <p className="text-sm text-red-400">{statusMessage}</p>
        )}

        {linkStatus === 'error' && (
          <p className="text-sm text-red-400">{statusMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
