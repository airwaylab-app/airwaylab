/**
 * Tests for abandoned-checkout email template, scheduling function, and consent guards.
 *
 * AIR-932 mandate: every route that reads user contact data must have a test
 * asserting the consent filter (email_opt_in) is present.
 */

import { describe, it, expect, vi } from 'vitest';
import { abandonedCheckoutStep1, SEQUENCES } from '@/lib/email/templates';
import { scheduleAbandonedCheckoutSequence } from '@/lib/email/sequences';

const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test-token';

// ── Template tests ───────────────────────────────────────────

describe('abandonedCheckoutStep1 template', () => {
  it('returns a subject and valid HTML', () => {
    const { subject, html } = abandonedCheckoutStep1(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('AirwayLab');
  });

  it('subject line contains no em-dash', () => {
    const { subject } = abandonedCheckoutStep1(UNSUB_URL);
    expect(subject).not.toContain('—');
    expect(subject).not.toContain('&mdash;');
  });

  it('includes unsubscribe link', () => {
    const { html } = abandonedCheckoutStep1(UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
  });

  it('CTA link points to pricing page with recovery attribution', () => {
    const { html } = abandonedCheckoutStep1(UNSUB_URL);
    expect(html).toContain('/pricing?source=abandoned_checkout_recovery');
  });

  it('includes medical disclaimer (MDR / reEngagementLayout footer)', () => {
    const { html } = abandonedCheckoutStep1(UNSUB_URL);
    expect(html.toLowerCase()).toContain('not a medical device');
    expect(html.toLowerCase()).toContain('clinician');
  });

  it('does not use MDR-violating language', () => {
    const { subject, html } = abandonedCheckoutStep1(UNSUB_URL);
    const combined = subject + html;
    expect(combined.toLowerCase()).not.toContain('suggests');
    expect(combined.toLowerCase()).not.toContain('indicates');
    expect(combined.toLowerCase()).not.toContain('effective');
    expect(combined.toLowerCase()).not.toContain('obstruction');
    expect(combined.toLowerCase()).not.toContain('diagnosis');
    expect(combined.toLowerCase()).not.toContain('consider adjusting');
    expect(combined.toLowerCase()).not.toContain('improve your');
  });
});

// ── SEQUENCES registry ───────────────────────────────────────

describe('SEQUENCES registry: abandoned_checkout', () => {
  it('is registered with totalSteps = 1', () => {
    expect(SEQUENCES.abandoned_checkout).toBeDefined();
    expect(SEQUENCES.abandoned_checkout.totalSteps).toBe(1);
  });

  it('has a 1-day delay (24h after checkout.session.expired)', () => {
    expect(SEQUENCES.abandoned_checkout.delays).toEqual([1]);
  });

  it('returns template for step 1', () => {
    const tpl = SEQUENCES.abandoned_checkout.getTemplate(1, UNSUB_URL);
    expect(tpl).not.toBeNull();
    expect(tpl?.subject).toBeTruthy();
    expect(tpl?.html).toContain('<!DOCTYPE html>');
  });

  it('returns null for any other step', () => {
    expect(SEQUENCES.abandoned_checkout.getTemplate(0, UNSUB_URL)).toBeNull();
    expect(SEQUENCES.abandoned_checkout.getTemplate(2, UNSUB_URL)).toBeNull();
  });
});

// ── scheduleAbandonedCheckoutSequence: consent + safety guards (AIR-932) ──────

type ProfileData = { email_opt_in: boolean; tier: string };

function makeSupabase(
  profile: ProfileData | null,
  existingRows: { id: string }[] = [],
) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: profile, error: null }),
            }),
          }),
        };
      }
      if (table === 'email_sequences') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: existingRows, error: null }),
            }),
          }),
          upsert: upsertMock,
        };
      }
      return { upsert: upsertMock };
    }),
    _upsertMock: upsertMock,
  };
}

describe('scheduleAbandonedCheckoutSequence — consent filter (AIR-932)', () => {
  it('reads email_opt_in from profiles table before scheduling', async () => {
    const supabase = makeSupabase({ email_opt_in: true, tier: 'community' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('does NOT schedule if email_opt_in = false', async () => {
    const supabase = makeSupabase({ email_opt_in: false, tier: 'community' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule if user is already a supporter', async () => {
    const supabase = makeSupabase({ email_opt_in: true, tier: 'supporter' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule if user is already a champion', async () => {
    const supabase = makeSupabase({ email_opt_in: true, tier: 'champion' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule if a pending or sent row already exists', async () => {
    const supabase = makeSupabase(
      { email_opt_in: true, tier: 'community' },
      [{ id: 'existing-row-id' }],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('does NOT schedule if profile is null (user not found)', async () => {
    const supabase = makeSupabase(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('schedules when opted-in, community tier, and no prior row', async () => {
    const supabase = makeSupabase({ email_opt_in: true, tier: 'community' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleAbandonedCheckoutSequence(supabase as any, 'user-123');
    expect(supabase._upsertMock).toHaveBeenCalled();
  });
});
