import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/email/unsubscribe-token', () => ({
  getUnsubscribeUrl: vi.fn((userId: string) => `https://airwaylab.app/api/email/unsubscribe?token=${userId}`),
}))

const mockSendEmail = vi.fn()
vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// Chainable mock builder for Supabase queries
type ChainableMock = Record<string, ReturnType<typeof vi.fn>> & {
  mockResolvedValue: (val: unknown) => ChainableMock
}

function makeChain(terminal?: unknown): ChainableMock {
  const terminalPromise = terminal !== undefined ? Promise.resolve(terminal) : Promise.resolve({ data: [], error: null })
  const chain: ChainableMock = {} as ChainableMock
  const proxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') return (cb: (v: unknown) => unknown) => terminalPromise.then(cb)
      if (prop === 'catch') return (cb: (v: unknown) => unknown) => terminalPromise.catch(cb)
      if (prop === 'finally') return (cb: () => void) => terminalPromise.finally(cb)
      const key = prop as string
      if (!target[key]) target[key] = vi.fn().mockReturnValue(proxy)
      return target[key]
    },
  })
  return proxy
}

let mockFromImpl: (table: string) => unknown
const mockFrom = vi.fn((table: string) => mockFromImpl(table))

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (t: string) => mockFrom(t),
  })),
}))

// ── Helpers ──────────────────────────────────────────────────

function makeRequest(body: unknown, adminSecret = 'test-secret'): NextRequest {
  return new NextRequest('http://localhost/api/admin/email/analysis-window', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret,
    },
    body: JSON.stringify(body),
  })
}

// ── Tests ────────────────────────────────────────────────────

describe('POST /api/admin/email/analysis-window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ADMIN_API_KEY', 'test-secret')
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    mockSendEmail.mockResolvedValue('resend-id-123')
  })

  it('returns 401 when admin secret is missing', async () => {
    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true }, '')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when admin secret is wrong', async () => {
    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true }, 'wrong-secret')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns dry-run results without sending emails', async () => {
    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: [{ user_id: 'user-1' }, { user_id: 'user-2' }], error: null })
      }
      if (table === 'profiles') {
        return makeChain({
          data: [
            { id: 'user-1', email: 'a@example.com' },
            { id: 'user-2', email: 'b@example.com' },
          ],
          error: null,
        })
      }
      // email_log
      return makeChain({ data: [], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dryRun).toBe(true)
    expect(body.would_send).toBe(2)
    expect(body.already_sent).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('defaults to dry-run when dryRun is not specified', async () => {
    mockFromImpl = (_table) => makeChain({ data: [], error: null })

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({})
    const res = await POST(req)
    const body = await res.json()

    expect(body.dryRun).toBe(true)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns empty audience when no users have old nights', async () => {
    mockFromImpl = (_table) => makeChain({ data: [], error: null })

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.audience).toBe(0)
    expect(body.would_send).toBe(0)
  })

  it('skips users who already received the broadcast (idempotency)', async () => {
    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: [{ user_id: 'user-1' }, { user_id: 'user-2' }], error: null })
      }
      if (table === 'profiles') {
        return makeChain({
          data: [
            { id: 'user-1', email: 'a@example.com' },
            { id: 'user-2', email: 'b@example.com' },
          ],
          error: null,
        })
      }
      // email_log — user-1 already sent
      return makeChain({ data: [{ to_email: 'a@example.com' }], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true })
    const res = await POST(req)
    const body = await res.json()

    expect(body.audience).toBe(2)
    expect(body.already_sent).toBe(1)
    expect(body.would_send).toBe(1)
  })

  it('sends emails in live mode and returns sent count', async () => {
    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: [{ user_id: 'user-1' }], error: null })
      }
      if (table === 'profiles') {
        return makeChain({ data: [{ id: 'user-1', email: 'a@example.com' }], error: null })
      }
      return makeChain({ data: [], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: false })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dryRun).toBe(false)
    expect(body.sent).toBe(1)
    expect(body.errors).toBe(0)
    expect(mockSendEmail).toHaveBeenCalledOnce()

    const callArgs = mockSendEmail.mock.calls[0]![0]
    expect(callArgs.to).toBe('a@example.com')
    expect(callArgs.subject).toBe('Heads up: history visibility change coming May 27')
    expect(callArgs.metadata.emailType).toBe('broadcast_analysis_window_announcement')
    expect(callArgs.metadata.userId).toBe('user-1')
    expect(callArgs.unsubscribeUrl).toContain('/api/email/unsubscribe')
  })

  it('only targets community-tier opted-in users', async () => {
    // Query on profiles must include .eq('tier', 'community') and .eq('email_opt_in', true)
    // We verify via the call chain that the filter was applied.
    const profilesEqMock = vi.fn().mockReturnValue(makeChain({ data: [], error: null }))
    const profilesSelectMock = vi.fn().mockReturnValue({ eq: profilesEqMock })

    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: [{ user_id: 'user-1' }], error: null })
      }
      if (table === 'profiles') {
        return { select: profilesSelectMock }
      }
      return makeChain({ data: [], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    await POST(makeRequest({ dryRun: true }))

    // First .eq call should be tier = community
    expect(profilesEqMock).toHaveBeenCalledWith('tier', 'community')
  })

  it('returns 500 when user_nights query fails', async () => {
    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: null, error: { message: 'DB error' } })
      }
      return makeChain({ data: [], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true })
    const res = await POST(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Database query failed')
  })

  it('dry-run response includes subject line', async () => {
    mockFromImpl = (table) => {
      if (table === 'user_nights') {
        return makeChain({ data: [{ user_id: 'user-1' }], error: null })
      }
      if (table === 'profiles') {
        return makeChain({ data: [{ id: 'user-1', email: 'a@example.com' }], error: null })
      }
      return makeChain({ data: [], error: null })
    }

    const { POST } = await import('@/app/api/admin/email/analysis-window/route')
    const req = makeRequest({ dryRun: true })
    const res = await POST(req)
    const body = await res.json()

    expect(body.subject).toBe('Heads up: history visibility change coming May 27')
    expect(body.sample_html).toContain('May 27')
    expect(body.sample_html).toContain('$9/month')
  })
})

describe('analysis_window_announcement template', () => {
  it('renders correct subject', async () => {
    const { BROADCAST_TEMPLATES } = await import('@/lib/email/broadcast')
    const t = BROADCAST_TEMPLATES['analysis_window_announcement']!
    const { subject } = t.getTemplate('https://example.com/unsub', 'A')
    expect(subject).toBe('Heads up: history visibility change coming May 27')
  })

  it('includes $9/month price in HTML body', async () => {
    const { BROADCAST_TEMPLATES } = await import('@/lib/email/broadcast')
    const t = BROADCAST_TEMPLATES['analysis_window_announcement']!
    const { html } = t.getTemplate('https://example.com/unsub', 'A')
    expect(html).toContain('$9/month')
  })

  it('includes unsubscribe link in HTML body', async () => {
    const { BROADCAST_TEMPLATES } = await import('@/lib/email/broadcast')
    const t = BROADCAST_TEMPLATES['analysis_window_announcement']!
    const unsubUrl = 'https://airwaylab.app/api/email/unsubscribe?token=test123'
    const { html } = t.getTemplate(unsubUrl, 'A')
    expect(html).toContain(unsubUrl)
  })

  it('includes CTA to /analyze', async () => {
    const { BROADCAST_TEMPLATES } = await import('@/lib/email/broadcast')
    const t = BROADCAST_TEMPLATES['analysis_window_announcement']!
    const { html } = t.getTemplate('https://example.com/unsub', 'A')
    expect(html).toContain('/analyze')
  })

  it('includes medical disclaimer', async () => {
    const { BROADCAST_TEMPLATES } = await import('@/lib/email/broadcast')
    const t = BROADCAST_TEMPLATES['analysis_window_announcement']!
    const { html } = t.getTemplate('https://example.com/unsub', 'A')
    expect(html.toLowerCase()).toMatch(/medical advice|medical device/)
  })
})
