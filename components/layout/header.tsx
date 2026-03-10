'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Menu } from 'lucide-react';
import { GitHubStars } from '@/components/common/github-stars';
import { useAuth } from '@/lib/auth/auth-context';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthModal } from '@/components/auth/auth-modal';

export function Header() {
  const { user, isLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-warm-border bg-warm-white/80 backdrop-blur-xl sm:h-16">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-base font-bold text-brand-navy sm:text-lg">Airway</span>
            <span className="text-base font-normal text-brand-teal sm:text-lg">Lab</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/analyze"
              className="rounded-md px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:text-warm-charcoal sm:px-3 sm:py-2 sm:text-sm"
            >
              Analyze
            </Link>
            <Link
              href="/pricing"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:text-warm-charcoal sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:text-warm-charcoal sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              Blog
            </Link>
            <Link
              href="/about"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:text-warm-charcoal sm:inline-flex sm:px-3 sm:py-2 sm:text-sm"
            >
              About
            </Link>
            {/* Mobile: hamburger menu */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-0.5 rounded-md px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:text-warm-charcoal"
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
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-warm-border bg-warm-white/95 py-1 shadow-warm-md backdrop-blur-xl">
                    <Link
                      href="/pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-warm-gray transition-colors hover:text-warm-charcoal"
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/blog"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-warm-gray transition-colors hover:text-warm-charcoal"
                    >
                      Blog
                    </Link>
                    <Link
                      href="/about"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-warm-gray transition-colors hover:text-warm-charcoal"
                    >
                      About
                    </Link>
                    <a
                      href="https://github.com/airwaylab-app/airwaylab"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-warm-gray transition-colors hover:text-warm-charcoal"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                  </div>
                </>
              )}
            </div>
            {/* Desktop: star count badge */}
            <GitHubStars className="ml-0.5 hidden items-center gap-1.5 rounded-md border border-warm-border px-2.5 py-1.5 text-xs text-warm-gray transition-colors hover:border-warm-charcoal/20 hover:text-warm-charcoal sm:ml-1 sm:flex sm:px-3 sm:py-1.5 sm:text-sm" />

            {/* Auth: sign in or user menu */}
            {isLoading ? (
              <div className="ml-0.5 h-6 w-6 animate-pulse rounded-full bg-warm-cloud sm:ml-1" />
            ) : user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="ml-0.5 rounded-md bg-brand-teal/10 px-2.5 py-1.5 text-xs font-medium text-brand-teal transition-colors hover:bg-brand-teal/20 sm:ml-1 sm:px-3 sm:py-2 sm:text-sm"
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
