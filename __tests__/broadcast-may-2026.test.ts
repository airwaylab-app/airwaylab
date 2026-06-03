import { describe, it, expect } from 'vitest'
import { BROADCAST_TEMPLATES, type BroadcastTemplate } from '@/lib/email/broadcast'

const UNSUB_URL = 'https://airwaylab.app/api/email/unsubscribe?token=test-token'

const TEMPLATE_IDS = [
  'monthly_review_may_2026',
  'monthly_review_may_2026_engaged',
  'monthly_review_may_2026_dormant',
] as const

function getTemplate(id: string): BroadcastTemplate {
  const tmpl = BROADCAST_TEMPLATES[id]
  if (!tmpl) throw new Error(`Template ${id} not registered in BROADCAST_TEMPLATES`)
  return tmpl
}

describe('May 2026 broadcast templates — registry', () => {
  it.each(TEMPLATE_IDS)('%s is registered in BROADCAST_TEMPLATES', (id) => {
    const tmpl = getTemplate(id)
    expect(tmpl.id).toBe(id)
    expect(tmpl.description).toBeTruthy()
    expect(typeof tmpl.getTemplate).toBe('function')
  })
})

describe('May 2026 broadcast templates — structural invariants', () => {
  it.each(TEMPLATE_IDS)('%s variant A returns non-empty subject and valid HTML', (id) => {
    const { subject, html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    expect(subject.length).toBeGreaterThan(0)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it.each(TEMPLATE_IDS)('%s variant B returns a different subject than A', (id) => {
    const tmpl = getTemplate(id)
    const a = tmpl.getTemplate(UNSUB_URL, 'A')
    const b = tmpl.getTemplate(UNSUB_URL, 'B')
    expect(a.subject).not.toBe(b.subject)
  })

  it.each(TEMPLATE_IDS)('%s includes unsubscribe link', (id) => {
    const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    expect(html).toContain(UNSUB_URL)
    expect(html).toContain('Unsubscribe')
  })

  it.each(TEMPLATE_IDS)('%s includes UTM params for monthly_review_may_2026 campaign', (id) => {
    const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    expect(html).toContain('utm_source=email')
    expect(html).toContain('utm_medium=broadcast')
    expect(html).toContain('utm_campaign=monthly_review_may_2026')
  })

  it.each(TEMPLATE_IDS)('%s includes GDPR B.V. controller-change notice', (id) => {
    const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    expect(html).toContain('AirwayLab B.V.')
    expect(html).toContain('Helperpark 274-6')
    expect(html).toContain('2026-05-20')
  })

  it.each(TEMPLATE_IDS)('%s does not duplicate the medical disclaimer', (id) => {
    const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    // emailShell adds the disclaimer once; templates must not add it again
    const count = (html.match(/not a medical device/g) ?? []).length
    expect(count).toBe(1)
  })

  it.each(TEMPLATE_IDS)('%s uses broadcastLayout (footer has opted-in copy)', (id) => {
    const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
    expect(html).toContain('opted in to email updates')
  })
})

describe('May 2026 broadcast templates — content', () => {
  it('monthly_review_may_2026 (paying) includes thank-you and supporter acknowledgement', () => {
    const { html } = getTemplate('monthly_review_may_2026').getTemplate(UNSUB_URL, 'A')
    expect(html).toContain('paying supporters')
    expect(html).toContain('Thank you')
  })

  it('monthly_review_may_2026 subject A matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026').getTemplate(UNSUB_URL, 'A')
    expect(subject).toBe('A month of honest fixes, and a thank you')
  })

  it('monthly_review_may_2026 subject B matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026').getTemplate(UNSUB_URL, 'B')
    expect(subject).toBe('What changed in AirwayLab this month (and what you made possible)')
  })

  it('monthly_review_may_2026_engaged subject A matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026_engaged').getTemplate(UNSUB_URL, 'A')
    expect(subject).toBe('AirSense 11 is fully supported now')
  })

  it('monthly_review_may_2026_engaged subject B matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026_engaged').getTemplate(UNSUB_URL, 'B')
    expect(subject).toBe('What shipped in AirwayLab this month')
  })

  it('monthly_review_may_2026_dormant subject A matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026_dormant').getTemplate(UNSUB_URL, 'A')
    expect(subject).toBe('Your CPAP data is probably readable now')
  })

  it('monthly_review_may_2026_dormant subject B matches approved copy', () => {
    const { subject } = getTemplate('monthly_review_may_2026_dormant').getTemplate(UNSUB_URL, 'B')
    expect(subject).toBe('We fixed the AirSense 11 reader. Try again')
  })

  it('monthly_review_may_2026_dormant includes data-stays-in-browser reassurance', () => {
    const { html } = getTemplate('monthly_review_may_2026_dormant').getTemplate(UNSUB_URL, 'A')
    expect(html).toContain('stays in your browser')
  })

  it('all segments mention AirSense 11 fix', () => {
    for (const id of TEMPLATE_IDS) {
      const { html } = getTemplate(id).getTemplate(UNSUB_URL, 'A')
      expect(html).toContain('AirSense 11')
    }
  })

  it('subject lines contain no em-dashes (CAN-SPAM Gmail compatibility)', () => {
    for (const id of TEMPLATE_IDS) {
      for (const variant of ['A', 'B'] as const) {
        const { subject } = getTemplate(id).getTemplate(UNSUB_URL, variant)
        expect(subject).not.toContain('—') // em-dash
        expect(subject).not.toContain('–') // en-dash
      }
    }
  })
})
