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
    'Unlimited AI-powered insights for every night',
    'Cloud sync -- access your results on any device',
    'Priority support',
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
  interval: string
): { subject: string; html: string } {
  const tierLabel = tier === 'supporter' ? 'Supporter' : 'Champion'
  const intervalLabel = interval === 'year' ? 'yearly' : 'monthly'

  return {
    subject: `Welcome to AirwayLab ${tierLabel}`,
    html: transactionalLayout(`
      ${heading(`Welcome to AirwayLab ${tierLabel}`)}
      ${paragraph(`Thanks for supporting AirwayLab with a ${intervalLabel} ${tierLabel} subscription. Your support funds ongoing development of open-source sleep analysis tools.`)}
      ${paragraph('Your account has been upgraded. Here\'s what you now have access to:')}
      ${bulletList(TIER_BENEFITS[tier])}
      ${ctaButton('Go to AirwayLab', `${BASE_URL}/analyze?utm_source=email&utm_medium=transactional&utm_campaign=welcome`)}
      ${paragraph('If you have any questions, reply to this email or use the <a href="' + BASE_URL + '/contact" style="color:#5eead4;text-decoration:underline;">contact form</a>.')}
    `, `You're receiving this because you subscribed to AirwayLab ${tierLabel}. Manage your subscription in <a href="${BASE_URL}/account" style="color:#5eead4;text-decoration:none;">account settings</a>.`),
  }
}

// ── Cancellation confirmation (customer.subscription.deleted) ─

export function cancellationEmail(
  periodEnd: string | null
): { subject: string; html: string } {
  const endNote = periodEnd
    ? `Your ${periodEnd} access continues until the end of your current billing period.`
    : 'Your premium features have been deactivated.'

  return {
    subject: 'Your AirwayLab subscription has been cancelled',
    html: transactionalLayout(`
      ${heading('Subscription cancelled')}
      ${paragraph(`Your AirwayLab subscription has been cancelled. ${endNote}`)}
      ${paragraph('All core analysis features remain free and available -- four engines, insights, exports, and local persistence. Your existing results are still saved in your browser.')}
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
