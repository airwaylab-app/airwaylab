/**
 * One-shot read-only query: non-consented feedback processed by the cron
 * during the AIR-861 window (2026-04-23 – 2026-04-27).
 *
 * Produces the email list AIR-863 needs to scrub Gmail drafts.
 *
 * Usage:
 *   SUPABASE_URL=https://your-project.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node scripts/query-non-consented-feedback.mjs
 *
 * Output: markdown table printed to stdout + counts summary.
 * No writes to the database.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Window covering all six cron runs (07:00 UTC on 2026-04-23 – 2026-04-28) with buffer.
const WINDOW_START = '2026-04-23T06:00:00Z'
const WINDOW_END = '2026-04-28T08:00:00Z'

async function main() {
  // Query 1: non-consented rows processed in the window (drafts to DELETE).
  const { data: nonConsented, error: err1 } = await supabase
    .from('feedback')
    .select('created_at, email, contact_ok, processed_at')
    .gte('processed_at', WINDOW_START)
    .lte('processed_at', WINDOW_END)
    .not('email', 'is', null)
    .or('contact_ok.is.null,contact_ok.eq.false')
    .order('processed_at', { ascending: true })

  if (err1) {
    console.error('Query 1 failed:', err1.message)
    process.exit(1)
  }

  // Query 2: consented rows processed in the same window (drafts to KEEP).
  const { data: consented, error: err2 } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .gte('processed_at', WINDOW_START)
    .lte('processed_at', WINDOW_END)
    .not('email', 'is', null)
    .eq('contact_ok', true)

  if (err2) {
    console.error('Query 2 failed:', err2.message)
    process.exit(1)
  }

  const consentedCount = consented?.length ?? 0

  // ── Markdown output ────────────────────────────────────────────────────────

  console.log('## Non-consented feedback processed in AIR-861 window\n')
  console.log(`**Query window:** ${WINDOW_START} – ${WINDOW_END}  `)
  console.log(`**Non-consented rows (drafts to DELETE):** ${nonConsented?.length ?? 0}  `)
  console.log(`**Consented rows (drafts to KEEP):** ${consentedCount}\n`)

  if (!nonConsented || nonConsented.length === 0) {
    console.log('_No non-consented rows found in this window. No Gmail drafts to scrub._')
    return
  }

  console.log('| created_at (UTC) | email | contact_ok | processed_at (UTC) |')
  console.log('|---|---|---|---|')

  for (const row of nonConsented) {
    const createdAt = row.created_at ?? ''
    const email = row.email ?? ''
    const contactOk = row.contact_ok === null ? 'null' : String(row.contact_ok)
    const processedAt = row.processed_at ?? ''
    console.log(`| ${createdAt} | ${email} | ${contactOk} | ${processedAt} |`)
  }

  console.log(
    '\n_Data minimisation: message bodies excluded. Emails + timestamps + consent flag only._'
  )
  console.log('\n> **Action:** Delete Gmail drafts for all email addresses in the table above.')
  console.log('> **Note:** Do NOT delete drafts for users with `contact_ok = true` (kept list).')
}

main()
