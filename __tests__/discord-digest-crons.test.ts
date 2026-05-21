/**
 * Tests for discord digest cron routes (AIR-1847).
 *
 * Coverage:
 *   discord-strategy-digest: auth guard, skip-when-empty, Discord push on events
 *   discord-weekly-digest:   auth guard, skip-when-empty, Discord push + mark consumed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/discord-webhook', () => ({
  COLORS: { green: 0x10b981, red: 0xef4444, blue: 0x3b82f6, amber: 0xf59e0b },
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

// ── Strategy digest tests ─────────────────────────────────────────────────────

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

  it('returns 503 when webhook env var not configured', async () => {
    setEnv({ DISCORD_WEBHOOK_STRATEGY_DIGEST: undefined })
    const { GET } = await import('@/app/api/cron/discord-strategy-digest/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(503)
  })

  it('skips Discord push and returns skipped=true when no events', async () => {
    // All queries return empty / zero counts
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
    }))

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
      // feedback and provider_interest: zero counts
      return {
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: null, count: 0, error: null }),
      }
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
    })

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
    expect(payload.embeds[0].title).toContain('Strategy Digest')
    expect(payload.embeds[0].fields.find((f: { name: string }) => f.name === 'New Subscriptions').value).toBe('2')
  })

  it('includes feedback and provider interest in post', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscription_events') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'feedback') {
        return {
          select: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: null, count: 3, error: null }),
        }
      }
      // provider_interest
      return {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: null, count: 1, error: null }),
      }
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
})

// ── Weekly digest tests ───────────────────────────────────────────────────────

describe('GET /api/cron/discord-weekly-digest', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setEnv({
      CRON_SECRET: 'test-secret',
      DISCORD_WEBHOOK_WEEKLY_DIGEST: 'https://discord.com/api/webhooks/test/weekly',
    })
    global.fetch = vi.fn()
  })

  it('returns 401 when CRON_SECRET missing', async () => {
    setEnv({ CRON_SECRET: undefined })
    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when bearer token mismatches', async () => {
    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest('wrong'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when webhook env var not configured', async () => {
    setEnv({ DISCORD_WEBHOOK_WEEKLY_DIGEST: undefined })
    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(503)
  })

  it('skips Discord push and returns skipped=true when no events', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))

    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.skipped).toBe(true)
    expect(body.reason).toBe('no_events')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts to Discord and marks events consumed when events exist', async () => {
    const events = [
      { id: 'uuid-1', event_type: 'unsupported_device_known', payload: {}, created_at: new Date().toISOString() },
      { id: 'uuid-2', event_type: 'unsupported_device_known', payload: {}, created_at: new Date().toISOString() },
      { id: 'uuid-3', event_type: 'credential_expiry_routine', payload: {}, created_at: new Date().toISOString() },
    ]

    const mockUpdate = vi.fn().mockReturnThis()
    const mockIn = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: events, error: null }),
      update: mockUpdate,
      in: mockIn,
    }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 })

    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.eventCount).toBe(3)
    expect(body.countByType['unsupported_device_known']).toBe(2)
    expect(body.countByType['credential_expiry_routine']).toBe(1)
    expect(global.fetch).toHaveBeenCalledOnce()

    // Verify Discord embed content
    const call0 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(call0[0]).toBe('https://discord.com/api/webhooks/test/weekly')
    const payload = JSON.parse(call0[1].body as string)
    expect(payload.embeds[0].title).toContain('Weekly Digest')

    // Verify mark-consumed was called with all IDs
    expect(mockUpdate).toHaveBeenCalledWith({ consumed_at: expect.any(String) })
    expect(mockIn).toHaveBeenCalledWith('id', ['uuid-1', 'uuid-2', 'uuid-3'])
  })

  it('groups events by type in the embed fields', async () => {
    const events = [
      { id: 'a', event_type: 'unsupported_device_known', payload: {}, created_at: new Date().toISOString() },
      { id: 'b', event_type: 'unsupported_device_known', payload: {}, created_at: new Date().toISOString() },
      { id: 'c', event_type: 'credential_expiry_routine', payload: {}, created_at: new Date().toISOString() },
    ]

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: events, error: null }),
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 })

    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    await GET(makeRequest())

    const call0 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(call0[1].body as string)
    const fields: Array<{ name: string; value: string }> = payload.embeds[0].fields

    const deviceField = fields.find((f) => f.name.includes('unsupported device known'))
    const credField = fields.find((f) => f.name.includes('credential expiry routine'))
    expect(deviceField?.value).toBe('2')
    expect(credField?.value).toBe('1')
  })

  it('still marks consumed even when Discord POST fails', async () => {
    const events = [
      { id: 'x', event_type: 'unsupported_device_known', payload: {}, created_at: new Date().toISOString() },
    ]

    const mockIn = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: events, error: null }),
      update: vi.fn().mockReturnThis(),
      in: mockIn,
    }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 })

    const { GET } = await import('@/app/api/cron/discord-weekly-digest/route')
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.discordPosted).toBe(false)
    // Mark-consumed still called
    expect(mockIn).toHaveBeenCalledWith('id', ['x'])
  })
})
