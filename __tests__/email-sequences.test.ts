import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  scheduleSequence,
  cancelAllPending,
  cancelSequence,
  getPendingEmails,
  markSent,
  scheduleDormancySequences,
  scheduleActivationSequences,
  applySunsetPolicy,
} from '@/lib/email/sequences';
import { SEQUENCES } from '@/lib/email/templates';

// ── Supabase mock builder ────────────────────────────────────

interface MockQueryResult {
  data?: unknown;
  error?: { message: string; details?: string; hint?: string } | null;
  count?: number | null;
}

function createMockSupabase(overrides: {
  upsertResult?: MockQueryResult;
  updateResult?: MockQueryResult;
  selectResult?: MockQueryResult;
  /** Separate results for chained selects (call order) */
  selectResults?: MockQueryResult[];
} = {}) {
  let selectCallIndex = 0;

  let chainable: any;
  chainable = {
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      if (overrides.selectResults) {
        const result = overrides.selectResults[selectCallIndex] ?? { data: [], error: null };
        selectCallIndex++;
        return Promise.resolve(result);
      }
      return Promise.resolve(overrides.selectResult ?? { data: [], error: null });
    }),
    select: vi.fn().mockImplementation(() => {
      // Return chainable for further chaining; terminal calls (limit, then) resolve
      return chainable as never;
    }),
    upsert: vi.fn().mockResolvedValue(overrides.upsertResult ?? { error: null }),
    update: vi.fn().mockReturnValue(chainable as never),
  };

  // Make eq/lte/lt/is/not resolve to the select result when they are terminal
  const resolveSelect = () => {
    if (overrides.selectResults) {
      const result = overrides.selectResults[selectCallIndex] ?? { data: [], error: null };
      selectCallIndex++;
      return Promise.resolve(result);
    }
    return Promise.resolve(overrides.selectResult ?? { data: [], error: null });
  };

  // Override terminal methods to also be thennable (for awaited chains without .limit())
  chainable.eq.mockImplementation(() => chainable);
  chainable.lte.mockImplementation(() => chainable);
  chainable.lt.mockImplementation(() => chainable);
  chainable.is.mockImplementation(() => chainable);
  chainable.not.mockImplementation(() => chainable);

  // Make the chain itself thenable so `await supabase.from(...).select(...).eq(...)` works
  const makeThenable = (obj: typeof chainable) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).then = (resolve: (val: unknown) => void) => {
      return resolveSelect().then(resolve);
    };
    return obj;
  };

  // Each chain method should return a thenable chainable
  for (const method of ['eq', 'lte', 'lt', 'is', 'not', 'limit'] as const) {
    const original = chainable[method];
    chainable[method] = vi.fn().mockImplementation((...args: unknown[]) => {
      original(...args);
      return makeThenable({ ...chainable });
    });
  }

  // select itself returns a thenable chainable
  chainable.select.mockImplementation(() => makeThenable({ ...chainable }));
  // update returns a chainable with eq
  chainable.update.mockImplementation(() => {
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
    };
    updateChain.eq.mockImplementation(() => {
      return Promise.resolve(overrides.updateResult ?? { error: null });
    });
    // Make the first .eq return an object that also has .eq for multi-filter
    const multiEq = {
      eq: vi.fn().mockImplementation(() => {
        return Promise.resolve(overrides.updateResult ?? { error: null });
      }),
    };
    updateChain.eq.mockImplementation(() => multiEq);
    // We need 3-level eq for cancelAllPending (user_id, status)
    // Just resolve after two .eq calls
    const level3 = Promise.resolve(overrides.updateResult ?? { error: null });
    const level2 = { eq: vi.fn().mockReturnValue(level3) };
    const level1 = { eq: vi.fn().mockReturnValue(level2) };
    return level1;
  });

  // upsert stays as-is
  chainable.upsert.mockResolvedValue(overrides.upsertResult ?? { error: null });

  const supabase = {
    from: vi.fn().mockReturnValue(chainable),
  };

  return supabase as unknown as SupabaseClient;
}

// ── Tests ────────────────────────────────────────────────────

describe('email sequences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleSequence', () => {
    it('creates rows for each step in the sequence with correct delays', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      let chainable: any;
  chainable = {
        upsert: upsertSpy,
      };
      const supabase = {
        from: vi.fn().mockReturnValue(chainable),
      } as unknown as SupabaseClient;

      await scheduleSequence(supabase, 'user-123', 'post_upload');

      expect(supabase.from).toHaveBeenCalledWith('email_sequences');
      expect(upsertSpy).toHaveBeenCalledTimes(1);

      const [rows, options] = upsertSpy.mock.calls[0]!;
      expect(rows).toHaveLength(3); // post_upload has 3 steps
      expect(rows[0].user_id).toBe('user-123');
      expect(rows[0].sequence_name).toBe('post_upload');
      expect(rows[0].step).toBe(1);
      expect(rows[0].status).toBe('pending');
      expect(rows[1].step).toBe(2);
      expect(rows[2].step).toBe(3);

      // Check idempotency config
      expect(options).toEqual({
        onConflict: 'user_id,sequence_name,step',
        ignoreDuplicates: true,
      });
    });

    it('computes scheduled_at based on delay days from now', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const supabase = {
        from: vi.fn().mockReturnValue({ upsert: upsertSpy }),
      } as unknown as SupabaseClient;

      const before = Date.now();
      await scheduleSequence(supabase, 'user-123', 'dormancy');
      const after = Date.now();

      const [rows] = upsertSpy.mock.calls[0]!;
      // dormancy delays: [0, 7]
      const step1Time = new Date(rows[0].scheduled_at).getTime();
      const step2Time = new Date(rows[1].scheduled_at).getTime();

      // Step 1 delay is 0 days -- should be roughly now
      expect(step1Time).toBeGreaterThanOrEqual(before);
      expect(step1Time).toBeLessThanOrEqual(after);

      // Step 2 delay is 7 days
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(step2Time - step1Time).toBeCloseTo(sevenDaysMs, -3); // within 1s
    });

    it('does nothing for an unknown sequence name', async () => {
      const supabase = {
        from: vi.fn(),
      } as unknown as SupabaseClient;

      await scheduleSequence(supabase, 'user-123', 'nonexistent' as never);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('logs error on upsert failure without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const supabase = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      } as unknown as SupabaseClient;

      await scheduleSequence(supabase, 'user-123', 'post_upload');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule post_upload'),
        'DB error'
      );
    });

    it('creates correct number of steps for each sequence type', async () => {
      for (const [name, config] of Object.entries(SEQUENCES)) {
        const upsertSpy = vi.fn().mockResolvedValue({ error: null });
        const supabase = {
          from: vi.fn().mockReturnValue({ upsert: upsertSpy }),
        } as unknown as SupabaseClient;

        await scheduleSequence(supabase, 'user-x', name as keyof typeof SEQUENCES);

        const [rows] = upsertSpy.mock.calls[0]!;
        expect(rows).toHaveLength(config.totalSteps);
      }
    });
  });

  describe('cancelAllPending', () => {
    it('updates all pending emails for the user to cancelled', async () => {
      const eqSpy = vi.fn();
      const updateChain = {
        eq: eqSpy,
      };
      // Need two levels of .eq chaining: .eq('user_id', ...).eq('status', 'pending')
      const finalResult = Promise.resolve({ error: null });
      eqSpy.mockReturnValueOnce({ eq: vi.fn().mockReturnValue(finalResult) });

      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue(updateChain),
        }),
      } as unknown as SupabaseClient;

      await cancelAllPending(supabase, 'user-456');

      expect(supabase.from).toHaveBeenCalledWith('email_sequences');
    });

    it('logs error on update failure without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const finalResult = Promise.resolve({ error: { message: 'Update failed' } });
      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(finalResult),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await cancelAllPending(supabase, 'user-456');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cancel pending'),
        'Update failed'
      );
    });
  });

  describe('cancelSequence', () => {
    it('cancels only the specified sequence for the user', async () => {
      const finalResult = Promise.resolve({ error: null });
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(finalResult),
          }),
        }),
      });

      const supabase = {
        from: vi.fn().mockReturnValue({ update: updateSpy }),
      } as unknown as SupabaseClient;

      await cancelSequence(supabase, 'user-789', 'dormancy');

      expect(supabase.from).toHaveBeenCalledWith('email_sequences');
      expect(updateSpy).toHaveBeenCalledWith({ status: 'cancelled' });
    });
  });

  describe('getPendingEmails', () => {
    it('returns filtered list of opted-in users with emails', async () => {
      const mockData = [
        {
          id: 'email-1',
          user_id: 'user-a',
          sequence_name: 'post_upload',
          step: 1,
          ab_variant: null,
          profiles: { email: 'a@test.com', email_opt_in: true },
        },
        {
          id: 'email-2',
          user_id: 'user-b',
          sequence_name: 'dormancy',
          step: 1,
          ab_variant: 'variant-b',
          profiles: { email: 'b@test.com', email_opt_in: false }, // opted out
        },
        {
          id: 'email-3',
          user_id: 'user-c',
          sequence_name: 'activation',
          step: 2,
          ab_variant: null,
          profiles: { email: null, email_opt_in: true }, // no email
        },
      ];

      // Build a mock that resolves the chain
      const resolved = Promise.resolve({ data: mockData, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(resolved),
      };
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const result = await getPendingEmails(supabase);

      // Only user-a passes the opt-in + email filter
      expect(result).toHaveLength(1);
      expect(result[0]!.user_id).toBe('user-a');
      expect(result[0]!.email).toBe('a@test.com');
      expect(result[0]!.sequence_name).toBe('post_upload');
      expect(result[0]!.step).toBe(1);
    });

    it('returns empty array on query error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const resolved = Promise.resolve({
        data: null,
        error: { message: 'Query error', details: null, hint: null },
      });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(resolved),
      };
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const result = await getPendingEmails(supabase);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('returns empty array when data is null', async () => {
      const resolved = Promise.resolve({ data: null, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(resolved),
      };
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const result = await getPendingEmails(supabase);
      expect(result).toEqual([]);
    });

    it('limits batch size to 50', async () => {
      const resolved = Promise.resolve({ data: [], error: null });
      const limitSpy = vi.fn().mockReturnValue(resolved);
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: limitSpy,
      };
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      await getPendingEmails(supabase);
      expect(limitSpy).toHaveBeenCalledWith(50);
    });
  });

  describe('markSent', () => {
    it('updates status to sent with timestamp and resend ID', async () => {
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const supabase = {
        from: vi.fn().mockReturnValue({ update: updateSpy }),
      } as unknown as SupabaseClient;

      await markSent(supabase, 'email-abc', 'resend-xyz');

      expect(supabase.from).toHaveBeenCalledWith('email_sequences');
      const updateArg = updateSpy.mock.calls[0]![0];
      expect(updateArg.status).toBe('sent');
      expect(updateArg.sent_at).toBeDefined();
      expect(updateArg.resend_id).toBe('resend-xyz');
    });

    it('omits resend_id when not provided', async () => {
      const updateSpy = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const supabase = {
        from: vi.fn().mockReturnValue({ update: updateSpy }),
      } as unknown as SupabaseClient;

      await markSent(supabase, 'email-abc');

      const updateArg = updateSpy.mock.calls[0]![0];
      expect(updateArg.status).toBe('sent');
      expect(updateArg).not.toHaveProperty('resend_id');
    });

    it('logs error on failure without throwing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Fail' } }),
          }),
        }),
      } as unknown as SupabaseClient;

      await markSent(supabase, 'email-abc', 'resend-xyz');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to mark email-abc as sent'),
        'Fail'
      );
    });
  });

  describe('scheduleDormancySequences', () => {
    it('schedules dormancy for users inactive > 7 days without existing sequence', async () => {
      // First call: existing dormancy sequences (none)
      // Second call: dormant candidates
      // Third+ calls: scheduleSequence upserts
      const selectResults = [
        { data: [], error: null }, // existing dormancy
        { data: [{ id: 'dormant-user-1' }, { id: 'dormant-user-2' }], error: null }, // candidates
      ];
      let selectIdx = 0;

      const makeChain = () => {
        const chain = {
          select: vi.fn(),
          eq: vi.fn(),
          lt: vi.fn(),
          not: vi.fn(),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
        chain.select.mockImplementation(() => {
          const idx = selectIdx++;
          const result = selectResults[idx] ?? { data: [], error: null };
          // Return a thenable chainable
          const thenable = {
            eq: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: (fn: (val: unknown) => void) => Promise.resolve(result).then(fn),
          };
          return thenable;
        });
        return chain;
      };

      const chain = makeChain();
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await scheduleDormancySequences(supabase);
      expect(count).toBe(2);
    });

    it('excludes users who already have dormancy sequences', async () => {
      const selectResults = [
        { data: [{ user_id: 'existing-user' }], error: null }, // already have dormancy
        { data: [], error: null }, // no new candidates
      ];
      let selectIdx = 0;

      const makeChain = () => {
        const chain = {
          select: vi.fn(),
          eq: vi.fn(),
          lt: vi.fn(),
          not: vi.fn(),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
        chain.select.mockImplementation(() => {
          const idx = selectIdx++;
          const result = selectResults[idx] ?? { data: [], error: null };
          const thenable = {
            eq: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: (fn: (val: unknown) => void) => Promise.resolve(result).then(fn),
          };
          return thenable;
        });
        return chain;
      };

      const chain = makeChain();
      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await scheduleDormancySequences(supabase);
      expect(count).toBe(0);
    });

    it('returns 0 on query error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const selectResults = [
        { data: [], error: null },
        { data: null, error: { message: 'Query failed' } },
      ];
      let selectIdx = 0;

      const chain = {
        select: vi.fn().mockImplementation(() => {
          const idx = selectIdx++;
          const result = selectResults[idx] ?? { data: null, error: { message: 'err' } };
          const thenable = {
            eq: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: (fn: (val: unknown) => void) => Promise.resolve(result).then(fn),
          };
          return thenable;
        }),
        eq: vi.fn(),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await scheduleDormancySequences(supabase);
      expect(count).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('scheduleActivationSequences', () => {
    it('schedules activation for users created 48h+ ago who never uploaded', async () => {
      const selectResults = [
        { data: [], error: null }, // no existing activation sequences
        { data: [{ id: 'inactive-1' }], error: null }, // candidates
      ];
      let selectIdx = 0;

      const chain = {
        select: vi.fn().mockImplementation(() => {
          const idx = selectIdx++;
          const result = selectResults[idx] ?? { data: [], error: null };
          const thenable = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: (fn: (val: unknown) => void) => Promise.resolve(result).then(fn),
          };
          return thenable;
        }),
        eq: vi.fn(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await scheduleActivationSequences(supabase);
      expect(count).toBe(1);
    });

    it('returns 0 when no inactive users found', async () => {
      const selectResults = [
        { data: [], error: null },
        { data: [], error: null },
      ];
      let selectIdx = 0;

      const chain = {
        select: vi.fn().mockImplementation(() => {
          const idx = selectIdx++;
          const result = selectResults[idx] ?? { data: [], error: null };
          const thenable = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            then: (fn: (val: unknown) => void) => Promise.resolve(result).then(fn),
          };
          return thenable;
        }),
        eq: vi.fn(),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await scheduleActivationSequences(supabase);
      expect(count).toBe(0);
    });
  });

  describe('applySunsetPolicy', () => {
    it('opts out users with 3+ delivered-but-unclicked emails', async () => {
      // applySunsetPolicy calls supabase.from() for:
      // 1. email_sequences.select (circuit breaker click count)
      // 2. email_sequences.select (unengaged candidates)
      // 3. profiles.update (opt out each sunsetted user)
      // 4. email_sequences.update (cancelAllPending for each sunsetted user)
      let callIdx = 0;

      // Build a flexible eq chain that resolves at any depth
      function makeEqChain(): Record<string, unknown> {
        const chain: Record<string, unknown> = {
          then: (fn: (val: unknown) => void) => Promise.resolve({ error: null }).then(fn),
        };
        chain.eq = vi.fn().mockReturnValue(chain);
        return chain;
      }

      const supabase = {
        from: vi.fn().mockImplementation(() => {
          return {
            select: vi.fn().mockImplementation(() => {
              const idx = callIdx++;
              if (idx === 0) {
                // Circuit breaker: count of clicked emails
                return {
                  not: vi.fn().mockReturnValue(
                    Promise.resolve({ count: 5, error: null })
                  ),
                };
              }
              // Unengaged candidates
              return {
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue(
                      Promise.resolve({
                        data: [
                          { user_id: 'unengaged-1' },
                          { user_id: 'unengaged-1' },
                          { user_id: 'unengaged-1' }, // 3 unengaged
                          { user_id: 'engaged-2' },   // only 1
                        ],
                        error: null,
                      })
                    ),
                  }),
                }),
              };
            }),
            update: vi.fn().mockReturnValue(makeEqChain()),
          };
        }),
      } as unknown as SupabaseClient;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const count = await applySunsetPolicy(supabase);

      // unengaged-1 has 3 emails, should be sunsetted
      // engaged-2 has only 1, should NOT be sunsetted
      expect(count).toBe(1);
    });

    it('skips sunset when zero clicks are tracked (circuit breaker)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const chain = {
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue(
            Promise.resolve({ count: 0, error: null })
          ),
        }),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await applySunsetPolicy(supabase);
      expect(count).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sunset skipped: zero clicks tracked')
      );
    });

    it('does not sunset users with fewer than 3 unengaged emails', async () => {
      let callIdx = 0;
      const chain = {
        select: vi.fn().mockImplementation(() => {
          const idx = callIdx++;
          if (idx === 0) {
            return {
              not: vi.fn().mockReturnValue(
                Promise.resolve({ count: 10, error: null })
              ),
            };
          }
          if (idx === 1) {
            return {
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue(
                    Promise.resolve({
                      data: [
                        { user_id: 'user-x' },
                        { user_id: 'user-x' }, // only 2
                      ],
                      error: null,
                    })
                  ),
                }),
              }),
            };
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await applySunsetPolicy(supabase);
      expect(count).toBe(0);
    });

    it('returns 0 on query error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let callIdx = 0;
      const chain = {
        select: vi.fn().mockImplementation(() => {
          const idx = callIdx++;
          if (idx === 0) {
            return {
              not: vi.fn().mockReturnValue(
                Promise.resolve({ count: 5, error: null })
              ),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue(
                  Promise.resolve({ data: null, error: { message: 'DB fail' } })
                ),
              }),
            }),
          };
        }),
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const count = await applySunsetPolicy(supabase);
      expect(count).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
