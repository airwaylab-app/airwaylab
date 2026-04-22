import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getGmailConfig } from '@/lib/gmail/client'
import { processFeedback } from '@/lib/services/feedback-processor'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/feedback-processor
 *
 * Runs daily at 07:00 UTC via Vercel Cron. Queries unprocessed feedback
 * from Supabase, groups by user email, creates consolidated Gmail drafts
 * on dev@airwaylab.app, and marks entries as processed.
 *
 * Protected by CRON_SECRET.
 * Silently skips (200 OK) when Gmail credentials are not configured.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gmailConfig = getGmailConfig()
  if (!gmailConfig) {
    console.error('[cron/feedback-processor] Gmail credentials not configured — skipping')
    return NextResponse.json({ skipped: true, reason: 'Gmail not configured' }, { status: 200 })
  }

  try {
    const result = await processFeedback(gmailConfig)

    console.error('[cron/feedback-processor] completed', {
      totalUnprocessed: result.totalUnprocessed,
      draftsCreated: result.draftsCreated,
      draftsSkipped: result.draftsSkipped,
      errors: result.errors.length,
    })

    return NextResponse.json({
      ok: true,
      totalUnprocessed: result.totalUnprocessed,
      emailsWithFeedback: result.emailsWithFeedback,
      draftsCreated: result.draftsCreated,
      draftsSkipped: result.draftsSkipped,
      errors: result.errors,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/feedback-processor] fatal error:', msg)
    Sentry.captureException(err, { tags: { cron: 'feedback-processor' } })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
