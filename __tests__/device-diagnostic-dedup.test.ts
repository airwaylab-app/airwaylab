import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(true),
  formatUserSignalEmbed: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
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
import { __resetForTests } from '@/app/api/device-diagnostic/_dedup'
import { sendAlert } from '@/lib/discord-webhook'

const mockSendAlert = sendAlert as ReturnType<typeof vi.fn>

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
    __resetForTests()
    mockSendAlert.mockClear()
  })

  it('fires 1 alert for 10 calls with the same device model', async () => {
    for (let i = 0; i < 10; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }
    expect(mockSendAlert).toHaveBeenCalledTimes(1)
  })

  it('fires 2 alerts for two distinct device models (5 calls each)', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('Philips-DreamStation'))
    }
    expect(mockSendAlert).toHaveBeenCalledTimes(2)
  })

  it('re-fires alert for same model after 24h TTL elapses', async () => {
    let fakeNow = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow)

    await POST(makeRequest('ResMed-AirSense10'))
    expect(mockSendAlert).toHaveBeenCalledTimes(1)

    // Still within 24h — no second alert
    await POST(makeRequest('ResMed-AirSense10'))
    expect(mockSendAlert).toHaveBeenCalledTimes(1)

    // Advance past 24h window
    fakeNow += 24 * 60 * 60 * 1000 + 1

    await POST(makeRequest('ResMed-AirSense10'))
    expect(mockSendAlert).toHaveBeenCalledTimes(2)

    vi.restoreAllMocks()
  })

  it('writes device_diagnostics row on every request regardless of dedup state', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: insertSpy }),
    })

    const callCount = 10
    for (let i = 0; i < callCount; i++) {
      await POST(makeRequest('ResMed-AirSense10'))
    }

    expect(insertSpy).toHaveBeenCalledTimes(callCount)
  })
})
