import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock Sentry ──────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import {
  sendAlert,
  sendOpsAlert,
  formatMonitorEmbed,
  formatRevenueEmbed,
  formatUserSignalEmbed,
  formatEmailAlertEmbed,
  formatBroadcastEmbed,
  formatGrowthEmbed,
  COLORS,
  type AlertChannel,
} from '@/lib/discord-webhook';

// ── Setup ────────────────────────────────────────────────────

const MOCK_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/token';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  // Set all channel webhook env vars
  process.env.DISCORD_OPS_WEBHOOK_URL = MOCK_WEBHOOK_URL;
  process.env.DISCORD_REVENUE_WEBHOOK_URL = MOCK_WEBHOOK_URL;
  process.env.DISCORD_USER_SIGNALS_WEBHOOK_URL = MOCK_WEBHOOK_URL;
  process.env.DISCORD_GROWTH_WEBHOOK_URL = MOCK_WEBHOOK_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DISCORD_OPS_WEBHOOK_URL;
  delete process.env.DISCORD_REVENUE_WEBHOOK_URL;
  delete process.env.DISCORD_USER_SIGNALS_WEBHOOK_URL;
  delete process.env.DISCORD_GROWTH_WEBHOOK_URL;
});

// ── Tests: sendAlert ─────────────────────────────────────────

describe('sendAlert', () => {
  it('sends POST request with content to the correct webhook URL', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const result = await sendAlert('ops', 'Test message');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      MOCK_WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body.content).toBe('Test message');
  });

  it('includes embeds in request body when provided', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const embed = { title: 'Test', color: COLORS.green };
    await sendAlert('ops', '', [embed]);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body.embeds).toEqual([embed]);
  });

  it('does not include content key when content is empty string', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    await sendAlert('ops', '', [{ title: 'Test' }]);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body.content).toBeUndefined();
  });

  it('returns false when webhook URL is not configured', async () => {
    delete process.env.DISCORD_OPS_WEBHOOK_URL;

    const result = await sendAlert('ops', 'Test');
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('routes to correct channel env var', async () => {
    const channels: AlertChannel[] = ['ops', 'revenue', 'user-signals', 'growth'];

    for (const channel of channels) {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
      const result = await sendAlert(channel, `Test ${channel}`);
      expect(result).toBe(true);
    }

    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('returns false on non-ok response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 429 });

    const result = await sendAlert('ops', 'Test');
    expect(result).toBe(false);
  });

  it('returns false and reports to Sentry on fetch error', async () => {
    const error = new Error('Network failure');
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
    const Sentry = await import('@sentry/nextjs');

    const result = await sendAlert('ops', 'Test');
    expect(result).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { action: 'discord-webhook', channel: 'ops' },
      }),
    );
  });

  it('uses a 10-second timeout signal', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    await sendAlert('ops', 'Test');

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(fetchCall[1].signal).toBeDefined();
  });
});

// ── Tests: sendOpsAlert ──────────────────────────────────────

describe('sendOpsAlert', () => {
  it('delegates to sendAlert with ops channel', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const result = await sendOpsAlert('Ops test');
    expect(result).toBe(true);
  });

  it('passes embeds through to sendAlert', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const embed = { title: 'Ops embed' };
    await sendOpsAlert('', [embed]);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body);
    expect(body.embeds).toEqual([embed]);
  });
});

// ── Tests: formatMonitorEmbed ────────────────────────────────

describe('formatMonitorEmbed', () => {
  it('returns green embed when all checks are ok', () => {
    const checks = [
      { service: 'Supabase', status: 'ok', usage_pct: 50, current: '4 GB', limit: '8 GB' },
      { service: 'Vercel', status: 'ok', usage_pct: 10, current: '100 GB', limit: '1 TB' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.color).toBe(COLORS.green);
    expect(embed.title).toContain('All Systems OK');
    expect(embed.fields).toHaveLength(2);
    expect(embed.footer?.text).toBe('Daily monitor cron');
    expect(embed.timestamp).toBeDefined();
  });

  it('returns amber embed when any check has warning status', () => {
    const checks = [
      { service: 'Supabase', status: 'warning', usage_pct: 85, current: '6.8 GB', limit: '8 GB' },
      { service: 'Vercel', status: 'ok', usage_pct: 10, current: '100 GB', limit: '1 TB' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.color).toBe(COLORS.amber);
    expect(embed.title).toContain('Usage Warning');
  });

  it('returns red embed when any check has critical status', () => {
    const checks = [
      { service: 'Supabase', status: 'critical', usage_pct: 95, current: '7.6 GB', limit: '8 GB' },
      { service: 'Vercel', status: 'ok', usage_pct: 10, current: '100 GB', limit: '1 TB' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.color).toBe(COLORS.red);
    expect(embed.title).toContain('Critical Usage Alert');
  });

  it('critical takes precedence over warning in title', () => {
    const checks = [
      { service: 'Supabase', status: 'critical', usage_pct: 95, current: '7.6 GB', limit: '8 GB' },
      { service: 'Vercel', status: 'warning', usage_pct: 85, current: '850 GB', limit: '1 TB' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.color).toBe(COLORS.red);
    expect(embed.title).toContain('Critical');
  });

  it('includes usage percentage in field value', () => {
    const checks = [
      { service: 'Supabase', status: 'ok', usage_pct: 50, current: '4 GB', limit: '8 GB' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.fields![0]!.value).toContain('50%');
  });

  it('handles null usage_pct without percentage', () => {
    const checks = [
      { service: 'Resend', status: 'ok', usage_pct: null, current: '100', limit: '50000' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.fields![0]!.value).not.toContain('%');
  });

  it('shows error message instead of usage when error is present', () => {
    const checks = [
      { service: 'Vercel', status: 'unavailable', usage_pct: null, current: '', limit: '', error: 'API timeout' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.fields![0]!.value).toContain('API timeout');
  });

  it('sets all fields as inline', () => {
    const checks = [
      { service: 'A', status: 'ok', usage_pct: 10, current: '1', limit: '10' },
      { service: 'B', status: 'ok', usage_pct: 20, current: '2', limit: '10' },
    ];

    const embed = formatMonitorEmbed(checks);
    expect(embed.fields!.every(f => f.inline === true)).toBe(true);
  });
});

// ── Tests: formatRevenueEmbed ────────────────────────────────

describe('formatRevenueEmbed', () => {
  it('formats new subscription with green color', () => {
    const embed = formatRevenueEmbed({
      event: 'new_subscription',
      tier: 'Supporter',
      interval: 'monthly',
      mrrCents: 900,
      email: 'user@example.com',
    });

    expect(embed.title).toContain('New Subscription');
    expect(embed.color).toBe(COLORS.green);
    expect(embed.fields!.find(f => f.name === 'Tier')?.value).toBe('Supporter');
    expect(embed.fields!.find(f => f.name === 'MRR')?.value).toBe('$9.00');
    expect(embed.fields!.find(f => f.name === 'Email')?.value).toBe('user@example.com');
    expect(embed.footer?.text).toBe('Stripe');
  });

  it('formats cancellation with amber color', () => {
    const embed = formatRevenueEmbed({ event: 'cancellation', tier: 'Champion' });
    expect(embed.title).toContain('Cancellation');
    expect(embed.color).toBe(COLORS.amber);
  });

  it('formats payment_failed with red color', () => {
    const embed = formatRevenueEmbed({ event: 'payment_failed' });
    expect(embed.title).toContain('Payment Failed');
    expect(embed.color).toBe(COLORS.red);
  });

  it('formats tier_change with blue color', () => {
    const embed = formatRevenueEmbed({ event: 'tier_change' });
    expect(embed.color).toBe(COLORS.blue);
  });

  it('omits optional fields when not provided', () => {
    const embed = formatRevenueEmbed({ event: 'new_subscription' });
    expect(embed.fields!.length).toBe(0);
  });

  it('formats MRR cents to dollars correctly', () => {
    const embed = formatRevenueEmbed({ event: 'new_subscription', mrrCents: 2500 });
    expect(embed.fields!.find(f => f.name === 'MRR')?.value).toBe('$25.00');
  });
});

// ── Tests: formatUserSignalEmbed ─────────────────────────────

describe('formatUserSignalEmbed', () => {
  it('formats feedback type with blue color', () => {
    const embed = formatUserSignalEmbed({
      type: 'feedback',
      category: 'Feature request',
      message: 'Add BiPAP support',
      email: 'user@test.com',
    });

    expect(embed.title).toContain('User Feedback');
    expect(embed.color).toBe(COLORS.blue);
    expect(embed.description).toBe('Add BiPAP support');
    expect(embed.fields!.find(f => f.name === 'Category')?.value).toBe('Feature request');
    expect(embed.footer?.text).toBe('airwaylab.app');
  });

  it('formats contact type with teal color', () => {
    const embed = formatUserSignalEmbed({ type: 'contact' });
    expect(embed.title).toContain('Contact Form');
    expect(embed.color).toBe(COLORS.teal);
  });

  it('formats provider_interest with purple color', () => {
    const embed = formatUserSignalEmbed({ type: 'provider_interest' });
    expect(embed.color).toBe(COLORS.purple);
  });

  it('formats account_deletion with amber color', () => {
    const embed = formatUserSignalEmbed({ type: 'account_deletion' });
    expect(embed.title).toContain('Account Deletion');
    expect(embed.color).toBe(COLORS.amber);
  });

  it('formats unsupported_device with amber color', () => {
    const embed = formatUserSignalEmbed({ type: 'unsupported_device' });
    expect(embed.title).toContain('Unsupported Device');
    expect(embed.color).toBe(COLORS.amber);
  });

  it('truncates message to 500 characters', () => {
    const longMessage = 'x'.repeat(600);
    const embed = formatUserSignalEmbed({ type: 'feedback', message: longMessage });
    expect(embed.description!.length).toBe(500);
  });

  it('omits description when message is not provided', () => {
    const embed = formatUserSignalEmbed({ type: 'feedback' });
    expect(embed.description).toBeUndefined();
  });

  it('includes name field when provided', () => {
    const embed = formatUserSignalEmbed({ type: 'contact', name: 'Dr. Smith' });
    expect(embed.fields!.find(f => f.name === 'Name')?.value).toBe('Dr. Smith');
  });
});

// ── Tests: formatEmailAlertEmbed ─────────────────────────────

describe('formatEmailAlertEmbed', () => {
  it('formats bounce with amber color and correct action', () => {
    const embed = formatEmailAlertEmbed({
      event: 'bounce',
      email: 'bounced@test.com',
      resendId: 'res_123',
    });

    expect(embed.title).toContain('Email Bounced');
    expect(embed.color).toBe(COLORS.amber);
    expect(embed.fields!.find(f => f.name === 'Email')?.value).toBe('bounced@test.com');
    expect(embed.fields!.find(f => f.name === 'Resend ID')?.value).toBe('res_123');
    expect(embed.fields!.find(f => f.name === 'Action taken')?.value).toContain('Pending emails cancelled');
    expect(embed.fields!.find(f => f.name === 'Action taken')?.value).not.toContain('unsubscribed');
    expect(embed.footer?.text).toBe('Resend webhook');
  });

  it('formats complaint with red color and unsubscribe action', () => {
    const embed = formatEmailAlertEmbed({
      event: 'complaint',
      email: 'spam@test.com',
      resendId: 'res_456',
    });

    expect(embed.title).toContain('Spam Complaint');
    expect(embed.color).toBe(COLORS.red);
    expect(embed.fields!.find(f => f.name === 'Action taken')?.value).toContain('unsubscribed');
  });

  it('includes userId field when provided', () => {
    const embed = formatEmailAlertEmbed({
      event: 'bounce',
      email: 'user@test.com',
      resendId: 'res_789',
      userId: 'user-uuid-123',
    });

    expect(embed.fields!.find(f => f.name === 'User ID')?.value).toBe('user-uuid-123');
  });

  it('omits userId field when not provided', () => {
    const embed = formatEmailAlertEmbed({
      event: 'bounce',
      email: 'user@test.com',
      resendId: 'res_000',
    });

    expect(embed.fields!.find(f => f.name === 'User ID')).toBeUndefined();
  });
});

// ── Tests: formatBroadcastEmbed ──────────────────────────────

describe('formatBroadcastEmbed', () => {
  it('formats successful broadcast with green color', () => {
    const embed = formatBroadcastEmbed({
      templateId: 'welcome_v2',
      sent: 45,
      skipped: 5,
      errors: 0,
      totalOptedIn: 50,
    });

    expect(embed.title).toContain('Broadcast Sent');
    expect(embed.title).not.toContain('errors');
    expect(embed.color).toBe(COLORS.green);
    expect(embed.fields!.find(f => f.name === 'Template')?.value).toBe('welcome_v2');
    expect(embed.fields!.find(f => f.name === 'Sent')?.value).toBe('45');
    expect(embed.fields!.find(f => f.name === 'Skipped')?.value).toBe('5');
    expect(embed.fields!.find(f => f.name === 'Errors')?.value).toBe('0');
    expect(embed.footer?.text).toBe('Admin broadcast');
  });

  it('formats broadcast with errors using amber color', () => {
    const embed = formatBroadcastEmbed({
      templateId: 'promo',
      sent: 40,
      skipped: 3,
      errors: 7,
      totalOptedIn: 50,
    });

    expect(embed.title).toContain('with errors');
    expect(embed.color).toBe(COLORS.amber);
    expect(embed.fields!.find(f => f.name === 'Errors')?.value).toBe('7');
  });
});

// ── Tests: formatGrowthEmbed ─────────────────────────────────

describe('formatGrowthEmbed', () => {
  it('formats data contribution event', () => {
    const embed = formatGrowthEmbed({
      event: 'data_contribution',
      nightCount: 30,
      hasOximetry: true,
      deviceModel: 'AirSense 11',
    });

    expect(embed.title).toContain('Research Data Contribution');
    expect(embed.color).toBe(COLORS.green);
    expect(embed.fields!.find(f => f.name === 'Nights')?.value).toBe('30');
    expect(embed.fields!.find(f => f.name === 'Oximetry')?.value).toBe('Yes');
    expect(embed.fields!.find(f => f.name === 'Device')?.value).toBe('AirSense 11');
  });

  it('formats new signup event', () => {
    const embed = formatGrowthEmbed({
      event: 'new_signup',
      email: 'new@user.com',
    });

    expect(embed.title).toContain('New User Signup');
    expect(embed.fields!.find(f => f.name === 'Email')?.value).toBe('new@user.com');
  });

  it('shows No for hasOximetry false', () => {
    const embed = formatGrowthEmbed({
      event: 'data_contribution',
      hasOximetry: false,
    });

    expect(embed.fields!.find(f => f.name === 'Oximetry')?.value).toBe('No');
  });

  it('omits optional fields when not provided', () => {
    const embed = formatGrowthEmbed({ event: 'new_signup' });
    expect(embed.fields!.length).toBe(0);
  });

  it('includes timestamp in ISO format', () => {
    const embed = formatGrowthEmbed({ event: 'new_signup' });
    expect(embed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── Tests: COLORS constants ──────────────────────────────────

describe('COLORS', () => {
  it('exports all expected color constants', () => {
    expect(COLORS.green).toBe(0x10b981);
    expect(COLORS.amber).toBe(0xf59e0b);
    expect(COLORS.red).toBe(0xef4444);
    expect(COLORS.blue).toBe(0x3b82f6);
    expect(COLORS.purple).toBe(0x8b5cf6);
    expect(COLORS.teal).toBe(0x14b8a6);
  });
});
