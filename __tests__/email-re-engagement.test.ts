import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for the re-engagement email sequence:
 * - scheduleReEngagementSequences trigger logic
 * - suppressReEngagement / clearReEngagementSuppression
 * - Template subjects and personalisation
 */

// ── scheduleReEngagementSequences ────────────────────────────

describe('scheduleReEngagementSequences', () => {
  it('schedules sequences for eligible users', async () => {
    const { scheduleReEngagementSequences } = await import('@/lib/email/sequences');

    const insertedRows: unknown[] = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            upsert: vi.fn().mockImplementation((rows: unknown[]) => {
              insertedRows.push(...rows);
              return { select: vi.fn(), eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        // profiles table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{ id: 'user-a' }, { id: 'user-b' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await scheduleReEngagementSequences(mockSupabase as any);
    expect(count).toBe(2);
  });

  it('skips users who already have a re_engagement sequence', async () => {
    const { scheduleReEngagementSequences } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: 'user-existing' }],
                error: null,
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        // profiles table — simulate the exclusion working (returns no candidates)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    not: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await scheduleReEngagementSequences(mockSupabase as any);
    expect(count).toBe(0);
  });

  it('skips suppressed users (re_engagement_suppressed_at is set)', async () => {
    // Suppression is enforced by the Supabase query filter (.is('re_engagement_suppressed_at', null))
    // We simulate the DB returning zero results for suppressed users.
    const { scheduleReEngagementSequences } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  // .is('re_engagement_suppressed_at', null) returns no candidates
                  is: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await scheduleReEngagementSequences(mockSupabase as any);
    expect(count).toBe(0);
  });

  it('skips users with null last_analysis_at', async () => {
    // Users who never uploaded are excluded by the .not('last_analysis_at', 'is', null) filter.
    // We simulate the DB excluding them (returns zero candidates).
    const { scheduleReEngagementSequences } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = await scheduleReEngagementSequences(mockSupabase as any);
    expect(count).toBe(0);
  });
});

// ── suppressReEngagement ─────────────────────────────────────

describe('suppressReEngagement', () => {
  it('sets re_engagement_suppressed_at on the profile', async () => {
    const { suppressReEngagement } = await import('@/lib/email/sequences');

    const updateArg: Record<string, unknown>[] = [];
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockImplementation((patch: Record<string, unknown>) => {
      updateArg.push(patch);
      return { eq: eqMock };
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateMock }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await suppressReEngagement(mockSupabase as any, 'user-123');

    expect(updateMock).toHaveBeenCalledOnce();
    const patch = updateArg[0] ?? {};
    expect(patch).toHaveProperty('re_engagement_suppressed_at');
    expect(typeof patch['re_engagement_suppressed_at']).toBe('string');
    expect(eqMock).toHaveBeenCalledWith('id', 'user-123');
  });
});

// ── clearReEngagementSuppression ─────────────────────────────

describe('clearReEngagementSuppression', () => {
  it('sets re_engagement_suppressed_at to null on the profile', async () => {
    const { clearReEngagementSuppression } = await import('@/lib/email/sequences');

    const updateArg: Record<string, unknown>[] = [];
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockImplementation((patch: Record<string, unknown>) => {
      updateArg.push(patch);
      return { eq: eqMock };
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateMock }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await clearReEngagementSuppression(mockSupabase as any, 'user-456');

    expect(updateMock).toHaveBeenCalledOnce();
    const patch = updateArg[0] ?? {};
    expect(patch).toHaveProperty('re_engagement_suppressed_at', null);
    expect(eqMock).toHaveBeenCalledWith('id', 'user-456');
  });
});

// ── Template subjects ─────────────────────────────────────────

describe('re-engagement template subjects', () => {
  const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test';

  it('step 1 subject includes the last upload date', async () => {
    const { reEngagementStep1 } = await import('@/lib/email/templates');
    const { subject } = reEngagementStep1(UNSUB_URL, 'Alice', '6 April 2026');
    expect(subject).toContain('6 April 2026');
    expect(subject).toContain('still here');
  });

  it('step 2 subject is fixed (no personalization)', async () => {
    const { reEngagementStep2 } = await import('@/lib/email/templates');
    const { subject } = reEngagementStep2(UNSUB_URL, 'Alice', '6 April 2026');
    expect(subject).toBe('What consistent CPAP tracking looks like (from people doing it)');
  });

  it('step 3 subject includes first name when provided', async () => {
    const { reEngagementStep3 } = await import('@/lib/email/templates');
    const { subject } = reEngagementStep3(UNSUB_URL, 'Alice', null);
    expect(subject).toBe('One last note, Alice');
  });

  it('step 3 subject omits name when not provided', async () => {
    const { reEngagementStep3 } = await import('@/lib/email/templates');
    const { subject } = reEngagementStep3(UNSUB_URL, null, null);
    expect(subject).toBe('One last note');
  });
});

// ── Template personalisation ──────────────────────────────────

describe('re-engagement template personalisation', () => {
  const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test';

  it('step 1 includes greeting when firstName is provided', async () => {
    const { reEngagementStep1 } = await import('@/lib/email/templates');
    const { html } = reEngagementStep1(UNSUB_URL, 'Sam', '6 April 2026');
    expect(html).toContain('Hey Sam,');
  });

  it('step 1 omits Hey line when firstName is null', async () => {
    const { reEngagementStep1 } = await import('@/lib/email/templates');
    const { html } = reEngagementStep1(UNSUB_URL, null, '6 April 2026');
    expect(html).not.toContain('Hey ,');
    expect(html).not.toMatch(/Hey\s*,/);
  });

  it('step 1 handles missing lastUploadDate gracefully', async () => {
    const { reEngagementStep1 } = await import('@/lib/email/templates');
    // Should not throw; subject and html should still be strings
    const { subject, html } = reEngagementStep1(UNSUB_URL, 'Sam', null);
    expect(typeof subject).toBe('string');
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('step 1 subject has no double-space when lastUploadDate is null', async () => {
    const { reEngagementStep1 } = await import('@/lib/email/templates');
    const { subject } = reEngagementStep1(UNSUB_URL, 'Sam', null);
    expect(subject).toBe('Your CPAP data is still here');
    expect(subject).not.toContain('  ');
  });

  it('step 2 handles missing lastUploadDate gracefully', async () => {
    const { reEngagementStep2 } = await import('@/lib/email/templates');
    const { subject, html } = reEngagementStep2(UNSUB_URL, null, null);
    expect(typeof subject).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).not.toMatch(/Hey\s*,/);
  });

  it('all three steps produce valid HTML with unsubscribe link', async () => {
    const { reEngagementStep1, reEngagementStep2, reEngagementStep3 } = await import('@/lib/email/templates');
    for (const fn of [reEngagementStep1, reEngagementStep2, reEngagementStep3]) {
      const { html } = fn(UNSUB_URL, 'Test', '1 January 2026');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(UNSUB_URL);
      expect(html).toContain('Unsubscribe');
      expect(html).toContain('utm_source=email');
    }
  });
});

// ── SEQUENCES registry entry ──────────────────────────────────

describe('SEQUENCES re_engagement config', () => {
  it('has 3 steps with delays [0, 7, 16]', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    expect(SEQUENCES.re_engagement.totalSteps).toBe(3);
    expect(SEQUENCES.re_engagement.delays).toEqual([0, 7, 16]);
  });

  it('getTemplate returns valid output for all 3 steps with data', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test';
    const data = { first_name: 'Alice', last_upload_date: '6 April 2026' };
    for (let step = 1; step <= 3; step++) {
      const result = SEQUENCES.re_engagement.getTemplate(step, UNSUB_URL, data);
      expect(result).not.toBeNull();
      expect(result!.subject.length).toBeGreaterThan(0);
      expect(result!.html).toContain('<!DOCTYPE html>');
    }
  });

  it('getTemplate returns null for out-of-range steps', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test';
    expect(SEQUENCES.re_engagement.getTemplate(0, UNSUB_URL)).toBeNull();
    expect(SEQUENCES.re_engagement.getTemplate(4, UNSUB_URL)).toBeNull();
  });
});
