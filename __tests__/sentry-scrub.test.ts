import { describe, it, expect } from 'vitest';
import type { Event } from '@sentry/nextjs';

import { scrubEvent } from '@/lib/sentry-scrub';

const HEX8 = /^[0-9a-f]{8}$/;

describe('scrubEvent', () => {
  it('hashes id-like keys (non-reversible, deterministic) in event.extra', () => {
    const event: Event = {
      extra: {
        userId: 'usr_12345',
        stripe_customer_id: 'cus_abc',
        subscriptionId: 'sub_xyz',
        stripe_subscription_id: 'sub_999',
        discord_id: '847362',
        dateStr: '2026-06-02',
        subject_pattern: 'patient-cohort-A',
        storagePath: 'waveforms/usr_12345/2026.parquet',
        keep: 'not-pii',
      },
    };

    scrubEvent(event);
    const extra = event.extra as Record<string, unknown>;

    for (const key of [
      'userId',
      'stripe_customer_id',
      'subscriptionId',
      'stripe_subscription_id',
      'discord_id',
      'dateStr',
      'subject_pattern',
      'storagePath',
    ]) {
      expect(extra[key], key).toMatch(HEX8);
      expect(extra[key], key).not.toContain('usr_');
    }
    // Non-PII passes through untouched.
    expect(extra.keep).toBe('not-pii');
  });

  it('drops email keys entirely', () => {
    const event: Event = {
      extra: { email: 'patient@example.com' },
      user: { id: 'u1', email: 'someone@clinic.org' },
    };

    scrubEvent(event);

    expect((event.extra as Record<string, unknown>).email).toBeUndefined();
    expect(event.user?.email).toBeUndefined();
  });

  it('hashes event.user.id set via Sentry.setUser', () => {
    const event: Event = { user: { id: 'auth-uuid-123' } };
    scrubEvent(event);
    expect(event.user?.id).toMatch(HEX8);
    expect(event.user?.id).not.toBe('auth-uuid-123');
  });

  it('scrubs keys nested anywhere in contexts and tags', () => {
    const event: Event = {
      contexts: { app: { state: { user_id: 'deep-1' } } },
      tags: { user_id: 'tag-user' },
    };

    scrubEvent(event);

    const contexts = event.contexts as { app: { state: Record<string, unknown> } };
    expect(contexts.app.state.user_id).toMatch(HEX8);
    expect((event.tags as Record<string, unknown>).user_id).toMatch(HEX8);
  });

  it('redacts email-looking substrings from the message', () => {
    const event: Event = {
      message: 'Failed to email patient@example.com about results',
    };
    scrubEvent(event);
    expect(event.message).not.toContain('patient@example.com');
    expect(event.message).toContain('[redacted-email]');
  });

  it('is deterministic and produces a stable short hash', () => {
    const a: Event = { extra: { userId: 'same' } };
    const b: Event = { extra: { userId: 'same' } };
    scrubEvent(a);
    scrubEvent(b);
    expect((a.extra as Record<string, unknown>).userId).toBe(
      (b.extra as Record<string, unknown>).userId,
    );
    // SHA-256("same") first 8 hex chars (verified against Node crypto).
    expect((a.extra as Record<string, unknown>).userId).toBe('0967115f');
  });

  it('handles cyclic structures without infinite recursion', () => {
    const cyclic: Record<string, unknown> = { userId: 'cyc' };
    cyclic.self = cyclic;
    const event: Event = { extra: cyclic };
    expect(() => scrubEvent(event)).not.toThrow();
    expect((event.extra as Record<string, unknown>).userId).toMatch(HEX8);
  });
});
