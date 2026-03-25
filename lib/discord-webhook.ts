/**
 * Discord webhook utility for ops alerts.
 *
 * Sends messages to the private #ops-alerts channel via webhook URL.
 * Separate from lib/discord.ts which handles community role management.
 *
 * Fail-open: if the webhook URL is not configured or the request fails,
 * the caller continues without error. Alerts are secondary to the
 * Supabase snapshot (source of truth for monitoring data).
 */

import * as Sentry from '@sentry/nextjs'

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

/** Discord embed colour constants (decimal RGB). */
const COLORS = {
  green: 0x10b981,
  amber: 0xf59e0b,
  red: 0xef4444,
} as const

/**
 * Send a message to the #ops-alerts Discord channel.
 * Returns true if delivered, false if skipped or failed (never throws).
 */
export async function sendOpsAlert(
  content: string,
  embeds?: DiscordEmbed[]
): Promise<boolean> {
  const url = process.env.DISCORD_OPS_WEBHOOK_URL
  if (!url) return false

  try {
    const body: Record<string, unknown> = { content }
    if (embeds && embeds.length > 0) body.embeds = embeds

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.error(`[discord-webhook] POST failed (${res.status})`)
      return false
    }

    return true
  } catch (err) {
    console.error('[discord-webhook] Send failed:', err instanceof Error ? err.message : 'unknown')
    Sentry.captureException(err, { tags: { action: 'discord-ops-webhook' } })
    return false
  }
}

/**
 * Format monitoring checks as a Discord embed.
 * Green = all ok, amber = warnings, red = critical.
 */
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
