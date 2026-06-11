/**
 * Tests the Resend webhook handler's payload validation.
 *
 * Covers both the legacy format (data.email_id) and the newer Resend API
 * format (data.id) — JAVASCRIPT-NEXTJS-86 was caused by the new format
 * failing validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (must precede route import) ──────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

vi.mock('@/lib/email/sequences', () => ({
  cancelAllPending: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  formatEmailAlertEmbed: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/env', () => ({
  serverEnv: {
    RESEND_WEBHOOK_SECRET: 'test-secret',
  },
}))

import { POST } from '@/app/api/webhooks/resend/route'
import * as Sentry from '@sentry/nextjs'

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL('http://localhost/api/webhooks/resend?secret=test-secret'),
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

function supabaseChain() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Resend webhook payload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(supabaseChain())
  })

  it('accepts legacy format with data.email_id', async () => {
    const res = await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T15:00:00.000Z',
      data: {
        email_id: 'legacy-id-123',
        from: 'noreply@mail.airwaylab.app',
        to: ['user@example.com'],
        subject: 'Test',
      },
    }))
    expect(res.status).toBe(200)
    expect(Sentry.captureMessage).not.toHaveBeenCalledWith(
      'Resend webhook: invalid payload',
      expect.anything()
    )
  })

  it('accepts new format with data.id (JAVASCRIPT-NEXTJS-86 regression)', async () => {
    const res = await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T17:00:00.000Z',
      data: {
        id: 'new-format-id-456',
        object: 'email',
        from: 'noreply@mail.airwaylab.app',
        to: ['user@example.com'],
        subject: 'Test',
      },
    }))
    expect(res.status).toBe(200)
    expect(Sentry.captureMessage).not.toHaveBeenCalledWith(
      'Resend webhook: invalid payload',
      expect.anything()
    )
  })

  it('prefers email_id when both fields are present', async () => {
    const chain = supabaseChain()
    mockFrom.mockReturnValue(chain)

    await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T17:00:00.000Z',
      data: {
        email_id: 'legacy-takes-precedence',
        id: 'new-format-id',
        from: 'noreply@mail.airwaylab.app',
        to: ['user@example.com'],
      },
    }))

    // The eq() call on the Supabase chain should use the legacy email_id value
    expect(chain.eq).toHaveBeenCalledWith('resend_id', 'legacy-takes-precedence')
  })

  it('rejects payload missing both email_id and id with 400', async () => {
    const res = await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T15:00:00.000Z',
      data: {
        from: 'noreply@mail.airwaylab.app',
        to: ['user@example.com'],
      },
    }))
    expect(res.status).toBe(400)
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Resend webhook: invalid payload',
      expect.anything()
    )
  })

  it('rejects payload missing data entirely with 400', async () => {
    const res = await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T15:00:00.000Z',
    }))
    expect(res.status).toBe(400)
  })

  it('rejects payload missing created_at with 400', async () => {
    const res = await POST(makeRequest({
      type: 'email.delivered',
      data: { email_id: 'some-id' },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 401 for missing secret', async () => {
    const req = new NextRequest(
      new URL('http://localhost/api/webhooks/resend'),
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'email.delivered',
          created_at: '2026-06-08T15:00:00.000Z',
          data: { email_id: 'x' },
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('uses data.id as resend_id when looking up email_sequences', async () => {
    const chain = supabaseChain()
    mockFrom.mockReturnValue(chain)

    await POST(makeRequest({
      type: 'email.delivered',
      created_at: '2026-06-08T17:00:00.000Z',
      data: {
        id: 'new-format-lookup-id',
        from: 'noreply@mail.airwaylab.app',
        to: ['user@example.com'],
      },
    }))

    expect(chain.eq).toHaveBeenCalledWith('resend_id', 'new-format-lookup-id')
  })
})
