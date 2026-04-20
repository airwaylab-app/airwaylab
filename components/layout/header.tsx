'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Github, Menu, ChevronDown, Settings } from 'lucide-react';
import { GitHubStars } from '@/components/common/github-stars';
import { useAuth } from '@/lib/auth/auth-context';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthModal } from '@/components/auth/auth-modal';
import { FeedbackButton } from '@/components/feedback/feedback-button';
import { FeedbackPanel } from '@/components/feedback/feedback-panel';
import { cn } from '@/lib/utils';

const PRIMARY_NAV: { href: string; label: string; alwaysVisible?: boolean }[] = [
  { href: '/analyze', label: 'Analyze', alwaysVisible: true },
  { href: '/blog', label: 'Blog' },
  { href: '/community', label: 'Community' },
  { href: '/pricing', label: 'Pricing' },
];

const MORE_NAV = [
  { href: '/getting-started', label: 'Getting Started' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/providers', label: 'For Providers' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: "What's New" },
];

const MOBILE_NAV = [
  { href: '/analyze', label: 'Analyze' },
  { href: '/blog', label: 'Blog' },
  { href: '/community', label: 'Community' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/getting-started', label: 'Getting Started' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/providers', label: 'For Providers' },
  { href: '/about', label: 'About' },
  { href: '/changelog', label: "What's New" },
];

export function Header() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Close "More" dropdown on Escape
  useEffect(() => {
    if (!moreMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreMenuOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreMenuOpen]);

  const checkActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isMoreActive = MORE_NAV.some(({ href }) => checkActive(href));

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl sm:h-16">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8">
              <Moon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight sm:text-base">
              <span className="text-foreground">Airway</span>
              <span className="font-normal text-brand-teal">Lab</span>
            </span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-400">
              beta
            </span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-0.5 sm:gap-1">
            {/* Primary nav links */}
            {PRIMARY_NAV.map(({ href, label, alwaysVisible }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs transition-colors sm:px-3 sm:py-2 sm:text-sm',
                  !alwaysVisible && 'hidden sm:inline-flex',
                  checkActive(href)
                    ? 'bg-accent/50 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {label}
              </Link>
            ))}

            {/* Desktop: "More" dropdown */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-3 py-2 text-sm transition-colors',
                  isMoreActive || moreMenuOpen
                    ? 'bg-accent/50 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-expanded={moreMenuOpen}
                aria-haspopup="true"
              >
                More
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', moreMenuOpen && 'rotate-180')} />
              </button>
              {moreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border/50 bg-background/95 py-1 shadow-lg backdrop-blur-xl"
                  >
                    {MORE_NAV.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          'block px-4 py-2 text-sm transition-colors',
                          checkActive(href)
                            ? 'bg-accent/50 text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mobile: hamburger menu */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-0.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border/50 bg-background/95 py-1 shadow-lg backdrop-blur-xl">
                    {MOBILE_NAV.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'block px-4 py-2 text-sm transition-colors',
                          checkActive(href)
                            ? 'bg-accent/50 text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                    <a
                      href="https://github.com/airwaylab-app/airwaylab"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* Feedback button */}
            <FeedbackButton onClick={() => setFeedbackOpen(true)} className="ml-0.5 sm:ml-1" />

            {/* Desktop: star count badge */}
            <GitHubStars className="ml-0.5 hidden items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground sm:ml-1 sm:flex sm:px-3 sm:py-1.5 sm:text-sm" />

            {/* Auth: sign in or user menu */}
            {isLoading ? (
              <div className="ml-0.5 h-6 w-6 animate-pulse rounded-full bg-muted/50 sm:ml-1" />
            ) : user ? (
              <UserMenu />
            ) : (
              <div className="ml-0.5 flex items-center gap-0.5 sm:ml-1">
                <Link
                  href="/settings"
                  className="rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="App settings"
                >
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="h-9 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Sign in
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
