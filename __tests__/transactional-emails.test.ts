import { describe, it, expect } from 'vitest'
import { welcomeEmail, cancellationEmail, contactConfirmationEmail } from '@/lib/email/transactional'
import { ctaButton, paragraph, heading, bulletList, emailShell, BASE_URL } from '@/lib/email/helpers'

// ── Helpers ──────────────────────────────────────────────────

describe('email helpers', () => {
  it('paragraph returns styled <p> tag', () => {
    const result = paragraph('Hello world')
    expect(result).toContain('Hello world')
    expect(result).toContain('<p ')
    expect(result).toContain('color:#a1a1aa')
  })

  it('heading returns styled <h2> tag', () => {
    const result = heading('Title')
    expect(result).toContain('Title')
    expect(result).toContain('<h2 ')
    expect(result).toContain('color:#ffffff')
  })

  it('ctaButton returns styled <a> tag with correct href', () => {
    const result = ctaButton('Click me', 'https://example.com')
    expect(result).toContain('Click me')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('background-color:#5eead4')
  })

  it('bulletList renders items as <li> elements', () => {
    const result = bulletList(['First', 'Second', 'Third'])
    expect(result).toContain('<li ')
    expect(result).toContain('First')
    expect(result).toContain('Second')
    expect(result).toContain('Third')
    expect(result).toContain('<ul ')
  })

  it('emailShell includes dark theme and AirwayLab header', () => {
    const result = emailShell('<p>Content</p>')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('color-scheme')
    expect(result).toContain('background-color:#0a0a0b')
    expect(result).toContain('AirwayLab')
    expect(result).toContain('<p>Content</p>')
  })

  it('BASE_URL points to production', () => {
    expect(BASE_URL).toBe('https://airwaylab.app')
  })
})

// ── Welcome email ────────────────────────────────────────────

describe('welcomeEmail', () => {
  it('includes Supporter tier name and benefits', () => {
    const { subject, html } = welcomeEmail('supporter', 'month')
    expect(subject).toBe('Welcome to AirwayLab Supporter')
    expect(html).toContain('Supporter')
    expect(html).toContain('monthly')
    expect(html).toContain('Unlimited AI-powered insights')
    expect(html).toContain('Cloud sync')
  })

  it('includes Champion tier name and benefits', () => {
    const { subject, html } = welcomeEmail('champion', 'year')
    expect(subject).toBe('Welcome to AirwayLab Champion')
    expect(html).toContain('Champion')
    expect(html).toContain('yearly')
    expect(html).toContain('Everything in Supporter')
    expect(html).toContain('Early access')
  })

  it('includes CTA linking to analyze page', () => {
    const { html } = welcomeEmail('supporter', 'month')
    expect(html).toContain(`${BASE_URL}/analyze`)
  })

  it('has account management footer instead of unsubscribe', () => {
    const { html } = welcomeEmail('supporter', 'month')
    expect(html).toContain('/account')
    expect(html).not.toContain('Unsubscribe')
  })

  it('returns valid HTML document', () => {
    const { html } = welcomeEmail('supporter', 'month')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })
})

// ── Cancellation email ───────────────────────────────────────

describe('cancellationEmail', () => {
  it('includes period end date when provided', () => {
    const { subject, html } = cancellationEmail('15 April 2026')
    expect(subject).toBe('Your AirwayLab subscription has been cancelled')
    expect(html).toContain('15 April 2026')
  })

  it('handles null period end gracefully', () => {
    const { html } = cancellationEmail(null)
    expect(html).toContain('deactivated')
    expect(html).not.toContain('null')
  })

  it('mentions free tier remains available', () => {
    const { html } = cancellationEmail(null)
    expect(html).toContain('free')
  })

  it('includes resubscribe CTA linking to pricing', () => {
    const { html } = cancellationEmail(null)
    expect(html).toContain(`${BASE_URL}/pricing`)
  })

  it('has no unsubscribe link', () => {
    const { html } = cancellationEmail(null)
    expect(html).not.toContain('Unsubscribe')
  })
})

// ── Contact confirmation email ───────────────────────────────

describe('contactConfirmationEmail', () => {
  it('includes name greeting when provided', () => {
    const { subject, html } = contactConfirmationEmail('Alice', 'general')
    expect(subject).toBe('We received your message')
    expect(html).toContain('Hi Alice,')
  })

  it('uses generic greeting when name is null', () => {
    const { html } = contactConfirmationEmail(null, 'billing')
    expect(html).toContain('Hi,')
    expect(html).not.toContain('null')
  })

  it('includes category label', () => {
    const { html } = contactConfirmationEmail(null, 'privacy')
    expect(html).toContain('privacy & data')
  })

  it('includes response time expectation', () => {
    const { html } = contactConfirmationEmail(null, 'general')
    expect(html).toContain('few days')
  })

  it('falls back to General for unknown category', () => {
    const { html } = contactConfirmationEmail(null, 'unknown')
    expect(html).toContain('general')
  })

  it('has no unsubscribe link', () => {
    const { html } = contactConfirmationEmail(null, 'general')
    expect(html).not.toContain('Unsubscribe')
  })
})
