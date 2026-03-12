'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Link2, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SharedAnalysisError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { route: 'shared-view' } });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
        <Link2 className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <h1 className="mt-5 text-xl font-semibold">
        Unable to load this analysis
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Something went wrong loading this shared analysis. The link may be
        invalid or the data may have been corrupted.
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-muted-foreground/50">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" /> Try Again
        </Button>
        <Link href="/analyze">
          <Button className="gap-2">
            <Upload className="h-4 w-4" /> Upload Your SD Card
          </Button>
        </Link>
      </div>
    </div>
  );
}
