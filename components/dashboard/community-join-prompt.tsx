'use client';

import { useEffect, useState } from 'react';
import { X, MessageSquare, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

const DISMISSED_KEY = 'airwaylab_community_prompt_dismissed';

interface CommunityJoinPromptProps {
  sessionCount: number;
  isDemo: boolean;
}

export function CommunityJoinPrompt({ sessionCount, isDemo }: CommunityJoinPromptProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    if (isDemo) return;
    if (sessionCount > 5) return;
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) {
        setDismissed(false);
        events.communityPromptShown();
      }
    } catch {
      // localStorage unavailable — stay hidden
    }
  }, [sessionCount, isDemo]);

  if (dismissed || isDemo) return null;

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // localStorage write failure is non-critical — prompt stays dismissed in memory for this session
    }
    setDismissed(true);
    events.communityPromptDismissed();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Join the AirwayLab community</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ask questions, share your experience, and help others optimise their PAP therapy.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href="https://github.com/airwaylab-app/airwaylab/discussions"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => events.communityPromptGitHubClicked()}
        >
          <Button variant="outline" size="sm" className="gap-1.5">
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            GitHub Discussions
          </Button>
        </a>
        <a
          href="https://discord.gg/airwaylab"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => events.communityPromptDiscordClicked()}
        >
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Discord
          </Button>
        </a>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss community prompt"
          className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
