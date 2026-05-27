import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared mutable state (survives vi.resetModules between tests) ────────────
let mockRpcResult: { data: unknown; error: unknown } = { data: [], error: null }
let mockUpdateResult: { error: unknown } = { error: null }
let rpcSpy = vi.fn()
let updateSpy = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn().mockImplementation(() => ({
    rpc: (...args: unknown[]) => {
      rpcSpy(...args)
      return Promise.resolve(mockRpcResult)
    },
    from: () => ({
      update: (...args: unknown[]) => {
        updateSpy(...args)
        return {
          eq: () => ({
            eq: () => Promise.resolve(mockUpdateResult),
          }),
        }
      },
    }),
  })),
}))

const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
vi.stubGlobal('fetch', fetchSpy)

import { trackSignalCount, fireThresholdWebhook } from '@/lib/signal-tracker'

function makeRpcRow(newCount: number, firedThresholds: number[]) {
  return { data: [{ new_count: newCount, fired_thresholds: firedThresholds }], error: null }
}

describe('trackSignalCount', () => {
  beforeEach(() => {
    rpcSpy = vi.fn()
    updateSpy = vi.fn()
    fetchSpy.mockClear()
    mockUpdateResult = { error: null }
    process.env.PAPERCLIP_SIGNAL_WEBHOOK_URL = 'https://example.com/webhook'
    process.env.PAPERCLIP_SIGNAL_WEBHOOK_SECRET = 'test-secret'
  })

  it('does NOT fire webhook when count is below threshold (count 19)', async () => {
    mockRpcResult = makeRpcRow(19, [])
    await trackSignalCount('feedback_bug', 'Bug Report')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('fires webhook exactly once when count hits 20 for the first time', async () => {
    mockRpcResult = makeRpcRow(20, [])
    await trackSignalCount('feedback_bug', 'Bug Report')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.com/webhook')
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      signal_type: 'feedback_bug',
      signal_name: 'Bug Report',
      hits_24h: 20,
      threshold: 20,
    })
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire webhook again for threshold 20 when count is 21 (already recorded)', async () => {
    mockRpcResult = makeRpcRow(21, [20])
    await trackSignalCount('feedback_bug', 'Bug Report')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('fires webhook again when count hits 50 (new threshold, 20 already fired)', async () => {
    mockRpcResult = makeRpcRow(50, [20])
    await trackSignalCount('feedback_bug', 'Bug Report')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>
    expect(body).toMatchObject({ hits_24h: 50, threshold: 50 })
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire webhook when count hits 50 but 50 is already in fired_thresholds', async () => {
    mockRpcResult = makeRpcRow(50, [20, 50])
    await trackSignalCount('feedback_bug', 'Bug Report')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('completes without throwing when Supabase returns an error', async () => {
    mockRpcResult = { data: null, error: { message: 'DB error' } }
    await expect(trackSignalCount('contact', 'Contact Form')).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('completes without throwing when Supabase returns empty data', async () => {
    mockRpcResult = { data: [], error: null }
    await expect(trackSignalCount('contact', 'Contact Form')).resolves.toBeUndefined()
  })

  it('completes without throwing when Supabase is not configured (getSupabaseAdmin returns null)', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase/server')
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce(null as unknown as ReturnType<typeof getSupabaseAdmin>)
    await expect(trackSignalCount('contact', 'Contact Form')).resolves.toBeUndefined()
  })
})

describe('fireThresholdWebhook', () => {
  beforeEach(() => {
    fetchSpy.mockClear()
    process.env.PAPERCLIP_SIGNAL_WEBHOOK_URL = 'https://example.com/webhook'
    process.env.PAPERCLIP_SIGNAL_WEBHOOK_SECRET = 'test-secret'
  })

  it('skips fetch when PAPERCLIP_SIGNAL_WEBHOOK_URL is not set', async () => {
    delete process.env.PAPERCLIP_SIGNAL_WEBHOOK_URL
    await fireThresholdWebhook('contact', 'Contact Form', 20)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends correct Authorization header', async () => {
    await fireThresholdWebhook('provider_interest', 'Provider Interest', 50)
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-secret')
  })

  it('completes without throwing when fetch rejects (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network error'))
    await expect(fireThresholdWebhook('contact', 'Contact Form', 20)).resolves.toBeUndefined()
  })
})
