'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface AIKeyInputProps {
  onActivate: (key: string) => void;
}

export function AIKeyInput({ onActivate }: AIKeyInputProps) {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    localStorage.setItem('airwaylab_ai_key', trimmed);
    onActivate(trimmed);
  };

  return (
    <div className="rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary/60" />
        <span className="text-sm font-medium text-foreground">
          Unlock AI-powered insights
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        AirwayLab can generate personalised therapy suggestions using AI. This feature
        is in early beta — if you received a key from us, enter it below. Your key is
        stored locally and never sent to our servers.
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter API key"
          className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" size="sm" className="h-8">
          Activate
        </Button>
      </form>
    </div>
  );
}
