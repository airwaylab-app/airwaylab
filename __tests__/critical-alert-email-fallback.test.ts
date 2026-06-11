/**
 * Tests for critical alert email fallback (AIR-1848).
 *
 * Verifies that alertStripePaymentFailed, alertCredentialExpiry, and
 * alertSecurityIncident each send both a Discord push AND a Resend email,
 * and that Resend failures are captured to Sentry without throwing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so mock factories can reference these before module import
const { mockSentryCaptureException, mockSentryCaptureMessage, mockSendEmail } = vi.hoisted(() => ({
  mockSentryCaptureException: vi.fn(),
  mockSentryCaptureMessage: vi.fn(),
  mockSendEmail: vi.fn().mockResolvedValue('resend-msg-id'),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: mockSentryCaptureException,
  captureMessage: mockSentryCaptureMessage,
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: mockSendEmail,
}))

// Mock fetch for Discord webhook
const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
vi.stubGlobal('fetch', mockFetch)

import {
  alertStripePaymentFailed,
  alertCredentialExpiry,
  alertSecurityIncident,
  sendCriticalAlert,
} from '@/lib/discord-webhook'

describe('critical alert email fallback (AIR-1848)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue('resend-msg-id')
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }))
    process.env.DISCORD_WEBHOOK_CRITICAL = 'https://discord.com/api/webhooks/test/critical'
    process.env.RESEND_API_KEY = 're_test_key'
  })

  describe('alertStripePaymentFailed', () => {
    it('sends both Discord and Resend email on the final attempt', async () => {
      // No args (or nextAttemptAt == null) means the FINAL dunning attempt:
      // the critical path (Discord #critical + ops email) must fire.
      await alertStripePaymentFailed({ nextAttemptAt: null })

      // Discord fired
      expect(mockFetch).toHaveBeenCalledOnce()
      const discordUrl = (mockFetch.mock.calls[0] as unknown[])[0] as string
      expect(discordUrl).toBe('https://discord.com/api/webhooks/test/critical')

      // Email fired to ops address
      expect(mockSendEmail).toHaveBeenCalledOnce()
      const emailArgs = (mockSendEmail.mock.calls[0] as unknown[])[0] as {
        to: string
        subject: string
        text: string
      }
      expect(emailArgs.to).toBe('d.voorhagen@gmail.com')
      expect(emailArgs.subject).toBe('[AirwayLab URGENT] Final payment attempt failed — subscription will cancel')
      expect(emailArgs.text).toContain('Stripe')
    })

    it('fires email even when Discord webhook is not configured', async () => {
      delete process.env.DISCORD_WEBHOOK_CRITICAL

      await alertStripePaymentFailed({ nextAttemptAt: null })

      // Discord skipped (no URL)
      expect(mockFetch).not.toHaveBeenCalled()

      // Email still fires independently
      expect(mockSendEmail).toHaveBeenCalledOnce()
    })

    it('posts a calm #revenue note with NO email when a retry is still pending', async () => {
      // nextAttemptAt set = Stripe will retry again. Routine: #revenue only, no email.
      process.env.DISCORD_REVENUE_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/revenue'

      await alertStripePaymentFailed({
        amountCents: 900,
        attemptCount: 1,
        nextAttemptAt: 1_900_000_000, // far-future epoch seconds
        customerEmail: 'patient@example.com',
        subscriptionId: 'sub_abc123',
      })

      // Posted to #revenue, NOT #critical
      expect(mockFetch).toHaveBeenCalledOnce()
      const url = (mockFetch.mock.calls[0] as unknown[])[0] as string
      expect(url).toBe('https://discord.com/api/webhooks/test/revenue')

      // No ops email on a routine retry
      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })

  describe('alertCredentialExpiry', () => {
    it('sends Discord and email with correct subject', async () => {
      await alertCredentialExpiry(48, 'GitHub PAT')

      expect(mockFetch).toHaveBeenCalledOnce()

      expect(mockSendEmail).toHaveBeenCalledOnce()
      const emailArgs = (mockSendEmail.mock.calls[0] as unknown[])[0] as {
        to: string
        subject: string
      }
      expect(emailArgs.to).toBe('d.voorhagen@gmail.com')
      expect(emailArgs.subject).toBe('[AirwayLab URGENT] Credential expires in 48h: GitHub PAT')
    })
  })

  describe('alertSecurityIncident', () => {
    it('sends Discord and email with description', async () => {
      await alertSecurityIncident('Unauthorized access to admin API')

      expect(mockFetch).toHaveBeenCalledOnce()

      expect(mockSendEmail).toHaveBeenCalledOnce()
      const emailArgs = (mockSendEmail.mock.calls[0] as unknown[])[0] as {
        to: string
        subject: string
        text: string
      }
      expect(emailArgs.to).toBe('d.voorhagen@gmail.com')
      expect(emailArgs.subject).toContain('[AirwayLab URGENT] Security incident:')
      expect(emailArgs.text).toContain('Unauthorized access to admin API')
    })
  })

  describe('Resend failure handling', () => {
    it('captures to Sentry when sendEmail returns null, does not throw', async () => {
      mockSendEmail.mockResolvedValue(null)

      await expect(alertStripePaymentFailed()).resolves.not.toThrow()

      expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Critical ops email failed'),
        expect.objectContaining({ level: 'error' })
      )
    })

    it('captures to Sentry when sendEmail throws, does not throw', async () => {
      mockSendEmail.mockRejectedValue(new Error('network timeout'))

      await expect(alertStripePaymentFailed()).resolves.not.toThrow()

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ level: 'error' })
      )
    })

    it('returns Discord result even if email fails', async () => {
      mockSendEmail.mockRejectedValue(new Error('Resend down'))

      const result = await alertStripePaymentFailed()

      // Discord succeeded → true
      expect(result).toBe(true)
    })
  })

  describe('sendCriticalAlert', () => {
    it('fires Discord and email in parallel, returns Discord result', async () => {
      const result = await sendCriticalAlert(
        '[AirwayLab URGENT] Test',
        'Test body',
        'Test content'
      )

      expect(mockFetch).toHaveBeenCalledOnce()
      expect(mockSendEmail).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })
  })
})
