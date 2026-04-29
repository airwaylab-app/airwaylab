/**
 * Feedback processor service.
 *
 * Queries unprocessed feedback from Supabase, groups entries by user email,
 * creates consolidated Gmail drafts on dev@airwaylab.app, and marks rows
 * as processed. Designed for daily cron execution.
 *
 * Per-user error resilience: a draft failure for one email address does not
 * prevent processing of other addresses.
 */

import * as Sentry from '@sentry/nextjs'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { createGmailDraft, refreshAccessToken } from '@/lib/gmail/client'
import type { GmailConfig } from '@/lib/gmail/client'

// ── Types ────────────────────────────────────────────────────

export interface FeedbackRow {
  id: string
  message: string
  email: string | null
  type: string | null
  page: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

export interface ProcessingResult {
  totalUnprocessed: number
  emailsWithFeedback: number
  draftsCreated: number
  draftsSkipped: number
  errors: string[]
}

// ── Helpers ──────────────────────────────────────────────────

/** Normalise email to lowercase for consistent grouping. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Groups feedback rows by normalised email address. Rows without an email are excluded. */
export function groupByEmail(rows: FeedbackRow[]): Map<string, FeedbackRow[]> {
  const groups = new Map<string, FeedbackRow[]>()
  for (const row of rows) {
    if (!row.email) continue
    const key = normaliseEmail(row.email)
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return groups
}

const TYPE_LABELS: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug report',
  support: 'Support request',
  feedback: 'Feedback',
}

/** Builds the Gmail draft body for a group of feedback rows from the same email. */
export function buildDraftBody(email: string, rows: FeedbackRow[]): string {
  const lines: string[] = [
    `Feedback from: ${email}`,
    `Count: ${rows.length} item${rows.length === 1 ? '' : 's'}`,
    '',
    '─'.repeat(60),
  ]

  for (const row of rows) {
    const label = TYPE_LABELS[row.type ?? ''] ?? 'Feedback'
    const date = new Date(row.created_at).toUTCString()
    lines.push(`\n[${label}] ${date}`)
    if (row.page) lines.push(`Page: ${row.page}`)
    lines.push(`\n${row.message}`)
    lines.push('─'.repeat(60))
  }

  lines.push('\nThis draft was generated automatically by the AirwayLab feedback processor.')
  return lines.join('\n')
}

// ── Main processor ───────────────────────────────────────────

/**
 * Processes all unprocessed feedback rows.
 *
 * Steps:
 * 1. Query feedback rows where processed = false
 * 2. Group by email (rows without email are marked processed without a draft)
 * 3. Refresh Gmail access token once
 * 4. For each email group: create a consolidated Gmail draft
 * 5. Mark all successfully processed rows as done
 */
export async function processFeedback(gmailConfig: GmailConfig): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    totalUnprocessed: 0,
    emailsWithFeedback: 0,
    draftsCreated: 0,
    draftsSkipped: 0,
    errors: [],
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Step 1: Fetch all unprocessed feedback where the user consented to contact
  const { data: rows, error: fetchError } = await supabase
    .from('feedback')
    .select('id, message, email, type, page, created_at, metadata')
    .eq('processed', false)
    .eq('contact_ok', true)
    .order('created_at', { ascending: true })

  if (fetchError) {
    throw new Error(`Failed to query feedback: ${fetchError.message}`)
  }

  const feedbackRows = (rows ?? []) as FeedbackRow[]
  result.totalUnprocessed = feedbackRows.length

  if (feedbackRows.length === 0) {
    return result
  }

  // Rows with no email: mark processed immediately (no draft needed)
  const noEmailIds = feedbackRows.filter((r) => !r.email).map((r) => r.id)
  const emailRows = feedbackRows.filter((r) => !!r.email)

  // Step 2: Group by email
  const groups = groupByEmail(emailRows)
  result.emailsWithFeedback = groups.size

  // Step 3: Refresh Gmail access token once for the batch
  let accessToken: string
  try {
    accessToken = await refreshAccessToken(gmailConfig)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    Sentry.captureException(err, { tags: { cron: 'feedback-processor' } })
    throw new Error(`Gmail token refresh failed: ${msg}`)
  }

  // Step 4: Create drafts per email group (per-user error resilience)
  const successfulIds: string[] = [...noEmailIds]

  for (const [email, groupRows] of groups) {
    try {
      const body = buildDraftBody(email, groupRows)
      const subject = `Feedback from ${email} (${groupRows.length} item${groupRows.length === 1 ? '' : 's'})`

      await createGmailDraft(accessToken, {
        to: 'dev@airwaylab.app',
        subject,
        body,
      })

      successfulIds.push(...groupRows.map((r) => r.id))
      result.draftsCreated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`${email}: ${msg}`)
      result.draftsSkipped++
      Sentry.captureException(err, {
        tags: { cron: 'feedback-processor' },
        extra: { email, rowCount: groupRows.length },
      })
    }
  }

  // Step 5: Mark successfully processed rows
  if (successfulIds.length > 0) {
    const { error: updateError } = await supabase
      .from('feedback')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .in('id', successfulIds)

    if (updateError) {
      // Non-fatal: drafts were created, rows just aren't marked yet
      const msg = `Failed to mark rows as processed: ${updateError.message}`
      result.errors.push(msg)
      console.error('[feedback-processor]', msg)
      Sentry.captureException(new Error(msg), { tags: { cron: 'feedback-processor' } })
    }
  }

  return result
}
