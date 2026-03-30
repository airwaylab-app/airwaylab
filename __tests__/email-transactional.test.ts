import { describe, it, expect } from 'vitest';

// Mock the helpers module since transactional.ts imports from it
vi.mock('@/lib/email/helpers', async () => {
  const BASE_URL = 'https://airwaylab.app';

  return {
    BASE_URL,
    ctaButton: (text: string, href: string) =>
      `<div class="cta"><a href="${href}">${text}</a></div>`,
    paragraph: (text: string) => `<p>${text}</p>`,
    heading: (text: string) => `<h2>${text}</h2>`,
    bulletList: (items: string[]) =>
      `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`,
    emailShell: (content: string) =>
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>AirwayLab</title></head><body style="background-color:#0a0a0b;"><!-- Header --><div>AirwayLab</div>${content}</body></html>`,
  };
});

import { vi } from 'vitest';
import {
  welcomeEmail,
  cancellationEmail,
  discordLaunchEmail,
  contactConfirmationEmail,
} from '@/lib/email/transactional';

// ── Helpers ──────────────────────────────────────────────────

function assertValidHtml(html: string) {
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('<html lang="en">');
  expect(html).toContain('</html>');
  expect(html).toContain('</body>');
}

function assertHasHeader(html: string) {
  expect(html).toContain('AirwayLab');
}

function assertNoUnsubscribeLink(html: string) {
  // Transactional emails should NOT have marketing unsubscribe links
  expect(html).not.toContain('Unsubscribe from these emails');
  expect(html).not.toContain('opted in to email updates');
}

function assertHasAccountManagementFooter(html: string) {
  // Transactional emails link to account management instead
  expect(html).toContain('account');
}

// ── Welcome email tests ──────────────────────────────────────

describe('welcomeEmail', () => {
  describe('supporter tier', () => {
    it('returns subject and html', () => {
      const result = welcomeEmail('supporter', 'month');
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
    });

    it('renders valid HTML', () => {
      assertValidHtml(welcomeEmail('supporter', 'month').html);
    });

    it('includes AirwayLab header', () => {
      assertHasHeader(welcomeEmail('supporter', 'month').html);
    });

    it('does not include marketing unsubscribe link', () => {
      assertNoUnsubscribeLink(welcomeEmail('supporter', 'month').html);
    });

    it('mentions Supporter tier label', () => {
      const { html } = welcomeEmail('supporter', 'month');
      expect(html).toContain('Supporter');
    });

    it('includes supporter-specific benefits', () => {
      const { html } = welcomeEmail('supporter', 'month');
      expect(html).toContain('Unlimited AI insights');
      expect(html).toContain('Cloud sync');
      expect(html).toContain('Priority support');
    });

    it('does not include champion-only benefits', () => {
      const { html } = welcomeEmail('supporter', 'month');
      expect(html).not.toContain('Early access to new analysis engines');
      expect(html).not.toContain('Direct input on the roadmap');
    });

    it('includes CTA to upload and try AI insights', () => {
      const { html } = welcomeEmail('supporter', 'month');
      expect(html).toContain('Upload and Try AI Insights');
      expect(html).toContain('/analyze');
    });

    it('includes contact link', () => {
      const { html } = welcomeEmail('supporter', 'month');
      expect(html).toContain('/contact');
    });

    it('has account management footer', () => {
      assertHasAccountManagementFooter(welcomeEmail('supporter', 'month').html);
    });
  });

  describe('champion tier', () => {
    it('mentions Champion tier label', () => {
      const { html } = welcomeEmail('champion', 'month');
      expect(html).toContain('Champion');
    });

    it('includes champion-specific benefits', () => {
      const { html } = welcomeEmail('champion', 'month');
      expect(html).toContain('Everything in Supporter');
      expect(html).toContain('Early access to new analysis engines');
      expect(html).toContain('Name on the supporters page');
      expect(html).toContain('Direct input on the roadmap');
    });
  });

  it('subject line is consistent across tiers', () => {
    const supporter = welcomeEmail('supporter', 'month');
    const champion = welcomeEmail('champion', 'month');
    expect(supporter.subject).toBe(champion.subject);
  });

  it('includes UTM tracking in CTA links', () => {
    const { html } = welcomeEmail('supporter', 'month');
    expect(html).toContain('utm_source=email');
    expect(html).toContain('utm_medium=transactional');
    expect(html).toContain('utm_campaign=welcome');
  });
});

// ── Cancellation email tests ─────────────────────────────────

describe('cancellationEmail', () => {
  it('returns subject and html', () => {
    const result = cancellationEmail('March 31, 2026');
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
  });

  it('renders valid HTML', () => {
    assertValidHtml(cancellationEmail('March 31, 2026').html);
  });

  it('includes AirwayLab header', () => {
    assertHasHeader(cancellationEmail('March 31, 2026').html);
  });

  it('does not include marketing unsubscribe link', () => {
    assertNoUnsubscribeLink(cancellationEmail('March 31, 2026').html);
  });

  it('mentions subscription cancellation in subject', () => {
    const { subject } = cancellationEmail('March 31, 2026');
    expect(subject).toContain('cancelled');
  });

  describe('with period end date', () => {
    it('includes the access end date', () => {
      const { html } = cancellationEmail('March 31, 2026');
      expect(html).toContain('March 31, 2026');
      expect(html).toContain('keep premium access until');
    });
  });

  describe('without period end date (null)', () => {
    it('says premium features are deactivated immediately', () => {
      const { html } = cancellationEmail(null);
      expect(html).toContain('premium features have been deactivated');
      expect(html).toContain('Community tier');
    });
  });

  it('reassures that free features remain available', () => {
    const { html } = cancellationEmail('March 31, 2026');
    expect(html).toContain('analysis engines');
    expect(html).toContain('free');
  });

  it('includes CTA to view plans for resubscription', () => {
    const { html } = cancellationEmail(null);
    expect(html).toContain('View plans');
    expect(html).toContain('/pricing');
  });

  it('includes feedback prompt', () => {
    const { html } = cancellationEmail(null);
    expect(html).toContain('why you cancelled');
    expect(html).toContain('/contact');
  });

  it('includes UTM tracking in CTA links', () => {
    const { html } = cancellationEmail(null);
    expect(html).toContain('utm_campaign=cancellation');
  });
});

// ── Discord launch email tests ───────────────────────────────

describe('discordLaunchEmail', () => {
  describe('supporter tier', () => {
    it('returns subject and html', () => {
      const result = discordLaunchEmail('supporter');
      expect(result.subject).toBeTruthy();
      expect(result.html).toBeTruthy();
    });

    it('renders valid HTML', () => {
      assertValidHtml(discordLaunchEmail('supporter').html);
    });

    it('mentions Supporter tier', () => {
      const { html } = discordLaunchEmail('supporter');
      expect(html).toContain('Supporter');
    });

    it('includes supporter-specific Discord benefits', () => {
      const { html } = discordLaunchEmail('supporter');
      expect(html).toContain('Community channels');
      expect(html).toContain('Connect with other PAP users');
    });

    it('does not include champion-only Discord benefits', () => {
      const { html } = discordLaunchEmail('supporter');
      expect(html).not.toContain('Champion channels');
      expect(html).not.toContain('Roadmap voting');
    });
  });

  describe('champion tier', () => {
    it('mentions Champion tier', () => {
      const { html } = discordLaunchEmail('champion');
      expect(html).toContain('Champion');
    });

    it('includes champion-specific Discord benefits', () => {
      const { html } = discordLaunchEmail('champion');
      expect(html).toContain('Champion channels');
      expect(html).toContain('Roadmap voting');
    });
  });

  it('includes CTA to connect Discord', () => {
    const { html } = discordLaunchEmail('supporter');
    expect(html).toContain('Connect Discord');
    expect(html).toContain('connect=discord');
  });

  it('includes UTM tracking', () => {
    const { html } = discordLaunchEmail('supporter');
    expect(html).toContain('utm_campaign=discord_launch');
  });

  it('does not include marketing unsubscribe link', () => {
    assertNoUnsubscribeLink(discordLaunchEmail('supporter').html);
  });

  it('has account management footer', () => {
    assertHasAccountManagementFooter(discordLaunchEmail('supporter').html);
  });
});

// ── Contact confirmation email tests ─────────────────────────

describe('contactConfirmationEmail', () => {
  it('returns subject and html', () => {
    const result = contactConfirmationEmail('John', 'general');
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
  });

  it('renders valid HTML', () => {
    assertValidHtml(contactConfirmationEmail('Jane', 'billing').html);
  });

  it('includes AirwayLab header', () => {
    assertHasHeader(contactConfirmationEmail('Alice', 'privacy').html);
  });

  describe('greeting personalization', () => {
    it('uses name when provided', () => {
      const { html } = contactConfirmationEmail('Bob', 'general');
      expect(html).toContain('Hi Bob,');
    });

    it('uses generic greeting when name is null', () => {
      const { html } = contactConfirmationEmail(null, 'general');
      expect(html).toContain('Hi,');
      expect(html).not.toContain('Hi null');
    });
  });

  describe('category labels', () => {
    const categories = [
      { key: 'general', label: 'general' },
      { key: 'privacy', label: 'privacy & data' },
      { key: 'billing', label: 'billing' },
      { key: 'accessibility', label: 'accessibility' },
      { key: 'security', label: 'security' },
    ];

    for (const { key, label } of categories) {
      it(`maps '${key}' category to '${label}' label`, () => {
        const { html } = contactConfirmationEmail('Test', key);
        expect(html.toLowerCase()).toContain(label);
      });
    }

    it('falls back to General for unknown category', () => {
      const { html } = contactConfirmationEmail('Test', 'unknown_category');
      expect(html.toLowerCase()).toContain('general');
    });
  });

  it('includes dev@airwaylab.app for urgent contact', () => {
    const { html } = contactConfirmationEmail('Test', 'general');
    expect(html).toContain('dev@airwaylab.app');
  });

  it('mentions response timeframe', () => {
    const { html } = contactConfirmationEmail('Test', 'general');
    expect(html).toContain('few days');
  });

  it('tells user no action needed', () => {
    const { html } = contactConfirmationEmail('Test', 'general');
    expect(html).toContain('No action needed');
  });

  it('does not include marketing unsubscribe link', () => {
    assertNoUnsubscribeLink(contactConfirmationEmail('Test', 'general').html);
  });

  it('has contact form footer reference', () => {
    const { html } = contactConfirmationEmail('Test', 'general');
    expect(html).toContain('airwaylab.app/contact');
  });

  it('subject mentions message received', () => {
    const { subject } = contactConfirmationEmail('Test', 'general');
    expect(subject.toLowerCase()).toContain('received');
  });
});

// ── Cross-cutting concerns ───────────────────────────────────

describe('transactional emails — cross-cutting', () => {
  it('no transactional email contains marketing unsubscribe language', () => {
    const allEmails = [
      welcomeEmail('supporter', 'month'),
      welcomeEmail('champion', 'year'),
      cancellationEmail('March 31, 2026'),
      cancellationEmail(null),
      discordLaunchEmail('supporter'),
      discordLaunchEmail('champion'),
      contactConfirmationEmail('Test', 'general'),
      contactConfirmationEmail(null, 'privacy'),
    ];

    for (const { html } of allEmails) {
      expect(html).not.toContain('opted in to email updates');
    }
  });

  it('all transactional emails reference airwaylab.app', () => {
    const allEmails = [
      welcomeEmail('supporter', 'month'),
      cancellationEmail(null),
      discordLaunchEmail('supporter'),
      contactConfirmationEmail('Test', 'general'),
    ];

    for (const { html } of allEmails) {
      expect(html).toContain('airwaylab.app');
    }
  });
});
