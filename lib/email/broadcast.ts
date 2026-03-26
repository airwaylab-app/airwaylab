/**
 * Broadcast email templates for AirwayLab.
 *
 * One-off emails to all opted-in users. Each broadcast is a named function
 * returning { subject, html }. The broadcast API route looks up templates
 * by ID from the BROADCAST_TEMPLATES registry at the bottom.
 */

import { BASE_URL, ctaButton, paragraph, emailShell } from './helpers'

// ── Broadcast layout (with unsubscribe) ──────────────────────

function broadcastLayout(content: string, unsubscribeUrl: string): string {
  return emailShell(`
    ${content}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e1e21;">
      <p style="font-size:11px;color:#52525b;line-height:1.6;margin:0;">
        You're receiving this because you opted in to email updates on
        <a href="${BASE_URL}" style="color:#5eead4;text-decoration:none;">airwaylab.app</a>.
      </p>
      <p style="font-size:11px;color:#52525b;margin:8px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Unsubscribe</a>
        from these emails.
      </p>
    </div>
  `)
}

function smallText(text: string): string {
  return `<p style="font-size:12px;color:#71717a;line-height:1.6;margin:16px 0 0 0;">${text}</p>`
}

function subheading(text: string): string {
  return `<h3 style="font-size:16px;color:#ffffff;font-weight:600;margin:24px 0 8px 0;">${text}</h3>`
}

// ── March 2026 update broadcast ──────────────────────────────

export type BroadcastSubjectVariant = 'A' | 'B'

function march2026Update(unsubscribeUrl: string, subjectVariant: BroadcastSubjectVariant): { subject: string; html: string } {
  const subjects: Record<BroadcastSubjectVariant, string> = {
    A: '130 updates in 2 weeks. Here\'s what changed.',
    B: 'Your AHI says you\'re fine. Your data says otherwise.',
  }

  const ANALYZE_URL = `${BASE_URL}/analyze?utm_source=email&utm_medium=broadcast&utm_campaign=march_2026`
  const PRICING_URL = `${BASE_URL}/pricing?utm_source=email&utm_medium=broadcast&utm_campaign=march_2026`
  const DISCORD_URL = 'https://discord.gg/DK7aN847Mn'
  const GETTING_STARTED_URL = `${BASE_URL}/getting-started?utm_source=email&utm_medium=broadcast&utm_campaign=march_2026`
  const CHANGELOG_URL = `${BASE_URL}/changelog?utm_source=email&utm_medium=broadcast&utm_campaign=march_2026`

  return {
    subject: subjects[subjectVariant],
    html: broadcastLayout(`
      ${paragraph('AirwayLab launched two weeks ago. In that time we\'ve shipped over 130 updates. Here\'s what matters most.')}

      ${subheading('Not just ResMed anymore')}
      ${paragraph('<strong>BMC Luna 2 and RESmart G2 are now fully supported.</strong> Same analysis engines, same dashboard, same insights. If you\'re on an AirSense 10, AirSense 11, or AirCurve 10, nothing changes for you. But if you know someone on a BMC device who\'s been locked out of tools like this, send them our way.')}
      ${paragraph('Using a different device? Reply to this email or upload your data and we\'ll capture the file structure automatically. We want to make this accessible for every PAP user, not just ResMed and BMC. More devices are on the roadmap.')}

      ${subheading('New: IFL Symptom Risk')}
      ${paragraph('A single 0-100% score that answers: <strong>how much is flow limitation actually driving your symptoms?</strong> It combines FL Score, NED, Flatness Index, and Glasgow into one number. Based on research showing flow limitation causes fatigue independently of arousals. If you\'ve had a "normal" AHI for years and still feel terrible, this is the metric to watch.')}

      ${subheading('Community benchmarks')}
      ${paragraph('After you upload, you\'ll see where your IFL Risk, Glasgow, FL Score, and RERA Index fall compared to other AirwayLab users. Anonymised, no data contribution required. It\'s one thing to see a number. It\'s another to know what that number means relative to everyone else.')}

      ${ctaButton('Upload Your Latest Data', ANALYZE_URL)}

      ${subheading('Where this is going')}
      ${paragraph('Every night of data that users contribute is building something I\'ve wanted to exist for a long time: <strong>therapy algorithms that learn and adapt to individual breathing patterns.</strong> Not the static pressure responses in today\'s machines, but a system that improves based on what thousands of real nights reveal.')}
      ${paragraph('The analysis tool you use today is the data foundation for that. More devices, more users, more nights contributed means better algorithms for everyone. That\'s the long game.')}

      ${paragraph('If the free analysis has been useful, <a href="' + PRICING_URL + '" style="color:#5eead4;text-decoration:underline;">Supporter and Champion tiers</a> fund this work. You also get AI insights that explain your specific patterns, cloud backup, PDF clinician reports, and a voice in what gets built next.')}

      ${subheading('Join the premium community')}
      ${paragraph('Building and maintaining clinical-grade analysis software takes time, and to keep improving AirwayLab we need more supporters. As a way to say thank you and build something great together, we\'ve launched a <a href="' + DISCORD_URL + '" style="color:#5eead4;text-decoration:underline;">premium Discord community</a> for supporters to discuss anything PAP related, share what they\'re seeing in their data, and help shape the roadmap. Champions vote on what gets built next.')}

      ${paragraph('Or just reply to this email. I read everything and I want to know: <strong>what\'s the one thing that would make AirwayLab more useful for your therapy?</strong>')}

      ${paragraph('<span style="color:#a1a1aa;">-- Demian</span>')}

      ${smallText('P.S. New to AirwayLab or tried it once and got lost? There\'s now a <a href="' + GETTING_STARTED_URL + '" style="color:#5eead4;text-decoration:underline;">Getting Started guide</a> and a guided walkthrough that walks you through every tab. And you can see everything we\'ve shipped on the <a href="' + CHANGELOG_URL + '" style="color:#5eead4;text-decoration:underline;">changelog</a>.')}

      ${smallText('AirwayLab is not a medical device. Always discuss therapy changes with your clinician.')}
    `, unsubscribeUrl),
  }
}

// ── Template registry ────────────────────────────────────────

export interface BroadcastTemplate {
  id: string
  description: string
  getTemplate: (unsubscribeUrl: string, subjectVariant: BroadcastSubjectVariant) => { subject: string; html: string }
}

export const BROADCAST_TEMPLATES: Record<string, BroadcastTemplate> = {
  march_2026_update: {
    id: 'march_2026_update',
    description: 'March 2026 founder letter: IFL Risk, multi-device support, vision, Discord community',
    getTemplate: march2026Update,
  },
}
