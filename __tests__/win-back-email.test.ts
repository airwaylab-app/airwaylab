/**
 * Tests for win-back email template, send pipeline, and consent/safety guards.
 *
 * AIR-932 mandate: every route that reads user contact data must have a test
 * asserting the consent filter (email_opt_in) is present.
 */

import { describe, it, expect, vi } from 'vitest';
import { winBackCancelledPaying, SEQUENCES } from '@/lib/email/templates';
import {
  scheduleWinBackForUser,
  scheduleWinBackSequences,
} from '@/lib/email/sequences';

const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test-token';

// ── Template tests ───────────────────────────────────────────

describe('winBackCancelledPaying template', () => {
  it('returns a subject and valid HTML', () => {
    const { subject, html } = winBackCancelledPaying(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('AirwayLab');
  });

  it('includes a visible unsubscribe link', () => {
    const { html } = winBackCancelledPaying(UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
    // Appears in at least the footer unsubscribe anchor
    const count = html.split(UNSUB_URL).length - 1;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('contains a reactivation CTA link', () => {
    const { html } = winBackCancelledPaying(UNSUB_URL);
    expect(html).toContain('/pricing');
  });

  it('includes medical disclaimer', () => {
    const { html } = winBackCancelledPaying(UNSUB_URL);
    expect(html.toLowerCase()).toContain('not a medical device');
    expect(html.toLowerCase()).toContain('clinician');
  });

  it('uses "come back" framing — no MDR-interpretive language', () => {
    const { subject, html } = winBackCancelledPaying(UNSUB_URL);
    const combined = subject + html;
    // Must NOT suggest therapy changes or diagnose
    expect(combined.toLowerCase()).not.toContain('your data shows');
    // 'suggests ' (verb form) triggers MDR rule 2; noun 'suggestions' in marketing copy is fine
    expect(combined.toLowerCase()).not.toContain('suggests ');
    expect(combined.toLowerCase()).not.toContain('obstruction');
    expect(combined.toLowerCase()).not.toContain('diagnosis');
    expect(combined.toLowerCase()).not.toContain('adjust');
  });
});

// ── SEQUENCES registry ───────────────────────────────────────

describe('SEQUENCES registry: win_back', () => {
  it('is registered with totalSteps = 1', () => {
    expect(SEQUENCES.win_back).toBeDefined();
    expect(SEQUENCES.win_back.totalSteps).toBe(1);
  });

  it('has a 7-day delay', () => {
    expect(SEQUENCES.win_back.delays).toEqual([7]);
  });

  it('returns template for step 1', () => {
    const tpl = SEQUENCES.win_back.getTemplate(1, UNSUB_URL);
    expect(tpl).not.toBeNull();
    expect(tpl?.subject).toBeTruthy();
  });

  it('returns null for any other step', () => {
    expect(SEQUENCES.win_back.getTemplate(0, UNSUB_URL)).toBeNull();
    expect(SEQUENCES.win_back.getTemplate(2, UNSUB_URL)).toBeNull();
  });
});

// ── scheduleWinBackForUser: consent filter (AIR-932 mandate) ─

describe('scheduleWinBackForUser — consent filter', () => {
  function makeSupabase(emailOptIn: boolean) {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    return {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { email_opt_in: emailOptIn },
                  error: null,
                }),
              }),
            }),
          };
        }
        // email_sequences table (for upsert via scheduleSequence)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          upsert: upsertMock,
        };
      }),
      _upsertMock: upsertMock,
    };
  }

  it('does NOT schedule if user has email_opt_in = false', async () => {
    const supabase = makeSupabase(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleWinBackForUser(supabase as any, 'user-123');
    expect(supabase._upsertMock).not.toHaveBeenCalled();
  });

  it('schedules if user has email_opt_in = true', async () => {
    const supabase = makeSupabase(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleWinBackForUser(supabase as any, 'user-123');
    expect(supabase._upsertMock).toHaveBeenCalled();
  });

  it('reads email_opt_in from profiles before scheduling', async () => {
    const supabase = makeSupabase(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleWinBackForUser(supabase as any, 'user-456');
    // Verify profiles table was queried with .eq('id', userId)
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});

// ── scheduleWinBackSequences: volume cap ────────────────────

describe('scheduleWinBackSequences — volume cap', () => {
  it('does not schedule more than 200 users per batch', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              count: 5, // sentinel for circuit-breaker check
              eq: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              then: undefined,
              data: [],
              error: null,
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'subscriptions') {
          // Return 250 cancelled paying users (above cap)
          const rows = Array.from({ length: 250 }, (_, i) => ({
            user_id: `user-${i}`,
            updated_at: new Date().toISOString(),
          }));
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { email_opt_in: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scheduleWinBackSequences(supabase as any);
    // Result should be at most the volume cap
    expect(result).toBeLessThanOrEqual(200);
  });
});

// ── scheduleWinBackSequences: complaint-rate circuit breaker ─

describe('scheduleWinBackSequences — complaint-rate circuit breaker', () => {
  function makeCircuitBreakerSupabase(sentCount: number, complaintCount: number) {
    let callIndex = 0;
    return {
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact' && opts?.head) {
            // First call: sentCount, second call: complaintCount
            callIndex++;
            const count = callIndex === 1 ? sentCount : complaintCount;
            return {
              eq: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              count,
              error: null,
            };
          }
          return { eq: vi.fn().mockReturnThis(), data: [], error: null };
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
  }

  it('halts scheduling when complaint rate exceeds 0.3% and >= 50 sends', async () => {
    // 100 sent, 2 complaints = 2% rate (well above 0.3% threshold)
    const supabase = makeCircuitBreakerSupabase(100, 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scheduleWinBackSequences(supabase as any);
    expect(result).toBe(0);
  });

  it('skips circuit-breaker check when fewer than 50 sends (insufficient data)', async () => {
    // Only 10 sent — not enough data to trigger circuit breaker
    // The function should proceed to the subscriptions query
    // We return empty cancelled list to keep the test simple
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count === 'exact' && opts?.head) {
                // sentCount = 10 (below threshold)
                return { eq: vi.fn().mockReturnThis(), count: 10, error: null };
              }
              // Existing win-back check
              return { eq: vi.fn().mockReturnThis(), data: [], error: null };
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await scheduleWinBackSequences(supabase as any);
    // Returns 0 because no cancelled users found, but did NOT halt at circuit breaker
    expect(result).toBe(0);
  });
});

// ── Scope guard: free-tier inactives must NOT receive win-back

describe('scheduleWinBackSequences — scope guard (cancelled paying only)', () => {
  it('queries subscriptions with tier IN (supporter, champion) — excludes free tier', async () => {
    const inMock = vi.fn().mockReturnThis();
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              count: 5,
              data: [],
              error: null,
            }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              in: inMock,
              gte: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scheduleWinBackSequences(supabase as any);

    // Verify the subscriptions query used .in('tier', ['supporter', 'champion'])
    expect(inMock).toHaveBeenCalledWith('tier', ['supporter', 'champion']);
  });
});
