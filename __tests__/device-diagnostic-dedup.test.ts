import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'

interface KvRow {
  key: string
  last_fired_at: string
  suppressed_count: number
}

// Stateful kv_alert_dedup store — persists across module resets (module-level Map)
const kvStore = new Map<string, KvRow>()
// Shared insert spy delegated to via wrapper — survives vi.resetModules()
let _insertFn = vi.fn().mockResolvedValue({ error: null })
// Shared sendAlert spy delegated to via wrapper — survives vi.resetModules()
let _sendAlertFn = vi.fn().mockResolvedValue(true)

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: (...args: unknown[]) => _sendAlertFn(...args),
  formatUserSignalEmbed: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn().mockImplementation(() => ({
    from: (table: string) => {
      if (table === 'kv_alert_dedup') {
        return {
          select: () => ({
            eq: (_col: string, key: string) => ({
              single: () => {
                const row = kvStore.get(key)
                return Promise.resolve({ data: row ?? null, error: null })
              },
            }),
          }),
          upsert: (row: KvRow) => {
            kvStore.set(row.key, row)
            return Promise.resolve({ error: null })
          },
        }
      }
      return { insert: (...args: unknown[]) => _insertFn(...args) }
    },
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/rate-limit', () => {
  const isLimited = vi.fn().mockResolvedValue(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function RateLimiter(this: any) { this.isLimited = isLimited }
  return { RateLimiter, getRateLimitKey: vi.fn().mockReturnValue('test-ip') }
})

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

import { POST } from '@/app/api/device-diagnostic/route'

function makeRequest(deviceModel: string, hasStrFile = false): NextRequest {
  return new NextRequest('http://localhost/api/device-diagnostic', {
    method: 'POST',
    body: JSON.stringify({
      deviceModel,
      signalLabels: ['Flow'],
      identificationText: null,
      hasStrFile,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('device-diagnostic dedup', () => {
  beforeEach(() => {
    kvStore.clear()
    _insertFn = vi.fn().mockResolvedValue({ error: null })
    _sendAlertFn = vi.fn().mockResolvedValue(true)
  })

  it('fires 1 alert for 10 calls with the same device model', async () => {
    for (let i = 0; i < 10; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }
    expect(_sendAlertFn).toHaveBeenCalledTimes(1)
  })

  it('fires 2 alerts for two distinct device models (5 calls each)', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('Philips-DreamStation'))
    }
    expect(_sendAlertFn).toHaveBeenCalledTimes(2)
  })

  it('re-fires alert for same model after 24h TTL elapses', async () => {
    let fakeNow = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow)

    await POST(makeRequest('ResMed-AirSense10'))
    expect(_sendAlertFn).toHaveBeenCalledTimes(1)

    // Still within 24h — no second alert
    await POST(makeRequest('ResMed-AirSense10'))
    expect(_sendAlertFn).toHaveBeenCalledTimes(1)

    // Advance past 24h window
    fakeNow += 24 * 60 * 60 * 1000 + 1

    await POST(makeRequest('ResMed-AirSense10'))
    expect(_sendAlertFn).toHaveBeenCalledTimes(2)

    vi.restoreAllMocks()
  })

  it('writes device_diagnostics row on every request regardless of dedup state', async () => {
    const callCount = 10
    for (let i = 0; i < callCount; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }
    expect(_insertFn).toHaveBeenCalledTimes(callCount)
  })

  it('cold-start simulation: 3 cold-starts × 10 requests produce exactly 1 alert', async () => {
    // Each vi.resetModules() + re-import simulates a Vercel cold-start.
    // kvStore (shared module-level Map) persists across resets, simulating the DB.
    // _sendAlertFn is a shared reference so calls from all module instances are counted.
    let totalAlerts = 0

    for (let coldStart = 0; coldStart < 3; coldStart++) {
      vi.resetModules()
      const { POST: freshPOST } = await import('@/app/api/device-diagnostic/route')

      for (let i = 0; i < 10; i++) {
        await freshPOST(makeRequest('ResMed-ColdStart'))
      }

      totalAlerts += _sendAlertFn.mock.calls.length
      _sendAlertFn.mockClear()
    }

    expect(totalAlerts).toBe(1)
  })
})

describe('device-diagnostic route — validation and error boundaries', () => {
  beforeEach(() => {
    kvStore.clear()
    _insertFn = vi.fn().mockResolvedValue({ error: null })
    _sendAlertFn = vi.fn().mockResolvedValue(true)
    vi.mocked(Sentry.captureException).mockClear()
    vi.mocked(Sentry.captureMessage).mockClear()
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('returns 403 when validateOrigin rejects the request', async () => {
    const { validateOrigin } = await import('@/lib/csrf')
    vi.mocked(validateOrigin).mockReturnValueOnce(false)
    const res = await POST(makeRequest('ResMed-AirSense10'))
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/origin/i)
  })

  it('returns 429 when rate limiter is exhausted', async () => {
    const { RateLimiter } = await import('@/lib/rate-limit')
    // All RateLimiter instances share the same isLimited mock fn (see module mock above)
    const shared = new (RateLimiter as unknown as new () => { isLimited: ReturnType<typeof vi.fn> })()
    shared.isLimited.mockResolvedValueOnce(true)
    const res = await POST(makeRequest('ResMed-AirSense10'))
    expect(res.status).toBe(429)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/rate/i)
  })

  it('returns 400 for an invalid payload (missing required field)', async () => {
    const req = new NextRequest('http://localhost/api/device-diagnostic', {
      method: 'POST',
      body: JSON.stringify({ deviceModel: 'X' }), // missing signalLabels, hasStrFile
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/invalid/i)
  })

  it('returns 400 for an invalid payload (deviceModel exceeds max length)', async () => {
    const req = new NextRequest('http://localhost/api/device-diagnostic', {
      method: 'POST',
      body: JSON.stringify({
        deviceModel: 'X'.repeat(201),
        signalLabels: [],
        identificationText: null,
        hasStrFile: false,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 and captures exception when request body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/device-diagnostic', {
      method: 'POST',
      body: 'not json {{{',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalled()
  })

  it('captures Sentry message but still returns 200 when Supabase is not configured', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce(null as unknown as ReturnType<typeof getSupabaseAdmin>)
    const res = await POST(makeRequest('ResMed-AirSense10'))
    expect(res.status).toBe(200)
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      'Supabase not configured - data lost',
      expect.objectContaining({ level: 'error' })
    )
  })

  it('captures Sentry exception but still returns 200 when Supabase insert errors', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce({
      from: (table: string) => {
        if (table === 'kv_alert_dedup') {
          return {
            select: () => ({
              eq: (_col: string, key: string) => ({
                single: () => Promise.resolve({ data: kvStore.get(key) ?? null, error: null }),
              }),
            }),
            upsert: (row: KvRow) => {
              kvStore.set(row.key, row)
              return Promise.resolve({ error: null })
            },
          }
        }
        return { insert: vi.fn().mockResolvedValue({ error: { message: 'DB constraint violation' } }) }
      },
    } as unknown as ReturnType<typeof getSupabaseAdmin>)
    const res = await POST(makeRequest('ResMed-AirSense10'))
    expect(res.status).toBe(200)
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalled()
  })
})
