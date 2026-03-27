'use client'

import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackButtonProps {
  onClick: () => void
  className?: string
}

export function FeedbackButton({ onClick, className }: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm',
        'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
        className,
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="hidden xs:inline sm:inline">Feedback</span>
    </button>
  )
}
