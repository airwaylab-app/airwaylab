'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, type Tier } from '@/lib/auth/auth-context';
import { User, LogOut, CreditCard, Crown, Heart, Loader2, Trash2 } from 'lucide-react';

const TIER_CONFIG: Record<Tier, { label: string; color: string; icon: typeof Heart }> = {
  community: { label: 'Community', color: 'text-muted-foreground', icon: User },
  supporter: { label: 'Supporter', color: 'text-emerald-400', icon: Heart },
  champion: { label: 'Champion', color: 'text-amber-400', icon: Crown },
};

export function UserMenu() {
  const { user, profile, tier, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Keyboard navigation (Escape + arrow keys)
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const menu = menuRef.current?.querySelector('[role="menu"]');
      if (!menu) return;
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      let next: number;
      if (e.key === 'ArrowDown') next = current < items.length - 1 ? current + 1 : 0;
      else if (e.key === 'ArrowUp') next = current > 0 ? current - 1 : items.length - 1;
      else if (e.key === 'Home') next = 0;
      else next = items.length - 1;
      items[next]?.focus();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await signOut();
  }, [signOut]);

  const handleDeleteRequest = useCallback(async () => {
    setDeleteState('loading');
    try {
      const res = await fetch('/api/request-account-deletion', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setDeleteState('done');
      } else {
        setDeleteState('error');
      }
    } catch {
      console.error('[user-menu] Failed to request account deletion');
      setDeleteState('error');
    }
  }, []);

  const handlePortal = useCallback(async () => {
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
    } catch {
      console.error('[user-menu] Failed to open billing portal');
      setPortalError(true);
    } finally {
      setPortalLoading(false);
    }
  }, []);

  if (!user) return null;

  const tierCfg = TIER_CONFIG[tier];
  const TierIcon = tierCfg.icon;
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:text-sm"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <TierIcon className={`h-3 w-3 ${tierCfg.color}`} />
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-background py-1 shadow-xl">
          {/* User info */}
          <div className="border-b border-border/50 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium ${tierCfg.color}`}>
              <TierIcon className="h-2.5 w-2.5" />
              {tierCfg.label}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {tier === 'community' && (
              <Link
                href="/pricing"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Heart className="h-3.5 w-3.5" />
                Support AirwayLab
              </Link>
            )}

            {(tier === 'supporter' || tier === 'champion') && (
              <>
                <button
                  onClick={handlePortal}
                  role="menuitem"
                  disabled={portalLoading}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {portalLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" />
                  )}
                  Manage subscription
                </button>
                {portalError && (
                  <p className="px-3 py-1 text-[10px] text-red-400">
                    Could not open billing portal. Please try again.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border/50 py-1">
            {deleteState === 'done' ? (
              <p className="px-3 py-2 text-[10px] leading-snug text-emerald-400">
                Deletion request received. We&apos;ll process it within 30 days.
              </p>
            ) : deleteState === 'confirm' ? (
              <div className="px-3 py-2">
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Are you sure? This will send a deletion request to our team.
                </p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={handleDeleteRequest}
                    className="rounded bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Yes, delete my account
                  </button>
                  <button
                    onClick={() => setDeleteState('idle')}
                    className="rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : deleteState === 'error' ? (
              <div className="px-3 py-2">
                <p className="text-[10px] text-red-400">
                  Could not submit request. Please try again.
                </p>
                <button
                  onClick={() => setDeleteState('idle')}
                  className="mt-1 text-[10px] text-muted-foreground underline"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteState('confirm')}
                role="menuitem"
                disabled={deleteState === 'loading'}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-red-400 disabled:opacity-50"
              >
                {deleteState === 'loading' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Request account deletion
              </button>
            )}

            <button
              onClick={handleSignOut}
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
