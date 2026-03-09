'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  text: string;
  defaultExpanded?: boolean;
}

export function MetricExplanation({ text, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!text) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        What this means
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {text.split('\n\n').map((paragraph, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : undefined}>
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
