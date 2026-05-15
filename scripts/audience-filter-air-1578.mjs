/**
 * One-shot read-only query: audience filter for AIR-1578 re-engagement email.
 *
 * Targets premium subscribers who signed up during the AIR-1126 bug window
 * and have not re-engaged (run analysis) since the fix deployed.
 *
 * Bug window:
 *   - Conservative start: 2026-05-06T14:05:53Z (PR #627 merged — Stripe webhook changes)
 *   - Full-impact start:  2026-05-07T06:46:45Z (PR #673 merged — community-tier 14-day
 *     window activated, making the checkout tier bug visible to new subscribers)
 *   - Fix deployed:       2026-05-07T20:26:34Z (PR #690 merged — refreshProfile polling)
 *
 * Filter criteria applied:
 *   1. subscriptions.created_at between BUG_WINDOW_START and FIX_DEPLOYED
 *   2. profiles.tier = 'supporter' OR 'champion' (still on premium)
 *   3. profiles.email_opt_in = true (respects marketing consent)
 *   4. profiles.last_analysis_at IS NULL OR < FIX_DEPLOYED (has NOT re-engaged post-fix)
 *   5. profiles.re_engagement_suppressed_at IS NULL (not already on a re-engagement sequence)
 *
 * Usage:
 *   SUPABASE_URL=https://your-project.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node scripts/audience-filter-air-1578.mjs
 *
 * Output: markdown table + plain email list (ready to pass to send step).
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

// Conservative start: PR #627 merged (Stripe webhook changes, CTO flagged as suspect)
const BUG_WINDOW_START = '2026-05-06T14:05:53Z'
// Fix deployed: PR #690 merged (refreshProfile polling fix)
const FIX_DEPLOYED = '2026-05-07T20:26:34Z'

async function main() {
  // Step 1: Find subscription rows created during the bug window.
  // These represent checkouts that completed while the tier-sync bug was live.
  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('user_id, tier, created_at, stripe_subscription_id')
    .gte('created_at', BUG_WINDOW_START)
    .lte('created_at', FIX_DEPLOYED)
    .in('tier', ['supporter', 'champion'])
    .in('status', ['active', 'trialing'])

  if (subsErr) {
    console.error('subscriptions query failed:', subsErr.message)
    process.exit(1)
  }

  if (!subs || subs.length === 0) {
    console.log('## AIR-1578 Re-engagement Audience Filter\n')
    console.log('_No premium subscriptions created during the bug window. No audience to target._')
    return
  }

  const userIds = [...new Set(subs.map((s) => s.user_id))]

  // Step 2: Fetch profiles for those users, filtering on re-engagement eligibility.
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, email, tier, email_opt_in, last_analysis_at, re_engagement_suppressed_at')
    .in('id', userIds)
    .in('tier', ['supporter', 'champion'])    // still on premium
    .eq('email_opt_in', true)                 // respects marketing consent
    .is('re_engagement_suppressed_at', null)  // not already in a re-engagement sequence

  if (profilesErr) {
    console.error('profiles query failed:', profilesErr.message)
    process.exit(1)
  }

  // Step 3: Exclude users who have re-engaged post-fix
  // (last_analysis_at > FIX_DEPLOYED means they uploaded/analysed since the fix)
  const fixDeployedDate = new Date(FIX_DEPLOYED)
  const eligible = (profiles ?? []).filter((p) => {
    if (!p.last_analysis_at) return true // never analysed → still affected
    return new Date(p.last_analysis_at) < fixDeployedDate
  })

  const excluded = (profiles ?? []).filter((p) => {
    if (!p.last_analysis_at) return false
    return new Date(p.last_analysis_at) >= fixDeployedDate
  })

  // Build a lookup for sub metadata
  const subByUser = Object.fromEntries(subs.map((s) => [s.user_id, s]))

  // ── Markdown output ────────────────────────────────────────────────────────

  console.log('## AIR-1578 Re-engagement Audience Filter\n')
  console.log(`**Bug window:** ${BUG_WINDOW_START} – ${FIX_DEPLOYED}  `)
  console.log(`**Subscriptions created in window:** ${subs.length}  `)
  console.log(`**Profiles fetched (premium + opted-in + not suppressed):** ${(profiles ?? []).length}  `)
  console.log(`**Excluded (re-engaged post-fix):** ${excluded.length}  `)
  console.log(`**Eligible for re-engagement email:** ${eligible.length}\n`)

  if (eligible.length === 0) {
    console.log('_All affected subscribers have already re-engaged or opted out. No emails to send._')
    return
  }

  console.log('### Eligible recipients\n')
  console.log('| email | tier | subscribed_at (UTC) | last_analysis_at (UTC) |')
  console.log('|---|---|---|---|')

  for (const p of eligible) {
    const sub = subByUser[p.id]
    const subscribedAt = sub?.created_at ?? 'unknown'
    const lastAt = p.last_analysis_at ?? 'never'
    console.log(`| ${p.email} | ${p.tier} | ${subscribedAt} | ${lastAt} |`)
  }

  console.log('\n### Plain email list (pass to send step)\n')
  console.log('```')
  for (const p of eligible) {
    console.log(p.email)
  }
  console.log('```')

  console.log('\n### Excluded (re-engaged post-fix — do not send)\n')
  if (excluded.length === 0) {
    console.log('_None_')
  } else {
    console.log('| email | tier | last_analysis_at (UTC) |')
    console.log('|---|---|---|')
    for (const p of excluded) {
      console.log(`| ${p.email} | ${p.tier} | ${p.last_analysis_at} |`)
    }
  }

  console.log(
    '\n_Data minimisation: subscription IDs omitted from output. Emails + tier + timestamps only._'
  )
  console.log(
    '\n> **Next step:** Pass the plain email list above to the send step in [AIR-1144](/AIR/issues/AIR-1144).'
  )
  console.log(
    '> **Prerequisite:** Confirm RESEND_API_KEY is valid in CTO environment before sending.'
  )
}

main()
