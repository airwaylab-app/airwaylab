/**
 * Discord webhook utility for admin alerts.
 *
 * Sends messages to private admin channels via per-channel webhook URLs.
 * Separate from lib/discord.ts which handles community role management.
 *
 * Channels:
 *   #critical         — Payment failures, credential expiry <72h, security incidents
 *   #ops-alerts       — Sentry, monitor cron, GitHub, deploys
 *   #revenue          — Stripe payments, cancellations, tier changes
 *   #user-signals     — Feedback, contact forms, provider interest, deletions
 *   #growth           — Signups, data contributions, research milestones
 *   #platform-health  — Daily DB integrity checks, data audit results
 *
 * Fail-open: if a webhook URL is not configured or the request fails,
 * the caller continues without error.
 *
 * Critical alerts (sendCriticalAlert / alertCredentialExpiry / alertSecurityIncident):
 *   Both Discord AND email are fired independently. Discord failure does not block
 *   the email attempt, and vice versa. Resend errors are logged to Sentry only.
 */

import * as Sentry from '@sentry/nextjs'
import { sendEmail } from '@/lib/email/send'

// ── Types ────────────────────────────────────────────────────

interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: DiscordEmbedField[]
  footer?: { text: string }
  timestamp?: string
}

export type AlertChannel = 'critical' | 'ops' | 'revenue' | 'user-signals' | 'growth' | 'platform-health'

// ── Constants ────────────────────────────────────────────────

/** Discord embed colour constants (decimal RGB). */
export const COLORS = {
  green: 0x10b981,
  amber: 0xf59e0b,
  red: 0xef4444,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
  teal: 0x14b8a6,
} as const

const CHANNEL_ENV_MAP: Record<AlertChannel, string> = {
  critical: 'DISCORD_WEBHOOK_CRITICAL',
  ops: 'DISCORD_OPS_WEBHOOK_URL',
  revenue: 'DISCORD_REVENUE_WEBHOOK_URL',
  'user-signals': 'DISCORD_USER_SIGNALS_WEBHOOK_URL',
  growth: 'DISCORD_GROWTH_WEBHOOK_URL',
  'platform-health': 'DISCORD_PLATFORM_HEALTH_WEBHOOK_URL',
}

const CRITICAL_OPS_EMAIL = 'd.voorhagen@gmail.com'

// ── Core sender ──────────────────────────────────────────────

/**
 * Send a message to a Discord admin channel.
 * Returns true if delivered, false if skipped or failed (never throws).
 */
export async function sendAlert(
  channel: AlertChannel,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<boolean> {
  const envKey = CHANNEL_ENV_MAP[channel]
  const url = process.env[envKey]
  if (!url) return false

  try {
    const body: Record<string, unknown> = {}
    if (content) body.content = content
    if (embeds && embeds.length > 0) body.embeds = embeds

    // 3s is ample for Discord; the prior 10s timeout kept void-called
    // sendAlert() Promises alive until the Vercel function budget expired,
    // producing unhandled TimeoutError events (JAVASCRIPT-NEXTJS-56).
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3_000),
    })

    if (!res.ok) {
      console.error(`[discord-webhook] ${channel} POST failed (${res.status})`)
      return false
    }

    return true
  } catch (err) {
    // Fail-open: Discord alerts are non-critical notifications. Log only; do not
    // forward to Sentry because fire-and-forget callers would create misleading
    // error attribution (the active request scope is unrelated to Discord health).
    console.error(`[discord-webhook] ${channel} send failed:`, err instanceof Error ? err.message : 'unknown')
    return false
  }
}

/** Backwards-compatible alias for #ops-alerts. */
export async function sendOpsAlert(
  content: string,
  embeds?: DiscordEmbed[]
): Promise<boolean> {
  return sendAlert('ops', content, embeds)
}

// ── Critical alert helpers ───────────────────────────────────

/**
 * Send a plain-text email fallback to the ops contact.
 * Called after the Discord push — never throws.
 * Resend failures are captured to Sentry for ops visibility.
 */
async function sendCriticalOpsEmail(subject: string, body: string): Promise<void> {
  try {
    const id = await sendEmail({ to: CRITICAL_OPS_EMAIL, subject, text: body })
    if (id === null) {
      Sentry.captureMessage('Critical ops email failed to send (Resend returned null)', {
        level: 'error',
        tags: { source: 'discord-webhook', subject },
      })
    }
  } catch (err) {
    Sentry.captureException(err, {
      level: 'error',
      tags: { source: 'discord-webhook', action: 'critical_ops_email' },
    })
  }
}

/**
 * Send a critical-tier alert: Discord #critical + plain-text email to ops.
 * Discord and email fire independently — neither blocks the other.
 * Returns true if Discord was delivered, false otherwise.
 */
export async function sendCriticalAlert(
  emailSubject: string,
  emailBody: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<boolean> {
  const [discordResult] = await Promise.all([
    sendAlert('critical', content, embeds),
    sendCriticalOpsEmail(emailSubject, emailBody),
  ])
  return discordResult
}

/**
 * Alert: credential expiring within 72 hours.
 * Fires to Discord #critical and emails the ops contact.
 */
export async function alertCredentialExpiry(hoursLeft: number, credentialName: string): Promise<boolean> {
  const subject = `[AirwayLab URGENT] Credential expires in ${hoursLeft}h: ${credentialName}`
  const body = `AirwayLab credential alert\n\nCredential: ${credentialName}\nExpires in: ${hoursLeft} hours\n\nRenew immediately to avoid service disruption.`
  const embed: DiscordEmbed = {
    title: `:rotating_light: Credential Expiring Soon`,
    description: `**${credentialName}** expires in **${hoursLeft}h**`,
    color: COLORS.red,
    footer: { text: 'Credential monitor' },
    timestamp: new Date().toISOString(),
  }
  return sendCriticalAlert(subject, body, '', [embed])
}

/**
 * Alert: Stripe payment failed on the board card.
 * Fires to Discord #critical and emails the ops contact.
 */
export async function alertStripePaymentFailed(): Promise<boolean> {
  const subject = `[AirwayLab URGENT] Stripe payment failed`
  const body = `AirwayLab critical alert\n\nStripe invoice payment failed. Check the Stripe dashboard immediately — active subscriptions may be at risk.\n\nhttps://dashboard.stripe.com`
  const embed: DiscordEmbed = {
    title: `:x: Stripe Payment Failed`,
    description: 'Invoice payment failed. Check Stripe dashboard.',
    color: COLORS.red,
    footer: { text: 'Stripe webhook' },
    timestamp: new Date().toISOString(),
  }
  return sendCriticalAlert(subject, body, '', [embed])
}

/**
 * Alert: security incident detected.
 * Fires to Discord #critical and emails the ops contact.
 */
export async function alertSecurityIncident(description: string): Promise<boolean> {
  const subject = `[AirwayLab URGENT] Security incident: ${description.slice(0, 80)}`
  const body = `AirwayLab security incident\n\n${description}\n\nTimestamp: ${new Date().toISOString()}`
  const embed: DiscordEmbed = {
    title: `:rotating_light: Security Incident`,
    description: description.slice(0, 500),
    color: COLORS.red,
    footer: { text: 'Security monitor' },
    timestamp: new Date().toISOString(),
  }
  return sendCriticalAlert(subject, body, '', [embed])
}

// ── Embed builders ───────────────────────────────────────────

/** Monitor cron health check embed. */
export function formatMonitorEmbed(
  checks: Array<{
    service: string
    status: string
    usage_pct: number | null
    current: string
    limit: string
    error?: string
  }>
): DiscordEmbed {
  const alertChecks = checks.filter((c) => c.status === 'warning' || c.status === 'critical')
  const hasCritical = checks.some((c) => c.status === 'critical')
  const hasWarning = alertChecks.length > 0

  const color = hasCritical ? COLORS.red : hasWarning ? COLORS.amber : COLORS.green

  const statusEmoji: Record<string, string> = {
    ok: ':white_check_mark:',
    warning: ':warning:',
    critical: ':red_circle:',
    unavailable: ':grey_question:',
    not_configured: ':gear:',
  }

  const fields: DiscordEmbedField[] = checks.map((c) => {
    const emoji = statusEmoji[c.status] ?? ':grey_question:'
    const pct = c.usage_pct !== null ? ` (${c.usage_pct}%)` : ''
    const value = c.error
      ? `${emoji} ${c.error}`
      : `${emoji} ${c.current} / ${c.limit}${pct}`

    return { name: c.service, value, inline: true }
  })

  const title = hasCritical
    ? ':rotating_light: AirwayLab — Critical Usage Alert'
    : hasWarning
      ? ':warning: AirwayLab — Usage Warning'
      : ':white_check_mark: AirwayLab — All Systems OK'

  return {
    title,
    color,
    fields,
    footer: { text: 'Daily monitor cron' },
    timestamp: new Date().toISOString(),
  }
}

/** Stripe subscription event embed for #revenue. */
export function formatRevenueEmbed(opts: {
  event: 'new_subscription' | 'tier_change' | 'cancellation' | 'payment_failed'
  tier?: string
  interval?: string
  mrrCents?: number
  userId?: string
  email?: string
}): DiscordEmbed {
  const titles: Record<string, string> = {
    new_subscription: ':tada: New Subscription',
    tier_change: ':arrows_counterclockwise: Tier Change',
    cancellation: ':wave: Cancellation',
    payment_failed: ':x: Payment Failed',
  }

  const colors: Record<string, number> = {
    new_subscription: COLORS.green,
    tier_change: COLORS.blue,
    cancellation: COLORS.amber,
    payment_failed: COLORS.red,
  }

  const fields: DiscordEmbedField[] = []
  if (opts.tier) fields.push({ name: 'Tier', value: opts.tier, inline: true })
  if (opts.interval) fields.push({ name: 'Interval', value: opts.interval, inline: true })
  if (opts.mrrCents !== undefined) fields.push({ name: 'MRR', value: `$${(opts.mrrCents / 100).toFixed(2)}`, inline: true })
  if (opts.email) fields.push({ name: 'Email', value: opts.email, inline: true })

  return {
    title: titles[opts.event] ?? opts.event,
    color: colors[opts.event] ?? COLORS.blue,
    fields,
    footer: { text: 'Stripe' },
    timestamp: new Date().toISOString(),
  }
}

/** User feedback/contact/provider embed for #user-signals. */
export function formatUserSignalEmbed(opts: {
  type: 'feedback' | 'contact' | 'provider_interest' | 'account_deletion' | 'unsupported_device'
  category?: string
  message?: string
  email?: string
  name?: string
}): DiscordEmbed {
  const titles: Record<string, string> = {
    feedback: ':speech_balloon: User Feedback',
    contact: ':envelope: Contact Form',
    provider_interest: ':stethoscope: Provider Interest',
    account_deletion: ':wastebasket: Account Deletion Request',
    unsupported_device: ':floppy_disk: Unsupported Device',
  }

  const colors: Record<string, number> = {
    feedback: COLORS.blue,
    contact: COLORS.teal,
    provider_interest: COLORS.purple,
    account_deletion: COLORS.amber,
    unsupported_device: COLORS.amber,
  }

  const fields: DiscordEmbedField[] = []
  if (opts.category) fields.push({ name: 'Category', value: opts.category, inline: true })
  if (opts.email) fields.push({ name: 'Email', value: opts.email, inline: true })
  if (opts.name) fields.push({ name: 'Name', value: opts.name, inline: true })

  return {
    title: titles[opts.type] ?? opts.type,
    description: opts.message ? opts.message.slice(0, 500) : undefined,
    color: colors[opts.type] ?? COLORS.blue,
    fields,
    footer: { text: 'airwaylab.app' },
    timestamp: new Date().toISOString(),
  }
}

/** Email bounce/complaint embed for #ops-alerts. */
export function formatEmailAlertEmbed(opts: {
  event: 'bounce' | 'complaint'
  email: string
  resendId: string
  userId?: string
}): DiscordEmbed {
  const isBounce = opts.event === 'bounce'

  const fields: DiscordEmbedField[] = [
    { name: 'Email', value: opts.email, inline: true },
    { name: 'Resend ID', value: opts.resendId, inline: true },
  ]
  if (opts.userId) fields.push({ name: 'User ID', value: opts.userId, inline: true })
  fields.push({
    name: 'Action taken',
    value: isBounce
      ? 'Pending emails cancelled'
      : 'Pending emails cancelled + unsubscribed',
    inline: false,
  })

  return {
    title: isBounce ? ':warning: Email Bounced' : ':red_circle: Spam Complaint',
    color: isBounce ? COLORS.amber : COLORS.red,
    fields,
    footer: { text: 'Resend webhook' },
    timestamp: new Date().toISOString(),
  }
}

/** Broadcast completion embed for #ops-alerts. */
export function formatBroadcastEmbed(opts: {
  templateId: string
  sent: number
  skipped: number
  errors: number
  totalOptedIn: number
}): DiscordEmbed {
  const hasErrors = opts.errors > 0
  const fields: DiscordEmbedField[] = [
    { name: 'Template', value: opts.templateId, inline: true },
    { name: 'Sent', value: String(opts.sent), inline: true },
    { name: 'Skipped', value: String(opts.skipped), inline: true },
    { name: 'Errors', value: String(opts.errors), inline: true },
    { name: 'Total opted in', value: String(opts.totalOptedIn), inline: true },
  ]

  return {
    title: hasErrors
      ? ':warning: Broadcast Sent (with errors)'
      : ':mega: Broadcast Sent',
    color: hasErrors ? COLORS.amber : COLORS.green,
    fields,
    footer: { text: 'Admin broadcast' },
    timestamp: new Date().toISOString(),
  }
}

/** Data contribution embed for #growth. */
export function formatGrowthEmbed(opts: {
  event: 'data_contribution' | 'new_signup'
  nightCount?: number
  hasOximetry?: boolean
  deviceModel?: string
  email?: string
}): DiscordEmbed {
  const titles: Record<string, string> = {
    data_contribution: ':bar_chart: Research Data Contribution',
    new_signup: ':wave: New User Signup',
  }

  const fields: DiscordEmbedField[] = []
  if (opts.nightCount !== undefined) fields.push({ name: 'Nights', value: String(opts.nightCount), inline: true })
  if (opts.hasOximetry !== undefined) fields.push({ name: 'Oximetry', value: opts.hasOximetry ? 'Yes' : 'No', inline: true })
  if (opts.deviceModel) fields.push({ name: 'Device', value: opts.deviceModel, inline: true })
  if (opts.email) fields.push({ name: 'Email', value: opts.email, inline: true })

  return {
    title: titles[opts.event] ?? opts.event,
    color: COLORS.green,
    fields,
    footer: { text: 'airwaylab.app' },
    timestamp: new Date().toISOString(),
  }
}
