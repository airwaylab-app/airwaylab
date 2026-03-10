'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Moon, Github } from 'lucide-react';
import { GitHubStars } from '@/components/common/github-stars';
import { useAuth } from '@/lib/auth/auth-context';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthModal } from '@/components/auth/auth-modal';

export function Header() {
  const { user, isLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl sm:h-16">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8">
              <Moon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight sm:text-base">AirwayLab</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/analyze"
              className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3 sm:py-2 sm:text-sm"
            >
              Analyze
            </Link>
            <Link
              href="/pricing"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              Blog
            </Link>
            <Link
              href="/about"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              About
            </Link>
            {/* Desktop: star count badge */}
            <GitHubStars className="ml-0.5 hidden items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground sm:ml-1 sm:flex sm:px-3 sm:py-1.5 sm:text-sm" />
            {/* Mobile: compact GitHub icon */}
            <a
              href="https://github.com/airwaylab-app/airwaylab"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-0.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
            >
              <Github className="h-3.5 w-3.5" />
            </a>

            {/* Auth: sign in or user menu */}
            {isLoading ? (
              <div className="ml-0.5 h-6 w-6 animate-pulse rounded-full bg-muted/50 sm:ml-1" />
            ) : user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="ml-0.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:ml-1 sm:px-3 sm:py-2 sm:text-sm"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
