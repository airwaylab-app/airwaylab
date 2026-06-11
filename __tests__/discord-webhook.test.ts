/**
 * Tests for lib/discord-webhook.ts
 *
 * Coverage focus:
 *  - sendAlert: fail-open guarantee (never throws), missing URL → false,
 *    HTTP error → false, success → true, Sentry NOT called on fetch failure
 *  - formatMonitorEmbed: color/title logic (critical > warning > ok)
 *  - formatRevenueEmbed: title and color per event type
 *  - sendOpsAlert: delegates to sendAlert('ops', ...)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import {
  sendAlert,
  sendOpsAlert,
  formatMonitorEmbed,
  formatRevenueEmbed,
  maskEmail,
  routeAlert,
  _budget,
  COLORS,
  type AlertType,
} from '@/lib/discord-webhook';
import * as Sentry from '@sentry/nextjs';

// ── Helpers ───────────────────────────────────────────────────────────────

function mockFetch(ok: boolean, status = ok ? 200 : 429) {
  return vi.fn().mockResolvedValue({ ok, status } as Response);
}

const WEBHOOK_URL = 'https://discord.com/api/webhooks/test/token';

// ── sendAlert ─────────────────────────────────────────────────────────────

describe('sendAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISCORD_OPS_WEBHOOK_URL;
    delete process.env.DISCORD_REVENUE_WEBHOOK_URL;
    delete process.env.DISCORD_USER_SIGNALS_WEBHOOK_URL;
    delete process.env.DISCORD_GROWTH_WEBHOOK_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false immediately when webhook URL is not configured', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await sendAlert('ops', 'test message');
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns true on successful HTTP response', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await sendAlert('ops', 'hello');
    expect(result).toBe(true);
  });

  it('returns false on non-ok HTTP response without throwing', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(false, 429));
    const result = await sendAlert('ops', 'hello');
    expect(result).toBe(false);
  });

  it('returns false and does not throw when fetch rejects', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    await expect(sendAlert('ops', 'hello')).resolves.toBe(false);
  });

  it('does not forward errors to Sentry when fetch throws (fail-open, console.error only)', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    const err = new Error('timeout');
    vi.spyOn(global, 'fetch').mockRejectedValue(err);
    await sendAlert('ops', 'hello');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('POSTs JSON body with content field', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await sendAlert('ops', 'test content');
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(WEBHOOK_URL);
    expect(init?.method).toBe('POST');
    const body = JSON.parse(init?.body as string);
    expect(body.content).toBe('test content');
  });

  it('routes each channel to the correct env var', async () => {
    const channels = ['ops', 'revenue', 'user-signals', 'growth'] as const;
    const envKeys = [
      'DISCORD_OPS_WEBHOOK_URL',
      'DISCORD_REVENUE_WEBHOOK_URL',
      'DISCORD_USER_SIGNALS_WEBHOOK_URL',
      'DISCORD_GROWTH_WEBHOOK_URL',
    ];
    for (let i = 0; i < channels.length; i++) {
      process.env[envKeys[i]!] = `https://discord.com/webhooks/${channels[i]}`;
    }
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));

    for (let i = 0; i < channels.length; i++) {
      fetchSpy.mockClear();
      await sendAlert(channels[i]!, 'msg');
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://discord.com/webhooks/${channels[i]}`,
        expect.anything()
      );
    }
  });

  it('includes embeds in the request body when provided', async () => {
    process.env.DISCORD_REVENUE_WEBHOOK_URL = WEBHOOK_URL;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const embed = { title: 'Test', color: COLORS.green };
    await sendAlert('revenue', '', [embed]);
    const body = JSON.parse(fetchSpy.mock.calls[0]![1]?.body as string);
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe('Test');
  });

  it('omits empty content key from request body', async () => {
    process.env.DISCORD_GROWTH_WEBHOOK_URL = WEBHOOK_URL;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await sendAlert('growth', '', [{ title: 'embed only' }]);
    const body = JSON.parse(fetchSpy.mock.calls[0]![1]?.body as string);
    expect(body.content).toBeUndefined();
  });
});

// ── sendOpsAlert ──────────────────────────────────────────────────────────

describe('sendOpsAlert', () => {
  afterEach(() => vi.restoreAllMocks());

  it('delegates to sendAlert with ops channel', async () => {
    delete process.env.DISCORD_OPS_WEBHOOK_URL;
    // No URL configured → sendAlert returns false without hitting fetch
    const result = await sendOpsAlert('test');
    expect(result).toBe(false);
  });

  it('returns true when ops webhook is configured and fetch succeeds', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await sendOpsAlert('ops alert');
    expect(result).toBe(true);
    delete process.env.DISCORD_OPS_WEBHOOK_URL;
    vi.restoreAllMocks();
  });
});

// ── formatMonitorEmbed ────────────────────────────────────────────────────

describe('formatMonitorEmbed', () => {
  const okCheck = { service: 'DB', status: 'ok', usage_pct: 10, current: '10', limit: '100' };
  const warnCheck = { service: 'Storage', status: 'warning', usage_pct: 80, current: '80', limit: '100' };
  const critCheck = { service: 'API', status: 'critical', usage_pct: 99, current: '99', limit: '100' };

  it('uses COLORS.green when all checks are ok', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.color).toBe(COLORS.green);
  });

  it('uses COLORS.amber when there are warnings but no critical', () => {
    const embed = formatMonitorEmbed([okCheck, warnCheck]);
    expect(embed.color).toBe(COLORS.amber);
  });

  it('uses COLORS.red when any check is critical', () => {
    const embed = formatMonitorEmbed([okCheck, warnCheck, critCheck]);
    expect(embed.color).toBe(COLORS.red);
  });

  it('uses COLORS.red for critical even without warnings', () => {
    const embed = formatMonitorEmbed([critCheck]);
    expect(embed.color).toBe(COLORS.red);
  });

  it('title contains "All Systems OK" when all ok', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.title).toContain('All Systems OK');
  });

  it('title contains "Warning" when warning but no critical', () => {
    const embed = formatMonitorEmbed([warnCheck]);
    expect(embed.title).toContain('Warning');
    expect(embed.title).not.toContain('Critical');
  });

  it('title contains "Critical" when any check is critical', () => {
    const embed = formatMonitorEmbed([critCheck]);
    expect(embed.title).toContain('Critical');
  });

  it('footer text is "Daily monitor cron"', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.footer?.text).toBe('Daily monitor cron');
  });

  it('creates one field per check with inline: true', () => {
    const embed = formatMonitorEmbed([okCheck, warnCheck]);
    expect(embed.fields).toHaveLength(2);
    for (const field of embed.fields!) {
      expect(field.inline).toBe(true);
    }
  });

  it('uses service name as field name', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.fields![0]!.name).toBe('DB');
  });

  it('includes error message in field value when check has error', () => {
    const errCheck = { ...okCheck, status: 'critical', error: 'connection refused' };
    const embed = formatMonitorEmbed([errCheck]);
    expect(embed.fields![0]!.value).toContain('connection refused');
  });

  it('formats current/limit/pct in field value when no error', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.fields![0]!.value).toContain('10 / 100');
    expect(embed.fields![0]!.value).toContain('10%');
  });

  it('omits usage percentage when usage_pct is null', () => {
    const check = { service: 'X', status: 'ok', usage_pct: null, current: '5', limit: '10' };
    const embed = formatMonitorEmbed([check]);
    expect(embed.fields![0]!.value).not.toContain('%');
  });

  it('includes a timestamp', () => {
    const embed = formatMonitorEmbed([okCheck]);
    expect(embed.timestamp).toBeDefined();
    expect(() => new Date(embed.timestamp!)).not.toThrow();
  });
});

// ── formatRevenueEmbed ────────────────────────────────────────────────────

describe('formatRevenueEmbed', () => {
  it('uses green color for new_subscription', () => {
    const embed = formatRevenueEmbed({ event: 'new_subscription' });
    expect(embed.color).toBe(COLORS.green);
  });

  it('uses blue color for tier_change', () => {
    const embed = formatRevenueEmbed({ event: 'tier_change' });
    expect(embed.color).toBe(COLORS.blue);
  });

  it('uses amber color for cancellation', () => {
    const embed = formatRevenueEmbed({ event: 'cancellation' });
    expect(embed.color).toBe(COLORS.amber);
  });

  it('uses red color for payment_failed', () => {
    const embed = formatRevenueEmbed({ event: 'payment_failed' });
    expect(embed.color).toBe(COLORS.red);
  });

  it('title contains "New Subscription" for new_subscription', () => {
    const embed = formatRevenueEmbed({ event: 'new_subscription' });
    expect(embed.title).toContain('New Subscription');
  });

  it('includes MRR field formatted as dollars', () => {
    const embed = formatRevenueEmbed({ event: 'new_subscription', mrrCents: 1299 });
    const mrrField = embed.fields?.find((f) => f.name === 'MRR');
    expect(mrrField?.value).toBe('$12.99');
  });

  it('includes Tier field when provided', () => {
    const embed = formatRevenueEmbed({ event: 'tier_change', tier: 'supporter' });
    const tierField = embed.fields?.find((f) => f.name === 'Tier');
    expect(tierField?.value).toBe('supporter');
  });

  it('footer text is "Stripe"', () => {
    const embed = formatRevenueEmbed({ event: 'cancellation' });
    expect(embed.footer?.text).toBe('Stripe');
  });

  it('uses green color and a recovered title for payment_recovered', () => {
    const embed = formatRevenueEmbed({ event: 'payment_recovered', tier: 'supporter' });
    expect(embed.color).toBe(COLORS.green);
    expect(embed.title).toContain('Payment Recovered');
  });

  it('renders From → To for a real tier change, not a bare Tier', () => {
    const embed = formatRevenueEmbed({ event: 'tier_change', fromTier: 'supporter', tier: 'champion' });
    const field = (name: string) => embed.fields?.find((f) => f.name === name);
    expect(field('From')?.value).toBe('supporter');
    expect(field('To')?.value).toBe('champion');
    expect(field('Tier')).toBeUndefined();
  });

  it('falls back to a single Tier field when fromTier equals the new tier', () => {
    const embed = formatRevenueEmbed({ event: 'tier_change', fromTier: 'supporter', tier: 'supporter' });
    const field = (name: string) => embed.fields?.find((f) => f.name === name);
    expect(field('Tier')?.value).toBe('supporter');
    expect(field('From')).toBeUndefined();
  });
});

// ── formatRevenueEmbed: legible cancellation (Round 1) ─────────────────────

describe('formatRevenueEmbed cancellation', () => {
  const RAW_EMAIL = 'd.voorhagen@gmail.com';

  function cancel(overrides = {}) {
    return formatRevenueEmbed({
      event: 'cancellation',
      churnedFrom: 'supporter',
      landingTier: 'community',
      interval: 'month',
      mrrCents: 900,
      reason: 'cancellation_requested',
      feedback: 'too_complex',
      source: 'portal',
      email: RAW_EMAIL,
      ...overrides,
    });
  }

  const field = (embed: ReturnType<typeof formatRevenueEmbed>, name: string) =>
    embed.fields?.find((f) => f.name === name);

  it('shows the tier churned FROM, not the landing tier', () => {
    const embed = cancel();
    expect(field(embed, 'Churned from')?.value).toBe('supporter');
    expect(field(embed, 'Now on')?.value).toBe('community');
    // never renders a bare "Tier: community" that hides what was lost
    expect(field(embed, 'Tier')).toBeUndefined();
  });

  it('shows MRR lost, reason, feedback and source', () => {
    const embed = cancel();
    expect(field(embed, 'MRR lost')?.value).toBe('$9.00');
    expect(field(embed, 'Reason')?.value).toBe('cancellation_requested');
    expect(field(embed, 'Feedback')?.value).toBe('too_complex');
    expect(field(embed, 'Source')?.value).toBe('portal');
  });

  it('NEVER renders a raw email — masking is enforced inside the formatter', () => {
    const embed = cancel();
    const emailValue = field(embed, 'Email')?.value ?? '';
    expect(emailValue).toContain('***');
    expect(JSON.stringify(embed)).not.toContain(RAW_EMAIL);
    expect(JSON.stringify(embed)).not.toContain('voorhagen');
  });

  it('uses a distinct title for account-deletion churn and omits email', () => {
    const embed = cancel({ source: 'account_deletion', email: undefined });
    expect(embed.title).toContain('account deleted');
    expect(field(embed, 'Source')?.value).toBe('account_deletion');
    expect(field(embed, 'Email')).toBeUndefined();
  });

  it('a normal portal cancel keeps the plain Cancellation title', () => {
    expect(cancel().title).toBe(':wave: Cancellation');
  });
});

// ── maskEmail ──────────────────────────────────────────────────────────────

describe('maskEmail', () => {
  it('masks local part and domain label, keeps the TLD', () => {
    expect(maskEmail('d.voorhagen@gmail.com')).toBe('d.***@gm***.com');
  });

  it('returns *** for an input without an @', () => {
    expect(maskEmail('not-an-email')).toBe('***');
  });

  it('never returns the original address', () => {
    const raw = 'alice.smith@hospital.co.uk';
    expect(maskEmail(raw)).not.toBe(raw);
    expect(maskEmail(raw)).toContain('***');
  });
});

// ── routeAlert ────────────────────────────────────────────────────────────

describe('routeAlert', () => {
  const NEW_WEBHOOK = 'https://discord.com/api/webhooks/new/token';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all new channel env vars
    delete process.env.DISCORD_WEBHOOK_CRITICAL;
    delete process.env.DISCORD_WEBHOOK_STRATEGY_DIGEST;
    delete process.env.DISCORD_WEBHOOK_USER_SUPPORT;
    delete process.env.DISCORD_WEBHOOK_PLATFORM_HEALTH;
    delete process.env.DISCORD_WEBHOOK_AUDIT_LOG;
    delete process.env.DISCORD_WEBHOOK_URL;
    // Reset budget counter
    _budget.date = '';
    _budget.count = 0;
  });

  afterEach(() => vi.restoreAllMocks());

  // ── Suppressed types — core requirement: DB write caller-side, no Discord call ──

  const suppressedTypes: AlertType[] = [
    'vercel_deploy_success',
    'ci_failure_feature_branch',
    'unsupported_device_unknown',
  ];

  for (const alertType of suppressedTypes) {
    it(`suppressed type '${alertType}' returns false and never calls fetch`, async () => {
      process.env.DISCORD_WEBHOOK_URL = NEW_WEBHOOK; // fallback configured
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
      const result = await routeAlert(alertType, 'should not send');
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  }

  // ── Weekly-digest types — no live Discord push ────────────────────────────

  const weeklyDigestTypes: AlertType[] = [
    'unsupported_device_known',
    'credential_expiry_routine',
  ];

  for (const alertType of weeklyDigestTypes) {
    it(`weekly-digest type '${alertType}' returns false and never calls fetch`, async () => {
      process.env.DISCORD_WEBHOOK_STRATEGY_DIGEST = NEW_WEBHOOK;
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
      const result = await routeAlert(alertType, 'accumulate only');
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  }

  // ── Channel routing ───────────────────────────────────────────────────────

  it('routes stripe_payment_failed to DISCORD_WEBHOOK_CRITICAL', async () => {
    process.env.DISCORD_WEBHOOK_CRITICAL = NEW_WEBHOOK;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await routeAlert('stripe_payment_failed', 'payment failed');
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(NEW_WEBHOOK, expect.anything());
  });

  it('routes subscription_created to DISCORD_WEBHOOK_STRATEGY_DIGEST', async () => {
    process.env.DISCORD_WEBHOOK_STRATEGY_DIGEST = NEW_WEBHOOK;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await routeAlert('subscription_created', 'new sub');
    expect(fetchSpy).toHaveBeenCalledWith(NEW_WEBHOOK, expect.anything());
  });

  it('routes bug_feedback to DISCORD_WEBHOOK_USER_SUPPORT', async () => {
    process.env.DISCORD_WEBHOOK_USER_SUPPORT = NEW_WEBHOOK;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await routeAlert('bug_feedback', 'bug report');
    expect(fetchSpy).toHaveBeenCalledWith(NEW_WEBHOOK, expect.anything());
  });

  it('routes sentry_spike to DISCORD_WEBHOOK_PLATFORM_HEALTH', async () => {
    process.env.DISCORD_WEBHOOK_PLATFORM_HEALTH = NEW_WEBHOOK;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await routeAlert('sentry_spike', 'spike');
    expect(fetchSpy).toHaveBeenCalledWith(NEW_WEBHOOK, expect.anything());
  });

  it('routes account_deletion to DISCORD_WEBHOOK_AUDIT_LOG', async () => {
    process.env.DISCORD_WEBHOOK_AUDIT_LOG = NEW_WEBHOOK;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    await routeAlert('account_deletion', 'deletion');
    expect(fetchSpy).toHaveBeenCalledWith(NEW_WEBHOOK, expect.anything());
  });

  // ── Fallback to DISCORD_WEBHOOK_URL ───────────────────────────────────────

  it('falls back to DISCORD_WEBHOOK_URL when specific channel env var is missing', async () => {
    const fallbackUrl = 'https://discord.com/api/webhooks/fallback/token';
    process.env.DISCORD_WEBHOOK_URL = fallbackUrl;
    // DISCORD_WEBHOOK_CRITICAL intentionally not set
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await routeAlert('security_incident', 'incident');
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(fallbackUrl, expect.anything());
  });

  it('returns false when neither channel nor fallback env var is configured', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const result = await routeAlert('deploy_to_prod', 'deployed');
    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Budget counter ────────────────────────────────────────────────────────

  it('emits console.error when combined #critical + #strategy-digest budget exceeds 10/day', async () => {
    process.env.DISCORD_WEBHOOK_CRITICAL = NEW_WEBHOOK;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Force a specific date so budget resets predictably
    _budget.date = new Date().toISOString().slice(0, 10);
    _budget.count = 10; // already at limit

    await routeAlert('stripe_payment_failed', 'one more');

    const budgetError = errorSpy.mock.calls.find((args) =>
      String(args[0]).includes('daily budget exceeded')
    );
    expect(budgetError).toBeDefined();
  });

  it('does NOT log budget error when count is at or below the limit', async () => {
    process.env.DISCORD_WEBHOOK_CRITICAL = NEW_WEBHOOK;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    _budget.date = new Date().toISOString().slice(0, 10);
    _budget.count = 9; // exactly at limit, not over

    await routeAlert('stripe_payment_failed', 'tenth message');

    const budgetError = errorSpy.mock.calls.find((args) =>
      String(args[0]).includes('daily budget exceeded')
    );
    expect(budgetError).toBeUndefined();
  });

  it('budget counter resets on a new calendar day', async () => {
    process.env.DISCORD_WEBHOOK_STRATEGY_DIGEST = NEW_WEBHOOK;
    vi.spyOn(global, 'fetch').mockImplementation(mockFetch(true));

    // Simulate yesterday's exhausted budget
    _budget.date = '2000-01-01';
    _budget.count = 999;

    await routeAlert('subscription_created', 'new sub');

    // Count should now be 1 (reset to 0, then incremented)
    expect(_budget.count).toBe(1);
  });

  // ── Fail-open guarantee ───────────────────────────────────────────────────

  it('returns false and does not throw when fetch rejects for a routed type', async () => {
    process.env.DISCORD_WEBHOOK_CRITICAL = NEW_WEBHOOK;
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    await expect(routeAlert('credential_expiry_critical', 'expiring')).resolves.toBe(false);
  });
});
