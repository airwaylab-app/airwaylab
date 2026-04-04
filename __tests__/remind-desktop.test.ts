import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock external dependencies before importing routes ─────────

const mockValidateOrigin = vi.fn(() => true)
vi.mock('@/lib/csrf', () => ({
  validateOrigin: (...args: Parameters<typeof mockValidateOrigin>) => mockValidateOrigin(...args),
}))

const mockIsLimited = vi.fn(async () => false)
vi.mock('@/lib/rate-limit', () => ({
  RateLimiter: class {
    isLimited() { return mockIsLimited() }
  },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
    })),
  })),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendEmail: (...args: any[]) => Promise<string> = vi.fn(async () => 'resend-id-123')
vi.mock('@/lib/email/send', () => ({
  sendEmail: (args: unknown) => mockSendEmail(args),
}))

vi.mock('@/lib/email/transactional', () => ({
  remindDesktopEmail: vi.fn(() => ({
    subject: 'Your AirwayLab analysis is waiting',
    html: '<html>reminder email</html>',
  })),
}))

// ── Helpers ────────────────────────────────────────────────────

function makePostRequest(body: unknown): Request {
  return new Request('https://airwaylab.app/api/remind-desktop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://airwaylab.app' },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(token: string | null): Request {
  const url = token
    ? `https://airwaylab.app/api/remind-desktop/unsubscribe?token=${token}`
    : 'https://airwaylab.app/api/remind-desktop/unsubscribe'
  return new Request(url, { method: 'GET' })
}

async function callPost(body: unknown) {
  const { POST } = await import('@/app/api/remind-desktop/route')
  return POST(makePostRequest(body) as never)
}

async function callGet(token: string | null) {
  const { GET } = await import('@/app/api/remind-desktop/unsubscribe/route')
  return GET(makeGetRequest(token) as never)
}

// ── POST /api/remind-desktop ───────────────────────────────────

describe('POST /api/remind-desktop', () => {
  beforeEach(() => {
    vi.resetModules()
    mockValidateOrigin.mockReturnValue(true)
    mockIsLimited.mockResolvedValue(false)
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { unsubscribe_token: 'test-token-uuid' },
          error: null,
        }),
      }),
    })
  })

  it('returns 204 for valid email and consent', async () => {
    const res = await callPost({ email: 'user@example.com', consent: true })
    expect(res.status).toBe(204)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await callPost({ email: 'not-an-email', consent: true })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid email/i)
  })

  it('returns 400 when consent is false', async () => {
    const res = await callPost({ email: 'user@example.com', consent: false })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/consent/i)
  })

  it('returns 400 when consent is missing', async () => {
    const res = await callPost({ email: 'user@example.com' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const res = await callPost({ consent: true })
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty body', async () => {
    const { POST } = await import('@/app/api/remind-desktop/route')
    const req = new Request('https://airwaylab.app/api/remind-desktop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://airwaylab.app' },
      body: 'not json',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockIsLimited.mockResolvedValue(true)
    const res = await callPost({ email: 'user@example.com', consent: true })
    expect(res.status).toBe(429)
  })

  it('returns 403 when origin is invalid', async () => {
    mockValidateOrigin.mockReturnValue(false)
    const res = await callPost({ email: 'user@example.com', consent: true })
    expect(res.status).toBe(403)
  })

  it('calls sendEmail with the reminder email content', async () => {
    await callPost({ email: 'user@example.com', consent: true })
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your AirwayLab analysis is waiting',
        unsubscribeUrl: expect.stringContaining('test-token-uuid'),
        metadata: expect.objectContaining({ emailType: 'remind_desktop' }),
      })
    )
  })
})

// ── GET /api/remind-desktop/unsubscribe ───────────────────────

describe('GET /api/remind-desktop/unsubscribe', () => {
  beforeEach(() => {
    vi.resetModules()
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'some-uuid' },
              error: null,
            }),
          }),
        }),
      }),
    })
  })

  it('returns 200 HTML with unsubscribed message for valid token', async () => {
    const res = await callGet('valid-token-uuid')
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("You've been unsubscribed")
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('returns 400 HTML when token is not found', async () => {
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })
    const res = await callGet('unknown-token')
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('Invalid or expired link')
  })

  it('returns 400 HTML when no token is provided', async () => {
    const res = await callGet(null)
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('Invalid or expired link')
  })
})

// ── Email template ─────────────────────────────────────────────

describe('remindDesktopEmail template', () => {
  it('returns correct subject', async () => {
    const { remindDesktopEmail } = await import('@/lib/email/transactional')
    const { subject } = remindDesktopEmail('https://airwaylab.app/api/remind-desktop/unsubscribe?token=abc')
    expect(subject).toBe('Your AirwayLab analysis is waiting')
  })

  it('includes CTA link to /analyze', async () => {
    // Un-mock transactional for this suite to test the real template
    vi.doMock('@/lib/email/transactional', async () => {
      const actual = await vi.importActual<typeof import('@/lib/email/transactional')>('@/lib/email/transactional')
      return actual
    })
    const { remindDesktopEmail } = await import('@/lib/email/transactional')
    const { html } = remindDesktopEmail('https://airwaylab.app/api/remind-desktop/unsubscribe?token=test')
    expect(html).toContain('airwaylab.app/analyze')
  })

  it('includes the unsubscribe link in the email', async () => {
    vi.doMock('@/lib/email/transactional', async () => {
      const actual = await vi.importActual<typeof import('@/lib/email/transactional')>('@/lib/email/transactional')
      return actual
    })
    const { remindDesktopEmail } = await import('@/lib/email/transactional')
    const unsubUrl = 'https://airwaylab.app/api/remind-desktop/unsubscribe?token=test-abc'
    const { html } = remindDesktopEmail(unsubUrl)
    expect(html).toContain(unsubUrl)
  })

  it('includes medical disclaimer text', async () => {
    vi.doMock('@/lib/email/transactional', async () => {
      const actual = await vi.importActual<typeof import('@/lib/email/transactional')>('@/lib/email/transactional')
      return actual
    })
    const { remindDesktopEmail } = await import('@/lib/email/transactional')
    const { html } = remindDesktopEmail('https://airwaylab.app/api/remind-desktop/unsubscribe?token=t')
    expect(html).toContain('not a medical device')
  })
})
