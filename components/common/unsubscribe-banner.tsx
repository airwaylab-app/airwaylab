'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

/**
 * Shows confirmation/error banner after email unsubscribe redirect.
 * Reads `unsubscribe` query param: success | invalid | error.
 */
export function UnsubscribeBanner() {
  const searchParams = useSearchParams();
  const status = searchParams.get('unsubscribe');

  if (!status) return null;

  if (status === 'success') {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Unsubscribed.</span>{' '}
          You won&apos;t receive any more emails from AirwayLab.
        </p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Invalid unsubscribe link.</span>{' '}
          The link may have expired. Contact us below if you need help unsubscribing.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Something went wrong.</span>{' '}
        Please contact us below and we&apos;ll unsubscribe you manually.
      </p>
    </div>
  );
}
