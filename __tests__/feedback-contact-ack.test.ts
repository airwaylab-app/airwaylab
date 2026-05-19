import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/api/device-diagnostic/_dedup', () => ({
  checkAndUpdateDedup: vi.fn().mockResolvedValue({ shouldFire: true, suppressedCount: 0 }),
  DEDUP_WINDOW_MS: 24 * 60 * 60 * 1000,
}))

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn().mockResolvedValue(undefined),
  formatUserSignalEmbed: vi.fn().mockReturnValue({}),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const mockFrom = vi.fn()
const _mockSelect = vi.fn()
const _mockEq = vi.fn()
const _mockSingle = vi.fn()
const _mockIn = vi.fn()
const _mockMaybeSingle = vi.fn()
const mockInsert = vi.fn()

const supabaseMock = {
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn(() => supabaseMock),
}))

// ── Helpers ───────────────────────────────────────────────────

import { sendEmail } from '@/lib/email/send'
import { checkAndUpdateDedup } from '@/app/api/device-diagnostic/_dedup'

const sendEmailMock = vi.mocked(sendEmail)
const checkAndUpdateDedupMock = vi.mocked(checkAndUpdateDedup)

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Test message',
    email: 'user@example.com',
    type: 'support' as const,
    page: '/contact',
    user_id: null,
    contact_ok: true,
    metadata: {},
    ...overrides,
  }
}

function setupSupabaseMocks({
  profileId = 'profile-1',
  hasProfile = true,
  hasActiveSub = false,
  feedbackInsertOk = true,
}: {
  profileId?: string
  hasProfile?: boolean
  hasActiveSub?: boolean
  feedbackInsertOk?: boolean
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'feedback') {
      return {
        insert: mockInsert.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: feedbackInsertOk ? { id: 'fb-1' } : null,
              error: feedbackInsertOk ? null : new Error('insert failed'),
            }),
          }),
        }),
      }
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: hasProfile ? { id: profileId } : null,
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'subscriptions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: hasActiveSub ? { id: 'sub-1' } : null,
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'kv_alert_dedup') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    }
    return {}
  })
}

// ── Tests ─────────────────────────────────────────────────────

describe('maybeSendContactAck (via submitFeedback)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkAndUpdateDedupMock.mockResolvedValue({ shouldFire: true, suppressedCount: 0 })
  })

  it('sends ack for billing category regardless of subscription', async () => {
    setupSupabaseMocks({ hasProfile: false, hasActiveSub: false })

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const input = makeInput({ metadata: { category: 'billing' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 50))

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        metadata: { emailType: 'contact_ack_paying' },
      }),
    )
  })

  it('sends ack for paying user with non-billing category', async () => {
    setupSupabaseMocks({ hasProfile: true, hasActiveSub: true })

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const input = makeInput({ metadata: { category: 'general' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        metadata: { emailType: 'contact_ack_paying' },
      }),
    )
  })

  it('does NOT send ack for free-tier user with non-billing category', async () => {
    setupSupabaseMocks({ hasProfile: true, hasActiveSub: false })

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const input = makeInput({ metadata: { category: 'general' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    const ackCalls = sendEmailMock.mock.calls.filter(
      (call) => call[0].metadata?.emailType === 'contact_ack_paying',
    )
    expect(ackCalls).toHaveLength(0)
  })

  it('does NOT send ack when email is absent', async () => {
    setupSupabaseMocks()

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const input = makeInput({ email: null, metadata: { category: 'billing' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    const ackCalls = sendEmailMock.mock.calls.filter(
      (call) => call[0].metadata?.emailType === 'contact_ack_paying',
    )
    expect(ackCalls).toHaveLength(0)
  })

  it('suppresses second call within 30-min dedup window', async () => {
    setupSupabaseMocks({ hasProfile: false, hasActiveSub: false })
    checkAndUpdateDedupMock.mockResolvedValue({ shouldFire: false, suppressedCount: 1 })

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const input = makeInput({ metadata: { category: 'billing' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    const ackCalls = sendEmailMock.mock.calls.filter(
      (call) => call[0].metadata?.emailType === 'contact_ack_paying',
    )
    expect(ackCalls).toHaveLength(0)
  })

  it('sends ack to the correct email address (consent gate)', async () => {
    setupSupabaseMocks({ hasProfile: false, hasActiveSub: false })

    const { submitFeedback } = await import('@/lib/services/feedback-service')
    const email = 'specific-user@example.com'
    const input = makeInput({ email, metadata: { category: 'billing' } })

    const result = await submitFeedback(input)
    expect(result.isOk()).toBe(true)

    await new Promise((r) => setTimeout(r, 50))

    const ackCalls = sendEmailMock.mock.calls.filter(
      (call) => call[0].metadata?.emailType === 'contact_ack_paying',
    )
    expect(ackCalls).toHaveLength(1)
    expect(ackCalls[0]![0].to).toBe(email)
  })
})
