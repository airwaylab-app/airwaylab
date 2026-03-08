'use client';

import Link from 'next/link';
import { Moon, ExternalLink } from 'lucide-react';

export function Header() {
  return (
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
            href="/about"
            className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3 sm:py-2 sm:text-sm"
          >
            About
          </Link>
          <a
            href="https://github.com/airwaylab-app/airwaylab"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-0.5 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:ml-1 sm:px-3 sm:py-2 sm:text-sm"
          >
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </nav>
      </div>
    </header>
  );
}
