/**
 * Tests for the daily usage + data digest cron (discord-strategy-digest).
 *
 * Coverage:
 *   auth guard, skip-when-empty, Discord push on events,
 *   data-contributions + deletions in the embed, and LOUD failure
 *   (Sentry) on missing webhook / failed Discord POST.
 *
 * The old discord-weekly-digest cron was removed (dead accumulator — nothing
 * ever wrote discord_digest_events; usage+data now lives in this daily digest).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/discord-webhook', () => ({
  COLORS: { green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, blue: 0x3b82f6, purple: 0x8b5cf6, teal: 0x14b8a6 },
}))

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(secret = 'test-secret'): NextRequest {
  return {
    headers: {
      get: (h: string) => (h === 'authorization' ? `Bearer ${secret}` : null),
    },
  } as unknown as NextRequest
}

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = v
    }
  }
}

/** Default empty/zero result for any table not explicitly overridden. */
function emptyTable() {
  return {
    select: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  }
}

// ── Daily usage + data digest tests ───────────────────────────────────────────

describe('GET /api/cron/discord-strategy-digest', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setEnv({
      CRON_SECRET: 'test-secret',
      DISCORD_WEBHOOK_STRATEGY_DIGEST: 'https://discord.com/api/webhooks/test/strategy',
    })
    global.fetch = vi.fn()
  })

  it('returns 401 when CRON_SECRET missing', async () => {
    setEnv({ CRON_SECRET: undefined })
    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when bearer token mismatches', async () => {
    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 503 AND reports to Sentry when webhook env var not configured', async () => {
    setEnv({ DISCORD_WEBHOOK_STRATEGY_DIGEST: undefined })
    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(503)

    const Sentry = await import('@sentry/nextjs')
    expect(Sentry.captureMessage).toHaveBeenCalledOnce()
    const call = (Sentry.captureMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(call[1]).toBe('warning')
  })

  it('skips Discord push and returns skipped=true when no events', async () => {
    mockFrom.mockImplementation(() => emptyTable())

    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.skipped).toBe(true)
    expect(body.reason).toBe('no_events')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts to Discord when subscription events exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscription_events') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({
            data: [{ event_type: 'created' }, { event_type: 'created' }, { event_type: 'cancelled' }],
            error: null,
          }),
        }
      }
      return emptyTable()
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 })

    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.newSubs).toBe(2)
    expect(body.cancellations).toBe(1)
    expect(global.fetch).toHaveBeenCalledOnce()

    const call0 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(call0[0]).toBe('https://discord.com/api/webhooks/test/strategy')
    const payload = JSON.parse(call0[1].body as string)
    expect(payload.embeds[0].title).toContain('Usage & Data Digest')
    expect(payload.embeds[0].fields.find((f: { name: string }) => f.name === 'New Subscriptions').value).toBe('2')
  })

  it('includes feedback and provider interest in post', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'feedback') {
        return {
          select: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: null, count: 3, error: null }),
        }
      }
      if (table === 'provider_interest') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: null, count: 1, error: null }),
        }
      }
      return emptyTable()
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 })

    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.nonBugFeedback).toBe(3)
    expect(body.providerInterest).toBe(1)
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it('includes data contributions (with nights) and deletion requests in post', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'data_contributions') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [{ night_count: 4 }, { night_count: 1 }], error: null }),
        }
      }
      if (table === 'account_deletion_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: null, count: 2, error: null }),
        }
      }
      return emptyTable()
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 })

    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.contributions).toBe(2)
    expect(body.totalNights).toBe(5)
    expect(body.deletionRequests).toBe(2)

    const call0 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(call0[1].body as string)
    const fields: Array<{ name: string; value: string }> = payload.embeds[0].fields
    expect(fields.find((f) => f.name === 'Data Contributions')?.value).toBe('2 (5 nights)')
    expect(fields.find((f) => f.name === 'Deletion Requests')?.value).toBe('2')
  })

  it('reports to Sentry when the Discord POST fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscription_events') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [{ event_type: 'created' }], error: null }),
        }
      }
      return emptyTable()
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 })

    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.discordPosted).toBe(false)

    const Sentry = await import('@sentry/nextjs')
    expect(Sentry.captureMessage).toHaveBeenCalledOnce()
    const call = (Sentry.captureMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string]
    expect(call[0]).toContain('429')
  })
})
