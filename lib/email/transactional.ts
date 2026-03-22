/**
 * Transactional email templates for AirwayLab.
 *
 * These are operational emails (subscription lifecycle, contact confirmation).
 * Users cannot unsubscribe from transactional emails.
 * Footer links to account management instead of unsubscribe.
 */

import { BASE_URL, ctaButton, paragraph, heading, bulletList, emailShell } from './helpers'

// ── Transactional layout (no unsubscribe) ────────────────────

function transactionalLayout(content: string, footerText: string): string {
  return emailShell(`
    ${content}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e1e21;">
      <p style="font-size:11px;color:#52525b;line-height:1.6;margin:0;">
        ${footerText}
      </p>
    </div>
  `)
}

// ── Welcome email (checkout.session.completed) ───────────────

const TIER_BENEFITS: Record<'supporter' | 'champion', string[]> = {
  supporter: [
    'Unlimited AI insights -- every night, automatically',
    'Cloud sync -- upload on your laptop, review on your phone',
    'Priority support -- reply to any email and I\'ll respond personally',
  ],
  champion: [
    'Everything in Supporter',
    'Early access to new analysis engines',
    'Name on the supporters page',
    'Direct input on the roadmap',
  ],
}

export function welcomeEmail(
  tier: 'supporter' | 'champion',
  _interval: string
): { subject: string; html: string } {
  const tierLabel = tier === 'supporter' ? 'Supporter' : 'Champion'

  return {
    subject: `You're in. Here's what's unlocked.`,
    html: transactionalLayout(`
      ${heading('Your analysis just got a lot smarter')}
      ${paragraph('Every time you upload, you\'ll now get AI-powered insights that explain your metrics in plain language -- what your Glasgow Index means for your therapy, whether your flow limitation is improving, and specific settings adjustments to discuss with your clinician.')}
      ${paragraph(`Here's what your ${tierLabel} subscription unlocks:`)}
      ${bulletList(TIER_BENEFITS[tier])}
      ${ctaButton('Upload and Try AI Insights', `${BASE_URL}/analyze?utm_source=email&utm_medium=transactional&utm_campaign=welcome`)}
      ${paragraph('If you have any questions, reply to this email or use the <a href="' + BASE_URL + '/contact" style="color:#5eead4;text-decoration:underline;">contact form</a>.')}
    `, `You're receiving this because you subscribed to AirwayLab ${tierLabel}. Manage your subscription in <a href="${BASE_URL}/account" style="color:#5eead4;text-decoration:none;">account settings</a>.`),
  }
}

// ── Cancellation confirmation (customer.subscription.deleted) ─

export function cancellationEmail(
  periodEnd: string | null
): { subject: string; html: string } {
  const endNote = periodEnd
    ? `You'll keep premium access until ${periodEnd}. After that, you'll be on the free Community tier.`
    : 'Your premium features have been deactivated. You\'re now on the free Community tier.'

  return {
    subject: 'Your AirwayLab subscription has been cancelled',
    html: transactionalLayout(`
      ${heading('Subscription cancelled')}
      ${paragraph(`Your AirwayLab subscription has been cancelled. ${endNote}`)}
      ${paragraph('All four analysis engines, rule-based insights, exports, and local persistence remain free and available. Your existing results are still saved in your browser.')}
      ${paragraph('If you change your mind, you can resubscribe at any time.')}
      ${ctaButton('View plans', `${BASE_URL}/pricing?utm_source=email&utm_medium=transactional&utm_campaign=cancellation`)}
      ${paragraph('We\'d love to know why you cancelled. If you have a moment, reply to this email or use the <a href="' + BASE_URL + '/contact" style="color:#5eead4;text-decoration:underline;">contact form</a>.')}
    `, `You're receiving this because you cancelled your AirwayLab subscription. Visit <a href="${BASE_URL}" style="color:#5eead4;text-decoration:none;">airwaylab.app</a> to continue using the free tier.`),
  }
}

// ── Contact form confirmation ────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  privacy: 'Privacy & Data',
  billing: 'Billing',
  accessibility: 'Accessibility',
  security: 'Security',
}

export function contactConfirmationEmail(
  name: string | null,
  category: string
): { subject: string; html: string } {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const label = CATEGORY_LABELS[category] ?? 'General'

  return {
    subject: 'We received your message',
    html: transactionalLayout(`
      ${heading('Message received')}
      ${paragraph(`${greeting}`)}
      ${paragraph(`We received your ${label.toLowerCase()} enquiry and will get back to you within a few days. For urgent issues, you can also reach us at <a href="mailto:dev@airwaylab.app" style="color:#5eead4;text-decoration:underline;">dev@airwaylab.app</a>.`)}
      ${paragraph('No action needed on your end -- we\'ll reply to this email address.')}
    `, `You're receiving this because you submitted a message on <a href="${BASE_URL}/contact" style="color:#5eead4;text-decoration:none;">airwaylab.app/contact</a>.`),
  }
}
