/**
 * Discord webhook utility for admin alerts.
 *
 * Sends messages to private admin channels via per-channel webhook URLs.
 * Separate from lib/discord.ts which handles community role management.
 *
 * Channels:
 *   #ops-alerts     — Sentry, monitor cron, GitHub, deploys
 *   #revenue        — Stripe payments, cancellations, tier changes
 *   #user-signals   — Feedback, contact forms, provider interest, deletions
 *   #growth         — Signups, data contributions, research milestones
 *
 * Fail-open: if a webhook URL is not configured or the request fails,
 * the caller continues without error.
 */

import * as Sentry from '@sentry/nextjs'

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

export type AlertChannel = 'ops' | 'revenue' | 'user-signals' | 'growth'

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
  ops: 'DISCORD_OPS_WEBHOOK_URL',
  revenue: 'DISCORD_REVENUE_WEBHOOK_URL',
  'user-signals': 'DISCORD_USER_SIGNALS_WEBHOOK_URL',
  growth: 'DISCORD_GROWTH_WEBHOOK_URL',
}

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

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.error(`[discord-webhook] ${channel} POST failed (${res.status})`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[discord-webhook] ${channel} send failed:`, err instanceof Error ? err.message : 'unknown')
    Sentry.captureException(err, { tags: { action: 'discord-webhook', channel } })
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
