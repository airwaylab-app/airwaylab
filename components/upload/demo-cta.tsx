'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoCTAProps {
  onLoadDemo: () => void;
}

export function DemoCTA({ onLoadDemo }: DemoCTAProps) {
  return (
    <div className="mb-5 flex flex-col items-center gap-4">
      <Button
        variant="outline"
        size="default"
        onClick={onLoadDemo}
        aria-label="Load 7-night sample dataset — no file needed"
        className="gap-2"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        See a demo analysis — no file needed →
      </Button>
      <div className="flex w-full items-center gap-3 text-[11px] text-muted-foreground/50">
        <div className="h-px flex-1 bg-border/50" />
        <span>or upload your own data</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>
    </div>
  );
}
