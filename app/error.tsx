'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console for debugging; replace with error reporting service in production
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Your data is safe — all processing happens
          locally in your browser and nothing was lost.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/50">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={reset} variant="default" className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-3.5 w-3.5" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
