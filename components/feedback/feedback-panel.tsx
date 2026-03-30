'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, CheckCircle, Bug, Lightbulb, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/auth-context'
import { useFocusTrap } from '@/hooks/use-focus-trap'
import { gatherFeedbackContext } from '@/lib/feedback-context'
import { events } from '@/lib/analytics'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const TYPES = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Idea', icon: Lightbulb },
  { value: 'feedback', label: 'Other', icon: MessageCircle },
] as const

type FeedbackType = (typeof TYPES)[number]['value']

const MAX_CHARS = 500

export function FeedbackPanel({ open, onClose }: Props) {
  const { user, profile } = useAuth()
  const focusTrapRef = useFocusTrap(open)

  const [type, setType] = useState<FeedbackType>('feedback')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [contactOk, setContactOk] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'rate_limited'>('idle')

  // Callbacks first (referenced by effects below)
  const handleClose = useCallback(() => {
    onClose()
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
      setEmail('')
      setType('feedback')
    }, 200)
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim()
    if (trimmed.length < 5) return

    setStatus('sending')

    try {
      const metadata = gatherFeedbackContext(profile)
      const page = typeof window !== 'undefined' ? window.location.pathname : null

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          email: user ? profile?.email ?? null : email.trim() || null,
          type,
          page,
          user_id: user?.id ?? null,
          contact_ok: contactOk,
          metadata,
        }),
      })

      if (res.ok) {
        setStatus('success')
        events.feedbackSubmitted(type, typeof window !== 'undefined' ? window.location.pathname : '/')
      } else if (res.status === 429) {
        setStatus('rate_limited')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [message, email, type, user, profile, contactOk])

  // Pre-fill contact checkbox when signed in
  useEffect(() => {
    if (user) setContactOk(true)
  }, [user])

  // ESC to close, Cmd/Ctrl+Enter to submit
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const trimmed = message.trim()
        if (trimmed.length >= 5 && status !== 'sending') {
          handleSubmit()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, message, status, handleSubmit])

  // Auto-close after success
  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => {
      handleClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [status, handleClose])

  if (!open) return null

  const remaining = MAX_CHARS - message.length
  const canSubmit = message.trim().length >= 5 && status !== 'sending'

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel — right slide-in on desktop, bottom sheet on mobile */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share your feedback"
        className={cn(
          'fixed z-50 flex flex-col border border-border/50 bg-card shadow-xl',
          // Mobile: bottom sheet
          'left-0 right-0 bottom-0 max-h-[85vh] rounded-t-xl',
          // Desktop: right slide-in panel
          'sm:left-auto sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[380px] sm:rounded-t-none sm:rounded-l-xl sm:border-r-0',
          // Animations
          'animate-in fade-in-0 slide-in-from-bottom sm:slide-in-from-bottom-0 sm:slide-in-from-right',
        )}
      >
        {/* Mobile drag indicator */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h2 className="text-sm font-semibold">Share your feedback</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:text-foreground"
            aria-label="Close feedback panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {status === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Thanks — we read every message.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your feedback helps shape AirwayLab&apos;s development.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {TYPES.map((t) => {
                  const Icon = t.icon
                  const isActive = type === t.value
                  return (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-primary/30 bg-primary/5 text-foreground'
                          : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Message textarea */}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="What's on your mind?"
                  aria-label="Feedback message"
                  disabled={status === 'sending'}
                  className="h-28 w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                  maxLength={MAX_CHARS}
                />
                <div className="mt-1 flex justify-between">
                  <span className="text-[10px] text-muted-foreground/40">
                    {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
                  </span>
                  <span
                    className={cn(
                      'text-[10px]',
                      remaining < 20 ? 'text-red-400' : remaining < 50 ? 'text-amber-400' : 'text-muted-foreground/50',
                    )}
                  >
                    {remaining}
                  </span>
                </div>
              </div>

              {/* Email */}
              {user ? (
                <input
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  aria-label="Your email address"
                  className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                />
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  aria-label="Email address (optional)"
                  disabled={status === 'sending'}
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
                />
              )}

              {/* Contact checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactOk}
                  onChange={(e) => setContactOk(e.target.checked)}
                  disabled={status === 'sending'}
                  className="mt-0.5 h-4 w-4 rounded border-border/50 bg-background accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Allow AirwayLab to contact me for follow-up questions
                </span>
              </label>

              {/* Error messages */}
              {status === 'error' && (
                <p role="alert" className="text-xs text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}
              {status === 'rate_limited' && (
                <p role="alert" className="text-xs text-amber-400">
                  You&apos;ve sent a few messages recently. Please try again in a bit.
                </p>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full gap-1.5"
                size="sm"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(panel, document.body)
}
