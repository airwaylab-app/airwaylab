'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoCTAProps {
  onLoadDemo: () => void;
}

export function DemoCTA({ onLoadDemo }: DemoCTAProps) {
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
        <div className="h-px flex-1 bg-border/50" />
        <span>or</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <Button
        variant="outline"
        size="default"
        onClick={onLoadDemo}
        aria-label="Load 7-night sample dataset"
        className="gap-2"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Try sample data
      </Button>
      <p className="text-[11px] text-muted-foreground/50">
        7 nights of example BiPAP data - no file needed
      </p>
    </div>
  );
}
