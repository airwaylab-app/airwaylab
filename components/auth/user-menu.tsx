'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, type Tier } from '@/lib/auth/auth-context';
import { User, LogOut, CreditCard, Crown, Heart, Loader2 } from 'lucide-react';

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

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await signOut();
  }, [signOut]);

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
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <TierIcon className={`h-3 w-3 ${tierCfg.color}`} />
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-background py-1 shadow-xl">
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
            <button
              onClick={handleSignOut}
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
