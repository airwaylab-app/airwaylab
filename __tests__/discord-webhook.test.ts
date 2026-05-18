/**
 * Tests for lib/discord-webhook.ts
 *
 * Coverage focus:
 *  - sendAlert: fail-open guarantee (never throws), missing URL → false,
 *    HTTP error → false, success → true, Sentry called on fetch failure
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
  COLORS,
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

  it('calls Sentry.captureException when fetch throws', async () => {
    process.env.DISCORD_OPS_WEBHOOK_URL = WEBHOOK_URL;
    const err = new Error('timeout');
    vi.spyOn(global, 'fetch').mockRejectedValue(err);
    await sendAlert('ops', 'hello');
    expect(Sentry.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ tags: expect.objectContaining({ action: 'discord-webhook', channel: 'ops' }) })
    );
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
});
