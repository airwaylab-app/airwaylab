/**
 * Tests for the db-integrity-check cron route (AIR-1880).
 *
 * Coverage focus:
 *   - buildIntegrityEmbed: color/title logic for clean, orphan, and info states
 *   - field ordering and label accuracy
 *   - embed footer and timestamp presence
 */
import { describe, it, expect } from 'vitest';
import { buildIntegrityEmbed, type IntegrityCheckResult } from '@/lib/db-integrity-check';
import { COLORS } from '@/lib/discord-webhook';

// ── Helpers ─────────────────────────────────────────────────────────────────

function clean(): IntegrityCheckResult {
  return {
    subscriptions_orphans: 0,
    user_nights_orphans: 0,
    email_sequences_orphans: 0,
    profiles_stripe_no_sub: 0,
    profiles_paid_no_active_sub: 0,
  };
}

// ── buildIntegrityEmbed ──────────────────────────────────────────────────────

describe('buildIntegrityEmbed', () => {
  it('uses COLORS.green when all counts are zero', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.color).toBe(COLORS.green);
  });

  it('uses COLORS.red when subscriptions_orphans > 0', () => {
    const embed = buildIntegrityEmbed({ ...clean(), subscriptions_orphans: 3 });
    expect(embed.color).toBe(COLORS.red);
  });

  it('uses COLORS.red when user_nights_orphans > 0', () => {
    const embed = buildIntegrityEmbed({ ...clean(), user_nights_orphans: 1 });
    expect(embed.color).toBe(COLORS.red);
  });

  it('uses COLORS.red when email_sequences_orphans > 0', () => {
    const embed = buildIntegrityEmbed({ ...clean(), email_sequences_orphans: 2 });
    expect(embed.color).toBe(COLORS.red);
  });

  it('uses COLORS.red when profiles_paid_no_active_sub > 0', () => {
    const embed = buildIntegrityEmbed({ ...clean(), profiles_paid_no_active_sub: 1 });
    expect(embed.color).toBe(COLORS.red);
  });

  it('uses COLORS.green when only profiles_stripe_no_sub is non-zero (informational)', () => {
    const embed = buildIntegrityEmbed({ ...clean(), profiles_stripe_no_sub: 15 });
    expect(embed.color).toBe(COLORS.green);
  });

  it('title says "All Clean" when all counts are zero', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.title).toContain('All Clean');
  });

  it('title says "Orphans Detected" when any critical count is non-zero', () => {
    const embed = buildIntegrityEmbed({ ...clean(), user_nights_orphans: 5 });
    expect(embed.title).toContain('Orphans Detected');
  });

  it('includes exactly 5 fields — one per check', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.fields).toHaveLength(5);
  });

  it('field values are stringified counts', () => {
    const result: IntegrityCheckResult = {
      subscriptions_orphans: 3,
      user_nights_orphans: 7,
      email_sequences_orphans: 0,
      profiles_stripe_no_sub: 42,
      profiles_paid_no_active_sub: 1,
    };
    const embed = buildIntegrityEmbed(result);
    const values = embed.fields!.map((f) => f.value);
    expect(values).toContain('3');
    expect(values).toContain('7');
    expect(values).toContain('42');
    expect(values).toContain('1');
  });

  it('all fields have inline: true', () => {
    const embed = buildIntegrityEmbed(clean());
    for (const field of embed.fields!) {
      expect(field.inline).toBe(true);
    }
  });

  it('footer text identifies the cron', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.footer?.text).toBe('db-integrity-check cron');
  });

  it('includes a valid ISO timestamp', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.timestamp).toBeDefined();
    expect(() => new Date(embed.timestamp!)).not.toThrow();
    expect(new Date(embed.timestamp!).getTime()).not.toBeNaN();
  });

  it('red title includes "rotating_light" emoji', () => {
    const embed = buildIntegrityEmbed({ ...clean(), subscriptions_orphans: 1 });
    expect(embed.title).toContain(':rotating_light:');
  });

  it('green title includes "white_check_mark" emoji', () => {
    const embed = buildIntegrityEmbed(clean());
    expect(embed.title).toContain(':white_check_mark:');
  });

  it('field names include query reference numbers (1.1, 1.2, 1.4, 1.12a, 1.12b)', () => {
    const embed = buildIntegrityEmbed(clean());
    const names = embed.fields!.map((f) => f.name);
    expect(names.some((n) => n.includes('1.1'))).toBe(true);
    expect(names.some((n) => n.includes('1.2'))).toBe(true);
    expect(names.some((n) => n.includes('1.4'))).toBe(true);
    expect(names.some((n) => n.includes('1.12a'))).toBe(true);
    expect(names.some((n) => n.includes('1.12b'))).toBe(true);
  });
});
