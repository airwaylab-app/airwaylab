import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @sentry/nextjs before importing the module under test
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

// Mock env so the function proceeds past the apiKey guard
vi.mock('@/lib/env', () => ({
  serverEnv: {
    RESEND_API_KEY: 'test-key',
  },
}))

// Mock Supabase service role client
const mockInsert = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

import * as Sentry from '@sentry/nextjs'

describe('sendEmail Sentry captures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('captures exception with subsystem:email-send on Resend API 500', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)

    const { sendEmail } = await import('@/lib/email/send')
    const result = await sendEmail({ to: 'user@example.com', subject: 'Test', text: 'body' })

    expect(result).toBeNull()
    expect(Sentry.captureException).toHaveBeenCalledOnce()
    const call0 = vi.mocked(Sentry.captureException).mock.calls[0]
    const err = call0?.[0]
    const ctx = call0?.[1]
    expect((err as Error).message).toContain('Resend API 500')
    expect(ctx).toMatchObject({ tags: { subsystem: 'email-send' } })
    // Must not include full email address
    expect(JSON.stringify(ctx)).not.toContain('user@example.com')
  })

  it('captures exception with subsystem:email-send on network fetch throw', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network failure'))

    const { sendEmail } = await import('@/lib/email/send')
    const result = await sendEmail({ to: 'user@example.com', subject: 'Test', text: 'body' })

    expect(result).toBeNull()
    expect(Sentry.captureException).toHaveBeenCalledOnce()
    const ctx1 = vi.mocked(Sentry.captureException).mock.calls[0]?.[1]
    expect(ctx1).toMatchObject({ tags: { subsystem: 'email-send' } })
  })

  it('captures exception with subsystem:email-log-insert on email_log insert error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'resend-123' }),
    } as Response)

    mockInsert.mockResolvedValueOnce({ error: { message: 'DB constraint violation' } })

    const { sendEmail } = await import('@/lib/email/send')
    // Await so the void logEmail fire-and-forget has time to run
    await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'body',
      metadata: { emailType: 'test-type' },
    })

    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0))

    expect(Sentry.captureException).toHaveBeenCalledOnce()
    const ctx2 = vi.mocked(Sentry.captureException).mock.calls[0]?.[1]
    expect(ctx2).toMatchObject({ tags: { subsystem: 'email-log-insert' } })
  })
})
